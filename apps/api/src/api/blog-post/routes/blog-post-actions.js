'use strict';

/**
 * Publishing endpoints, guarded by the same ownership policy as editing: a
 * Content Manager publishes their own posts, an Admin publishes anyone's.
 */
const ownsPost = { policies: ['global::owns-blog-post'] };

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/blog-posts/:id/publish',
      handler: 'blog-post.publish',
      config: ownsPost,
    },
    {
      method: 'POST',
      path: '/blog-posts/:id/unpublish',
      handler: 'blog-post.unpublish',
      config: ownsPost,
    },
  ],
};
