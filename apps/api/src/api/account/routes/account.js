'use strict';

/**
 * Public by necessity: it has to answer before the caller has an account.
 * See the controller for what that costs and why it is accepted.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/account/availability',
      handler: 'account.availability',
    },

    // Both of these are about the CALLER's own account, so they are granted to
    // every signed-in role in the matrix rather than being public like the one
    // above.
    {
      method: 'GET',
      path: '/account/password-status',
      handler: 'account.passwordStatus',
    },
    {
      method: 'POST',
      path: '/account/set-password',
      handler: 'account.setPassword',
    },
    {
      method: 'PUT',
      path: '/account/profile',
      handler: 'account.updateProfile',
    },
  ],
};
