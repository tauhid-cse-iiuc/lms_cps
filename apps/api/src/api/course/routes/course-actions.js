'use strict';

/**
 * Custom course endpoints.
 *
 * Note the paths. `/my/courses` rather than `/courses/mine`, because the latter
 * collides with `/courses/:id` - a document id is a string, so "mine" is a
 * perfectly valid one and the router cannot tell them apart. The two endpoints
 * that DO hang off `/courses/:id` are safe because their extra path segment
 * makes them unambiguous.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/my/courses',
      handler: 'course.mine',
    },
    {
      method: 'GET',
      path: '/courses/:id/progress',
      handler: 'course.progress',
    },
    {
      // Clears only the caller's own completions - see the controller.
      method: 'DELETE',
      path: '/courses/:id/progress',
      handler: 'course.resetProgress',
    },
    {
      method: 'GET',
      path: '/courses/:id/students',
      handler: 'course.students',
      config: { policies: ['global::is-owner-or-manager'] },
    },
  ],
};
