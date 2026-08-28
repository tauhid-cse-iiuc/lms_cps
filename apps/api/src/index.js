'use strict';

const seedRolesAndPermissions = require('./seed/roles');
const seedDemoUsers = require('./seed/demo-users');
const seedDemoContent = require('./seed/demo-content');
const seedProviders = require('./seed/providers');
const signupPolicy = require('./utils/signup-policy');

module.exports = {
  /**
   * Runs before the application is initialised. Nothing to extend yet.
   */
  register({ strapi }) {
    /**
     * The sign-up domain policy, applied where users are CREATED rather than in
     * any one controller.
     *
     * Registered here, in register(), because lifecycles must be subscribed
     * before anything can create a row - by bootstrap() it would already be
     * possible to miss one.
     *
     * Every route to a new account passes through this: the password sign-up
     * form, the Google provider callback, and anything added later. A check
     * inside the register controller would have left Google wide open, because
     * that path creates its user deep inside the plugin's provider service and
     * never touches the register controller at all.
     */
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],

      beforeCreate(event) {
        if (signupPolicy.isBypassing()) return;

        const email = event.params?.data?.email;
        if (signupPolicy.isAllowed(email)) return;

        // ApplicationError surfaces as a 400 with this message rather than a
        // 500 with a stack trace, so the person signing up is told what is
        // wrong instead of being shown an internal failure.
        const { errors } = require('@strapi/utils');
        throw new errors.ApplicationError(
          `Sign-up is limited to ${signupPolicy.describeAllowed()} addresses.`
        );
      },
    });
  },

  /**
   * Runs on every startup, after Strapi has synced the database schema and after
   * every plugin has bootstrapped.
   *
   * That ordering is what makes the seed safe, and it is not an accident
   * (@strapi/core Strapi.js: runPluginsLifecycles(BOOTSTRAP) is awaited before
   * runUserLifecycles(BOOTSTRAP)). Two things have therefore already happened by
   * the time the code below runs:
   *
   *  - The users-permissions plugin has created its Public and Authenticated
   *    roles, but only if the role table was completely empty. If our seed ran
   *    first and inserted four roles, that check would find a non-empty table and
   *    skip - leaving Public without the auth.register and auth.callback
   *    permissions, so that nobody could sign up or log in, ever. Running last
   *    avoids that.
   *
   *  - The plugin has deleted every permission whose action does not match a real
   *    controller method. Anything the seed grants afterwards survives; anything
   *    it grants for an endpoint that does not exist yet would be removed on the
   *    NEXT boot, not this one, which is a confusing way to find out about a typo.
   *
   * Failures here are deliberately allowed to crash the boot. An application with
   * no roles starts perfectly happily, serves pages, and rejects every single
   * login - which looks like a mystery rather than a missing seed. Refusing to
   * start is the more honest outcome.
   */
  async bootstrap({ strapi }) {
    try {
      await seedRolesAndPermissions(strapi);
      await seedDemoUsers(strapi);
      // Runs last, and only into a platform with no courses at all. Unlike the
      // two above it does not reconcile: demo content is a starting point, not
      // infrastructure, so once someone has edited or deleted it the seeder
      // stays out of the way rather than putting it back on every restart.
      await seedDemoContent(strapi);
      await seedProviders(strapi);
    } catch (error) {
      strapi.log.error(
        '[seed] failed - the application would have started without working roles, so refusing to start'
      );
      throw error;
    }
  },
};
