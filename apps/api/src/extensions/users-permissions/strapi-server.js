'use strict';

/**
 * Lets ONE account be reached two ways: with Google, and with a password.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS OVERRIDE HAS TO EXIST
 * ---------------------------------------------------------------------------
 * Stock Strapi treats "signed up with Google" and "signs in with a password" as
 * mutually exclusive, and it does so in two places that pull in opposite
 * directions:
 *
 *   1. Password login looks the account up with `where: { provider, ... }`
 *      where provider is 'local' (auth controller, callback). A row created by
 *      Google has provider 'google', so it is simply not found - the account
 *      exists, the password is right, and the answer is still "Invalid
 *      identifier or password".
 *
 *   2. Google login looks for a row matching `{ email, provider: 'google' }`
 *      and, if the email exists under a DIFFERENT provider, throws "Email is
 *      already taken." (providers service, connect).
 *
 * So flipping the row to provider 'local' when a password is set - the obvious
 * fix - trades one broken route for the other: password login starts working
 * and Google sign-in starts failing for the same account.
 *
 * The row therefore keeps provider 'google', which keeps rule 2 happy, and this
 * override relaxes rule 1: a password login may also match a non-local account
 * THAT HAS A PASSWORD. An account with no password is untouched by this and
 * still fails exactly as before, which matters - it is the case where a stolen
 * email address must not become a way in.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY NOT CHANGED
 * ---------------------------------------------------------------------------
 * Only the lookup widens. Every other check the plugin makes is repeated here
 * in the same order - password, confirmation, blocked - because this is a login
 * path, and a login path that skips a check because the code was inconvenient
 * to copy is how accounts get taken.
 *
 * The route's rate-limit middleware is untouched: only the handler is replaced,
 * and the middleware is configured on the route, so brute-force protection
 * still applies to everything below.
 */

const { errors, sanitize } = require('@strapi/utils');

const { ApplicationError, ValidationError } = errors;

/** Strips password, reset tokens and anything else marked private. */
const sanitizeUser = (strapi, user) =>
  sanitize.sanitizers.defaultSanitizeOutput(
    {
      schema: strapi.getModel('plugin::users-permissions.user'),
      getModel: strapi.getModel.bind(strapi),
    },
    user
  );

/**
 * Issues a session for a user we have just authenticated ourselves.
 *
 * Mirrors what the plugin does after a successful local login. The shape of the
 * reply is not cosmetic: the Next.js route handler reads `jwt` and
 * `refreshToken` out of the body and puts them in its own httpOnly cookies, so
 * dropping either field would sign the person in and log them straight back out
 * at the first renewal.
 */
const issueSession = async (strapi, ctx, user) => {
  const mode = strapi.config.get(
    'plugin::users-permissions.jwtManagement',
    'legacy-support'
  );

  if (mode !== 'refresh') {
    return ctx.send({
      jwt: strapi.plugin('users-permissions').service('jwt').issue({ id: user.id }),
      user: await sanitizeUser(strapi, user),
    });
  }

  const sessions = strapi.config.get('plugin::users-permissions.sessions');

  if (sessions?.httpOnly || ctx.request.header['x-strapi-refresh-cookie'] === 'httpOnly') {
    // This project configures sessions.httpOnly = false on purpose - see
    // config/plugins.js - because the refresh token has to reach the Next.js
    // server, not the browser. If that is ever flipped, this branch needs the
    // cookie-writing the plugin does, and failing loudly is better than
    // returning a reply with no refresh token in it.
    throw new ApplicationError(
      'sessions.httpOnly is enabled; the linked-account login override needs updating to set the refresh cookie.'
    );
  }

  const deviceId = ctx.request.body?.deviceId || require('crypto').randomUUID();

  const refresh = await strapi
    .sessionManager('users-permissions')
    .generateRefreshToken(String(user.id), deviceId, { type: 'refresh' });

  const access = await strapi
    .sessionManager('users-permissions')
    .generateAccessToken(refresh.token);

  if ('error' in access) {
    throw new ApplicationError('Invalid credentials');
  }

  return ctx.send({
    jwt: access.token,
    refreshToken: refresh.token,
    user: await sanitizeUser(strapi, user),
  });
};

/**
 * Plugin controllers in Strapi v5 are FACTORIES, not objects: `plugin.controllers.auth`
 * is `({ strapi }) => ({ callback, register, ... })`. Assigning to
 * `plugin.controllers.auth.callback` therefore sets a property on a function
 * nobody ever reads - the override loads without error and does nothing at all,
 * which is a much worse failure than a crash. The factory is wrapped instead,
 * and the handler it produces is what gets replaced.
 */
module.exports = (plugin) => {
  const createAuthController = plugin.controllers.auth;

  plugin.controllers.auth = (context) => {
    const { strapi } = context;
    const controller = createAuthController(context);
    const originalCallback = controller.callback.bind(controller);

    controller.callback = async (ctx) => {
      const provider = ctx.params.provider ?? 'local';
      const identifier = ctx.request.body?.identifier;

      // Anything that is not a password login - the Google callback included -
      // goes to the plugin untouched.
      if (provider !== 'local' || typeof identifier !== 'string' || !identifier) {
        return originalCallback(ctx);
      }

      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
        },
      });

      /**
       * Hand back to the plugin for every ordinary case.
       *
       * That includes "no such user" and "no password on the account", which the
       * plugin already answers with a deliberately vague message. Answering them
       * here instead would risk making this branch measurably different - a
       * different error string, or a faster reply because no hash was compared -
       * and either one turns a login form into an account-enumeration oracle.
       */
      if (!user || user.provider === 'local' || !user.password) {
        return originalCallback(ctx);
      }

      const password = ctx.request.body?.password;

      const valid =
        typeof password === 'string' &&
        (await strapi
          .plugin('users-permissions')
          .service('user')
          .validatePassword(password, user.password));

      if (!valid) {
        // Word for word what the plugin says, so the two paths are
        // indistinguishable from outside.
        throw new ValidationError('Invalid identifier or password');
      }

      const advanced = await strapi
        .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
        .get();

      if (advanced?.email_confirmation && user.confirmed !== true) {
        throw new ApplicationError('Your account email is not confirmed');
      }

      if (user.blocked === true) {
        throw new ApplicationError('Your account has been blocked by an administrator');
      }

      strapi.log.info(`[auth] password login for ${user.email}, a ${user.provider} account`);

      return issueSession(strapi, ctx, user);
    };

    return controller;
  };

  return plugin;
};
