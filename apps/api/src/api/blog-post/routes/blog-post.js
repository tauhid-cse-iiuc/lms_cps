'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

/**
 * A Content Manager manages their own posts; an Admin manages everyone's. Both
 * hold identical permissions in the matrix, so the whole difference is here.
 */
module.exports = createCoreRouter('api::blog-post.blog-post', {
  config: {
    update: { policies: ['global::owns-blog-post'] },
    delete: { policies: ['global::owns-blog-post'] },
  },
});
