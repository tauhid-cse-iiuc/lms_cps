'use strict';

/**
 * Shared helpers for the authorization policies.
 *
 * Kept out of src/policies/ deliberately: Strapi registers every file in that
 * directory as a policy, so a helpers file living there would be published as
 * `global::authorization` and could be attached to a route by mistake.
 */

/** Roles that may act on any course, not only their own. */
const MANAGER_ROLES = new Set(['admin', 'content-manager']);

/**
 * The caller's role slug, or null when nobody is signed in.
 *
 * `ctx.state.user` is populated by the users-permissions auth strategy, which
 * fetches the user WITH its role - see fetchAuthenticatedUser, which reads
 * user.role.id immediately afterwards. So this needs no extra query.
 */
const roleOf = (ctx) => ctx.state?.user?.role?.type ?? null;

const isManager = (ctx) => MANAGER_ROLES.has(roleOf(ctx));

const isAdmin = (ctx) => roleOf(ctx) === 'admin';

/**
 * Loads a course and tells you whether this caller may write to it.
 *
 * Note it compares `owner.id`, not a document id. Strapi 5 gives every entry
 * both a numeric `id` and a string `documentId`; relations resolve to the
 * numeric one, and `ctx.state.user.id` is numeric too. Comparing across the two
 * kinds silently never matches, which would deny every instructor access to
 * their own courses.
 */
const canWriteCourse = async (strapi, ctx, courseDocumentId) => {
  if (!courseDocumentId) return false;
  if (isManager(ctx)) return true;

  const course = await strapi.documents('api::course.course').findOne({
    documentId: courseDocumentId,
    populate: ['owner'],
  });

  if (!course) return false;

  return course.owner?.id === ctx.state.user?.id;
};

/** True when this user has an enrollment row for this course. */
const isEnrolledIn = async (strapi, userId, courseId) => {
  if (!userId || !courseId) return false;

  const count = await strapi.db.query('api::enrollment.enrollment').count({
    where: { student: userId, course: courseId },
  });

  return count > 0;
};

module.exports = {
  MANAGER_ROLES,
  roleOf,
  isManager,
  isAdmin,
  canWriteCourse,
  isEnrolledIn,
};
