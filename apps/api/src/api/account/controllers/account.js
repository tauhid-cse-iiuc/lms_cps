'use strict';

/**
 * Sign-up helpers that must work before anyone has an account.
 *
 * ---------------------------------------------------------------------------
 * THIS ENDPOINT LEAKS WHICH ACCOUNTS EXIST, AND THAT IS A REAL TRADE
 * ---------------------------------------------------------------------------
 * Any "is this taken?" check tells an anonymous caller whether a given address
 * is registered. That is account enumeration: someone can confirm a person uses
 * this platform, or grind a list of addresses to find which are worth attacking.
 *
 * It is offered anyway because the alternative is worse in practice. Without it,
 * people fill in a whole form, submit, and are told the name is taken - and the
 * same information leaks through that error message regardless, just more slowly
 * and after wasting their time.
 *
 * What IS done about it:
 *  - the reply is a bare boolean, never "taken by tanim@gmail.com"
 *  - Strapi's rate limiter already caps requests to this route's prefix
 *  - nothing here confirms a password, so it cannot be used to test credentials
 *
 * If enumeration matters more than the convenience, drop `email` from the query
 * and keep the username check: usernames are displayed on courses and posts
 * anyway, so they are not secret in the first place.
 */

const signupPolicy = require('../../../utils/signup-policy');
const passwordPolicy = require('../../../utils/password-policy');

/** Same shape Strapi enforces on usernames, stated here so we agree with it. */
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,30}$/;

/**
 * Reads the password state of the CALLER, never of an arbitrary account.
 *
 * `password` is a private field, so it is absent from /api/users/me no matter
 * what is populated - which is correct, and also means the frontend cannot work
 * out on its own whether an account has one. This answers that single question
 * and nothing else: a boolean about yourself.
 */
const readPasswordState = async (strapi, userId) => {
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
  });

  return {
    provider: user?.provider ?? 'local',
    // A Google account is created with no password at all. Not an empty string -
    // null - so an accidental `password: ''` would still read as "has one" and
    // send the person to the wrong form.
    hasPassword: Boolean(user?.password),
  };
};

