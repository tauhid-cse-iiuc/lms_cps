'use strict';

/**
 * Admin-only routes. Guarded twice: by the permission matrix, which grants these
 * actions to the Admin role alone, and by the is-admin policy on each route.
 */
const adminOnly = { policies: ['global::is-admin'] };

module.exports = {
  routes: [
    { method: 'GET', path: '/admin/stats', handler: 'admin-panel.stats', config: adminOnly },
    { method: 'GET', path: '/admin/users', handler: 'admin-panel.users', config: adminOnly },
    {
      method: 'PUT',
      path: '/admin/users/:id/role',
      handler: 'admin-panel.setUserRole',
      config: adminOnly,
    },
  ],
};
