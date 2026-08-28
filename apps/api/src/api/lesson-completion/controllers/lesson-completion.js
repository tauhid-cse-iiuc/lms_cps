'use strict';

/**
 * lesson-completion controller.
 *
 * A completion is one row saying "this student finished this lesson". Progress
 * is not stored anywhere - it is counted from these rows on demand. See the
 * long note in the course controller's `progress` handler for why.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { roleOf, isManager } = require('../../../utils/authorization');
const { scopedFind } = require('../../../utils/scoped-find');

module.exports = createCoreController(
  'api::lesson-completion.lesson-completion',
  ({ strapi }) => ({
    /**
     * Mark a lesson complete, for the caller, once.
     *
     * Three things are derived here rather than accepted:
     *
     *   student  from the token, so nobody can mark progress for someone else
     *   course   from the lesson, so it cannot disagree with the lesson
     *   the key  from both, so the database can reject a duplicate
     *
     * `course` is stored on the completion even though it is reachable through
     * the lesson. That is deliberate denormalisation: Strapi keeps relations in
     * separate link tables, so counting a student's completions within a course
     * would otherwise mean joining completions to lessons to courses on every
     * progress bar. With the course recorded directly it is one indexed count.
     * The duplicated value cannot drift, because a lesson never moves between
     * courses in this application.
     */
    async create(ctx) {
      const user = ctx.state.user;
      const lessonRef = ctx.request.body?.data?.lesson;
      const lessonDocumentId =
        typeof lessonRef === 'string' ? lessonRef : lessonRef?.documentId;

      if (!lessonDocumentId) {
        return ctx.badRequest('A lesson is required.');
      }

      const lesson = await strapi.documents('api::lesson.lesson').findOne({
        documentId: lessonDocumentId,
        populate: ['course'],
      });

      if (!lesson?.course) {
        return ctx.notFound('That lesson does not exist.');
      }

      // You may only complete lessons on a course you are enrolled in.
      // Otherwise a student could accumulate progress on material they have
      // never been given access to - harmless in isolation, but it would make
      // every progress figure in the application meaningless.
      const enrolled = await strapi.db.query('api::enrollment.enrollment').count({
        where: { student: user.id, course: lesson.course.id },
      });

      if (enrolled === 0 && roleOf(ctx) === 'student') {
        return ctx.forbidden('Enrol in this course first.');
      }

      const existing = await strapi.db
        .query('api::lesson-completion.lesson-completion')
        .findOne({ where: { student: user.id, lesson: lesson.id } });

      if (existing) {
        // Already complete. Saying so with a success is right: the student asked
        // for a state that already holds.
        return { data: existing };
      }

      try {
        const created = await strapi
          .documents('api::lesson-completion.lesson-completion')
          .create({
            data: {
              student: user.id,
              lesson: lesson.id,
              course: lesson.course.id,
              completedAt: new Date(),
              completionKey: `${user.id}:${lesson.id}`,
            },
          });

        return { data: created };
      } catch (error) {
        const raced = await strapi.db
          .query('api::lesson-completion.lesson-completion')
          .findOne({ where: { student: user.id, lesson: lesson.id } });
        if (raced) return { data: raced };
        throw error;
      }
    },

    /**
     * Un-complete a lesson.
     *
     * Deliberately restricted to the caller's own rows even for an instructor.
     * Seeing a student's progress is reasonable; editing it is not, and nothing
     * in the brief asks for it.
     */
    async delete(ctx) {
      const user = ctx.state.user;

      const completion = await strapi
        .documents('api::lesson-completion.lesson-completion')
        .findOne({ documentId: ctx.params.id, populate: ['student'] });

      if (!completion) return ctx.notFound();
      if (completion.student?.id !== user.id) return ctx.forbidden();

      return super.delete(ctx);
    },

    /** Scoped exactly like enrolments - see that controller for the reasoning. */
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

      return scopedFind(strapi, ctx, this, 'api::lesson-completion.lesson-completion', scope, { lesson: true, course: true, student: true });
    },
  })
);
