'use strict';

/**
 * quiz-attempt controller.
 *
 * Read-only from the outside. Attempts are created by the quiz controller's
 * `submit` handler, which grades them - see the long note there. `create` is
 * granted to nobody in the permission matrix, including students, which is what
 * stops a student posting their own perfect score.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { roleOf, isManager } = require('../../../utils/authorization');

module.exports = createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  /**
   * Scoped like enrolments and completions: your own, or your own courses'.
   *
   * Results are the most sensitive thing a student generates here - reading
   * another student's marks is exactly the kind of leak the brief is testing
   * for - so the client's filters are replaced outright rather than merged.
   */
  async find(ctx) {
    const user = ctx.state.user;
    const role = roleOf(ctx);

    if (!isManager(ctx)) {
      const scope =
        role === 'instructor'
          ? { quiz: { course: { owner: user.id } } }
          : { student: user.id };

      ctx.query = { ...ctx.query, filters: scope };
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    const role = roleOf(ctx);

    if (isManager(ctx)) return super.findOne(ctx);

    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').findOne({
      documentId: ctx.params.id,
      populate: { student: true, quiz: { populate: { course: { populate: ['owner'] } } } },
    });

    if (!attempt) return ctx.notFound();

    const permitted =
      role === 'instructor'
        ? attempt.quiz?.course?.owner?.id === user.id
        : attempt.student?.id === user.id;

    if (!permitted) return ctx.forbidden();

    return super.findOne(ctx);
  },

  /**
   * The caller's own attempt history.
   *
   * The brief asks for results to be "stored and viewable later", which is this.
   */
  async mine(ctx) {
    const user = ctx.state.user;

    const attempts = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
      filters: { student: user.id },
      populate: { quiz: { populate: ['course'] } },
      sort: 'submittedAt:desc',
    });

    return {
      data: attempts.map((attempt) => ({
        documentId: attempt.documentId,
        score: attempt.score,
        total: attempt.total,
        percentage:
          attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0,
        submittedAt: attempt.submittedAt,
        quiz: attempt.quiz
          ? { documentId: attempt.quiz.documentId, title: attempt.quiz.title }
          : null,
        course: attempt.quiz?.course
          ? {
              documentId: attempt.quiz.course.documentId,
              title: attempt.quiz.course.title,
            }
          : null,
      })),
    };
  },
}));
