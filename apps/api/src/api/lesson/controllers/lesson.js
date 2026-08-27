'use strict';

/**
 * lesson controller.
 *
 * Lessons are the actual product, so reads are scoped to people entitled to
 * them. The is-enrolled policy guards a single lesson; this scopes the list,
 * which a policy cannot do - a policy answers yes or no to the whole call, and
 * "which of these may you see" is a different question.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { roleOf, isManager } = require('../../../utils/authorization');

module.exports = createCoreController('api::lesson.lesson', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    const role = roleOf(ctx);

    if (!isManager(ctx)) {
      if (role === 'instructor') {
        ctx.query = { ...ctx.query, filters: { course: { owner: user.id } } };
      } else {
        // Students see lessons belonging to courses they are enrolled in.
        // Building the list of course ids first and filtering on it keeps this
        // to one extra query, and - more importantly - means the filter is ours
        // rather than a modification of theirs.
        const enrollments = await strapi.db
          .query('api::enrollment.enrollment')
          .findMany({ where: { student: user.id }, populate: ['course'] });

        const courseIds = enrollments
          .map((enrollment) => enrollment.course?.id)
          .filter(Boolean);

        if (courseIds.length === 0) {
          // Not enrolled in anything. Returning an empty page is right; a 403
          // would imply the request was malformed rather than simply empty.
          return { data: [], meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } } };
        }

        ctx.query = { ...ctx.query, filters: { course: { id: { $in: courseIds } } } };
      }
    }

    return super.find(ctx);
  },
}));
