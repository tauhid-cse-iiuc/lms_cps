'use strict';

/**
 * enrollment controller.
 *
 * Two jobs, both about not trusting the client.
 *
 * 1. `student` is taken from the token, so nobody can enrol somebody else.
 * 2. Reads are SCOPED to what the caller is entitled to see, by replacing the
 *    client's filters rather than adding to them.
 *
 * That second point is the one worth dwelling on. A permission to call
 * GET /api/enrollments is a permission to call it for EVERY row - the matrix
 * grants per endpoint, not per row. Without the scoping below, a student could
 * send ?filters[student][id]=42 and read another student's enrolment history.
 * Merging the forced filter into the client's would not fix it either: Strapi's
 * filter syntax supports $or, so a merged filter can be widened right back open.
 * The client's filters are therefore discarded outright.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { roleOf, isManager } = require('../../../utils/authorization');
const { scopedFind } = require('../../../utils/scoped-find');
const { DEFAULT_ROLE_TYPE, PROMOTED_ROLE_TYPE } = require('../../../seed/permission-matrix');

/**
 * Promotes a Visitor to Student the first time they enrol.
 *
 * Signing up and being a learner are different things: an account that has never
 * enrolled has no business holding lesson or quiz permissions, so new accounts
 * start as Visitor and earn Student by doing the one thing that makes them one.
 *
 * Only ever promotes UP from the default role. An Instructor or an Admin
 * enrolling in a course to see what a student sees must not be quietly demoted
 * to Student - which is what a blanket "set role to student on enrol" would do,
 * and it would take their own courses away from them.
 */
const promoteOnFirstEnrolment = async (strapi, user) => {
  if (user?.role?.type !== DEFAULT_ROLE_TYPE) return false;

  const target = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: PROMOTED_ROLE_TYPE },
  });

  if (!target) {
    strapi.log.warn(
      `[enrolment] cannot promote ${user.email}: no "${PROMOTED_ROLE_TYPE}" role`
    );
    return false;
  }

  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: user.id },
    data: { role: target.id },
  });

  strapi.log.info(`[enrolment] promoted ${user.email} to ${PROMOTED_ROLE_TYPE}`);
  return true;
};

module.exports = createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  /**
   * Enrol the caller in a course. Idempotent.
   *
   * Idempotency matters here because the obvious user behaviour - double-clicking
   * a button on a slow connection - would otherwise create two enrolments, and a
   * student would appear twice in their instructor's list forever.
   *
   * There are two defences, deliberately. The check below catches the ordinary
   * case and returns the existing row. The unique `enrollmentKey` catches the
   * race the check cannot: two requests arriving close enough together that both
   * pass the check before either has written. Only the database can settle that,
   * because only the database sees both at once.
   */
  async create(ctx) {
    const user = ctx.state.user;
    const courseRef = ctx.request.body?.data?.course;
    const courseDocumentId = typeof courseRef === 'string' ? courseRef : courseRef?.documentId;

    if (!courseDocumentId) {
      return ctx.badRequest('A course is required to enrol.');
    }

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseDocumentId,
    });

    if (!course) {
      return ctx.notFound('That course does not exist.');
    }

    const existing = await strapi.db.query('api::enrollment.enrollment').findOne({
      where: { student: user.id, course: course.id },
    });

    if (existing) {
      // Already enrolled. Report success rather than a conflict - from the
      // student's point of view the desired state is the actual state, and an
      // error here would be a worse experience for no gain in correctness.
      const document = await strapi.documents('api::enrollment.enrollment').findOne({
        documentId: existing.document_id ?? existing.documentId,
        populate: ['course'],
      });
      return { data: document };
    }

    try {
      const created = await strapi.documents('api::enrollment.enrollment').create({
        data: {
          student: user.id,
          course: course.id,
          enrolledAt: new Date(),
          // The uniqueness key. `student` and `course` are relations, and Strapi
          // stores relations in separate link tables - enrollments_student_lnk
          // and enrollments_course_lnk - so a composite UNIQUE index across the
          // pair is not expressible in SQL at all. Folding both ids into one
          // scalar column gives the database something it CAN enforce.
          enrollmentKey: `${user.id}:${course.id}`,
        },
        populate: ['course'],
      });

      await promoteOnFirstEnrolment(strapi, user);

      return { data: created };
    } catch (error) {
      // The race arrived. Someone else's identical request won; treat that as
      // success, because the student is now enrolled either way.
      const raced = await strapi.db.query('api::enrollment.enrollment').findOne({
        where: { student: user.id, course: course.id },
      });
      if (raced) {
        await promoteOnFirstEnrolment(strapi, user);
        return { data: raced };
      }
      throw error;
    }
  },

  /**
   * List enrolments, scoped to the caller.
   *
   *   student     their own, and only their own
   *   instructor  those belonging to courses they own
   *   manager     everything
   */
  async find(ctx) {
    const user = ctx.state.user;
    const role = roleOf(ctx);

    if (isManager(ctx)) return super.find(ctx);

    // Built from the token, never from the client. Setting this on
    // ctx.query.filters and calling super.find() answers 400 "Invalid key
    // student" - the content API validates filters against what the caller
    // may READ, and this relation points at the user type. See scoped-find.
    const scope =
      role === 'instructor'
        ? { course: { owner: user.id } }
        : { student: user.id };

    return scopedFind(strapi, ctx, this, 'api::enrollment.enrollment', scope, { course: true, student: true });
  },

  /** Same scoping for a single row, so an id cannot be guessed into a leak. */
  async findOne(ctx) {
    const user = ctx.state.user;
    const role = roleOf(ctx);

    const result = await super.findOne(ctx);
    if (isManager(ctx)) return result;

    const enrollment = await strapi.documents('api::enrollment.enrollment').findOne({
      documentId: ctx.params.id,
      populate: { student: true, course: { populate: ['owner'] } },
    });

    if (!enrollment) return ctx.notFound();

    const permitted =
      role === 'instructor'
        ? enrollment.course?.owner?.id === user.id
        : enrollment.student?.id === user.id;

    if (!permitted) return ctx.forbidden();

    return result;
  },

  /** The caller's own enrolments, with enough course detail to render a list. */
  async mine(ctx) {
    const user = ctx.state.user;

    const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: { student: user.id },
      populate: { course: { populate: ['lessons'] } },
      sort: 'enrolledAt:desc',
    });

    return { data: enrollments };
  },
}));
