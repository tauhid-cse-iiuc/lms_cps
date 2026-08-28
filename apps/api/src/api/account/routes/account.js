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
  ],
};
