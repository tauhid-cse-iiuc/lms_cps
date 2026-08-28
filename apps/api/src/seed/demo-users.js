'use strict';

const { ROLES } = require('./permission-matrix');
const signupPolicy = require('../utils/signup-policy');

/**
 * Creates one demo account per role.
 *
 * The brief asks for demo credentials so the application can be assessed without
 * anyone having to register four accounts by hand and guess which role each one
 * needs. Creating them here rather than by hand means the same four logins exist
 * in every environment, and the credentials in the README stay true after a
 * rebuild.
 *
 * These passwords are published in the README on purpose - they are shared demo
 * accounts, not private ones. SEED_DEMO_PASSWORD overrides the default, and
 * SEED_DEMO_USERS=false skips this step entirely, which is what to reach for once
 * the accounts are no longer needed.
 */

// The .test top-level domain is reserved by RFC 2606 for exactly this. It can
// never be registered by anyone, so these addresses cannot collide with a real
// mailbox or quietly send mail to a stranger.
const DEMO_USERS = [
  { username: 'admin', email: 'admin@lms.test', roleType: 'admin' },
  { username: 'manager', email: 'manager@lms.test', roleType: 'content-manager' },
  { username: 'instructor', email: 'instructor@lms.test', roleType: 'instructor' },
  { username: 'student', email: 'student@lms.test', roleType: 'student' },
];

const DEFAULT_PASSWORD = 'Demo1234!';

module.exports = async (strapi) => {
  if (process.env.SEED_DEMO_USERS === 'false') {
    strapi.log.info('[seed] SEED_DEMO_USERS=false, skipping demo accounts');
    return { created: 0 };
  }

  const password = process.env.SEED_DEMO_PASSWORD || DEFAULT_PASSWORD;
  const knownRoleTypes = new Set(ROLES.map((role) => role.type));
  let created = 0;

  for (const demo of DEMO_USERS) {
    // Guards against a typo in the table above silently producing a user with no
    // role, which would authenticate successfully and then be able to do nothing.
    if (!knownRoleTypes.has(demo.roleType)) {
      throw new Error(
        `[seed] demo user ${demo.email} names role "${demo.roleType}", which is not in the permission matrix`
      );
    }

    const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: demo.email },
    });

    if (existing) {
      // Deliberately not updating the password of an account that already
      // exists. Resetting it on every boot would undo a password somebody
      // changed on purpose, and a redeploy is not a reason to do that. To reset
      // a demo account, delete the user and restart.
      continue;
    }

    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: demo.roleType },
    });

    // Should be unreachable - roles.js runs first - so if it happens, something
    // is wrong that a silent skip would hide.
    if (!role) {
      throw new Error(`[seed] role "${demo.roleType}" is missing; cannot create ${demo.email}`);
    }

    await signupPolicy.withoutPolicy(() =>
      // strapi.documents(), NOT strapi.db.query().
      //
      // The Document Service runs a transform over every field whose type is
      // `password` and bcrypt-hashes it (@strapi/core document-service/attributes/
      // transforms.js). The lower-level query engine does no such thing: it writes
      // exactly what it is given. Creating a user with strapi.db.query() therefore
      // stores the password as readable plaintext AND breaks login, because the
      // login route compares the submitted password against what it assumes is a
      // hash. Neither symptom points at the line that caused it.
      strapi.documents('plugin::users-permissions.user').create({
        data: {
          username: demo.username,
          email: demo.email,
          password,
          role: role.id,
          provider: 'local',
          // `confirmed` defaults to false, and Strapi rejects the login of an
          // unconfirmed user whenever the email_confirmation setting is on
          // (auth.js:173). That setting is off here, so false would work today -
          // but "works until someone changes an unrelated setting" is not the
          // same as working, so it is set explicitly.
          confirmed: true,
          blocked: false,
        },
      })
    );

    created += 1;
    strapi.log.info(`[seed] created demo user ${demo.email} (${demo.roleType})`);
  }

  if (created === 0) {
    strapi.log.info('[seed] demo accounts already present');
  } else if (password === DEFAULT_PASSWORD) {
    strapi.log.warn(
      `[seed] demo accounts use the default password "${DEFAULT_PASSWORD}" - set SEED_DEMO_PASSWORD to change it`
    );
  }

  return { created };
};