module.exports = ({ strapi }) => ({
  /**
   * GET /api/account/password-status
   *
   * Whether the signed-in account can sign in with a password yet. Used to send
   * a first-time Google user to the "set a password" form, and to decide which
   * form the account page shows.
   */
  async passwordStatus(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    return { data: await readPasswordState(strapi, user.id) };
  },

  /**
   * POST /api/account/set-password
   *
   * Sets a FIRST password on an account that has none.
   *
   * Deliberately separate from the plugin's change-password endpoint rather
   * than a relaxation of it. change-password requires the current password and
   * verifies it; a Google account has no current password to give, so it can
   * never satisfy that check and would be stuck without this.
   *
   * The guard that keeps the two apart is the one below: this refuses the
   * moment a password exists. Without it, this endpoint would be a way to
   * overwrite the password of any account whose session token was stolen,
   * skipping the verification change-password exists to perform - a strictly
   * easier account takeover than the one the token already allows.
   */
  async setPassword(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { hasPassword } = await readPasswordState(strapi, user.id);

    if (hasPassword) {
      return ctx.badRequest(
        'This account already has a password. Change it from your account settings instead.'
      );
    }

    const password = String(ctx.request.body?.password ?? '');
    const confirmation = String(ctx.request.body?.passwordConfirmation ?? '');

    // The same rules the plugin applies to register and change-password. This
    // endpoint bypasses the plugin entirely, so without this line it would be
    // the one way into the system with weaker requirements than everywhere else.
    const problem = passwordPolicy.describeFailure(password);
    if (problem) return ctx.badRequest(problem);

    if (password !== confirmation) {
      return ctx.badRequest('The two passwords do not match.');
    }

    // Through the plugin's own user service, which hashes on the way in. A
    // direct db.query update would store the string as typed and quietly break
    // login, because the login route compares a hash against what it finds.
    await strapi.plugin('users-permissions').service('user').edit(user.id, { password });

    strapi.log.info(`[account] first password set for ${user.email}`);

    return { data: { ok: true } };
  },

  /**
   * PUT /api/account/profile
   *
   * Changes the caller's display name, and nothing else.
   *
   * Deliberately not `users-permissions.user.update`, which exists and would do
   * this in one line: that endpoint takes an id, so granting it to everyone
   * would let any account edit any other. The rule "you may edit yourself" is
   * not expressible there, because the id comes from the URL. Here there is no
   * id to send - the row is taken from the token - so the narrow thing is the
   * only thing that can happen.
   *
   * Username and email are not editable here. Both are identifiers people sign
   * in with, both have uniqueness rules, and changing them is a different piece
   * of work with its own conflict handling.
   */
  async updateProfile(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const raw = ctx.request.body?.name ?? ctx.request.body?.data?.name;

    if (typeof raw !== 'string') {
      return ctx.badRequest('A name is required.');
    }

    // Collapse runs of whitespace so "Jane   Doe" and "Jane Doe" are one name,
    // and a name of nothing but spaces is caught by the length check below.
    const name = raw.replace(/\s+/g, ' ').trim();

    if (name.length < 1) {
      return ctx.badRequest('Enter your name.');
    }

    if (name.length > 80) {
      return ctx.badRequest('That name is too long; use 80 characters or fewer.');
    }

    /**
     * `onlyIfEmpty` is what the Google sign-in flow sends.
     *
     * That flow copies the name from Google on every sign-in, not just the
     * first, because there is no cheap way to know which one it is. Without
     * this flag it would quietly undo an edit made on the account page every
     * time the person signed in with Google again - the kind of bug that looks
     * like the save button is broken.
     */
    const onlyIfEmpty = ctx.request.body?.onlyIfEmpty === true;

    if (onlyIfEmpty) {
      const current = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
      });

      if (current?.name?.trim()) {
        return { data: { name: current.name, changed: false } };
      }
    }

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { name },
    });

    return { data: { name, changed: true } };
  },

  async availability(ctx) {
    const username = String(ctx.query.username ?? '').trim();
    const email = String(ctx.query.email ?? '').trim().toLowerCase();

    const result = {};

    if (username) {
      if (!USERNAME_PATTERN.test(username)) {
        result.username = {
          valid: false,
          available: false,
          reason:
            'Use 3-30 characters: letters, numbers, dots, dashes or underscores.',
        };
      } else {
        // `$eqi` - case-insensitive equality. "Tanim" and "tanim" are the same
        // handle to a person, so treating them as two free usernames would let
        // two accounts exist that nobody can tell apart, and make signing in
        // depend on remembering how you capitalised it.
        const taken = await strapi.db
          .query('plugin::users-permissions.user')
          .count({ where: { username: { $eqi: username } } });

        result.username = {
          valid: true,
          available: taken === 0,
          reason: taken === 0 ? null : 'That username is already taken.',
        };
      }
    }

    if (email) {
      // The domain policy applies to password sign-up, which is the only route
      // this form serves - so an address it would reject is reported as invalid
      // here rather than after a submission.
      if (!signupPolicy.isAllowed(email, 'local')) {
        result.email = {
          valid: false,
          available: false,
          reason: `Password sign-up needs a ${signupPolicy.describeAllowed()} address. Sign in with Google to use another.`,
        };
      } else {
        // Lowercased on the way in already, but matched case-insensitively too:
        // an address stored before that normalisation, or written by the Google
        // provider, must still count as taken.
        const taken = await strapi.db
          .query('plugin::users-permissions.user')
          .count({ where: { email: { $eqi: email } } });

        result.email = {
          valid: true,
          available: taken === 0,
          reason: taken === 0 ? null : 'That email already has an account.',
        };
      }
    }

    return { data: result };
  },
});
