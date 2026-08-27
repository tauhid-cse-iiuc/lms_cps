'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/my/enrollments',
      handler: 'enrollment.mine',
    },
  ],
};
