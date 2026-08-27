'use strict';

const seedRolesAndPermissions = require('./seed/roles');
const seedDemoUsers = require('./seed/demo-users');
const seedDemoContent = require('./seed/demo-content');

module.exports = {
  /**
   * Runs before the application is initialised. Nothing to extend yet.
   */
  register(/* { strapi } */) {},

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
    } catch (error) {
      strapi.log.error(
        '[seed] failed - the application would have started without working roles, so refusing to start'
      );
      throw error;
    }
  },
};
