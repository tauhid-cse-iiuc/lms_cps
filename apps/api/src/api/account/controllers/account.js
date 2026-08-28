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

/** Same shape Strapi enforces on usernames, stated here so we agree with it. */
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,30}$/;

module.exports = ({ strapi }) => ({
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
        const taken = await strapi.db
          .query('plugin::users-permissions.user')
          .count({ where: { username } });

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
        const taken = await strapi.db
          .query('plugin::users-permissions.user')
          .count({ where: { email } });

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
