'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

/**
 * Ownership is enforced on the writes only.
 *
 * `find` and `findOne` stay open because the catalogue is deliberately public -
 * a visitor may see that a course exists. What they may not see is its lessons,
 * and that is guarded on the lesson routes instead.
 */
module.exports = createCoreRouter('api::course.course', {
  config: {
    update: { policies: ['global::is-owner-or-manager'] },
    delete: { policies: ['global::is-owner-or-manager'] },
  },
});
