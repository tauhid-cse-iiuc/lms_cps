'use strict';

/**
 * Platform administration.
 *
 * A plain controller with no content type behind it, because these endpoints
 * report ON the data rather than exposing a table of their own.
 *
 * Every route here also carries the is-admin policy. The permission matrix
 * already restricts them, so this is the second lock - on the endpoints where
 * being wrong means somebody promotes themselves.
 */

/** The four application roles, in the order a dashboard should list them. */
const ROLE_ORDER = ['admin', 'content-manager', 'instructor', 'student'];

module.exports = ({ strapi }) => ({
  /**
   * Platform statistics: users per role, plus totals.
   *
   * Counted rather than stored, for the same reason progress is - a stored
   * total is a second copy of something the rows already say, and it is wrong
   * the moment anything is created outside the one code path that maintains it.
   */
  async stats(ctx) {
    const roles = await strapi.db.query('plugin::users-permissions.role').findMany({
      where: { type: { $in: ROLE_ORDER } },
    });

    const usersByRole = {};
    for (const role of roles) {
      usersByRole[role.type] = await strapi.db
        .query('plugin::users-permissions.user')
        .count({ where: { role: role.id } });
    }

    const [totalUsers, totalCourses, totalLessons, totalEnrollments, totalAttempts, totalPosts] =
      await Promise.all([
        strapi.db.query('plugin::users-permissions.user').count(),
        strapi.db.query('api::course.course').count(),
        strapi.db.query('api::lesson.lesson').count(),
        strapi.db.query('api::enrollment.enrollment').count(),
        strapi.db.query('api::quiz-attempt.quiz-attempt').count(),
        strapi.db.query('api::blog-post.blog-post').count(),
      ]);

    return {
      data: {
        usersByRole: ROLE_ORDER.map((type) => ({ role: type, count: usersByRole[type] ?? 0 })),
        totals: {
          users: totalUsers,
          courses: totalCourses,
          lessons: totalLessons,
          enrollments: totalEnrollments,
          quizAttempts: totalAttempts,
          blogPosts: totalPosts,
        },
      },
    };
  },

  /**
   * Change a user's role.
   *
   * ---------------------------------------------------------------------------
   * THE LAST-ADMIN GUARD
   * ---------------------------------------------------------------------------
   * Demoting the only remaining Admin locks everybody out of administration
   * permanently. Nothing in the application could undo it, because the only role
   * that can change roles would no longer be held by anyone - recovery would
   * mean editing the database by hand.
   *
   * So the count is taken BEFORE the change, and the change is refused if it
   * would leave zero. Self-demotion is the common way to trigger this by
   * accident, but the guard is written in terms of the count rather than in
   * terms of "is this me", because two admins demoting each other at the same
   * time is the same failure arriving by a different route.
   */
  async setUserRole(ctx) {
    const { id } = ctx.params;
    const requested = ctx.request.body?.role ?? ctx.request.body?.data?.role;

    if (!ROLE_ORDER.includes(requested)) {
      return ctx.badRequest(
        `Role must be one of: ${ROLE_ORDER.join(', ')}.`
      );
    }

    const target = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { documentId: id },
      populate: ['role'],
    });

    if (!target) return ctx.notFound('No such user.');

    const nextRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: requested },
    });

    if (!nextRole) return ctx.badRequest('That role does not exist.');

    // Nothing to do - and importantly, not something to count as a demotion.
    if (target.role?.type === requested) {
      return { data: { id: target.documentId, role: requested, changed: false } };
    }

    if (target.role?.type === 'admin') {
      const adminCount = await strapi.db
        .query('plugin::users-permissions.user')
        .count({ where: { role: target.role.id } });

      if (adminCount <= 1) {
        return ctx.badRequest(
          'This is the only administrator. Promote someone else before changing this role.'
        );
      }
    }

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: target.id },
      data: { role: nextRole.id },
    });

    return { data: { id: target.documentId, role: requested, changed: true } };
  },

  /** Every user, with their role. For the admin user list. */
  async users(ctx) {
    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      populate: ['role'],
      orderBy: { id: 'asc' },
    });

    return {
      data: users.map((user) => ({
        documentId: user.documentId,
        username: user.username,
        email: user.email,
        confirmed: user.confirmed,
        blocked: user.blocked,
        role: user.role ? { type: user.role.type, name: user.role.name } : null,
      })),
    };
  },
});
