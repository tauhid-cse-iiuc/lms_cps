'use strict';

/**
 * quiz controller.
 *
 * Two responsibilities, and they are the same responsibility seen from two
 * sides: the answer key must never leave the server, and the grading must never
 * happen off it.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { roleOf, isManager } = require('../../../utils/authorization');
const attemptToken = require('../../../utils/attempt-token');

/**
 * Anyone who is not staff and does not own the course.
 *
 * Everyone else gets the quiz with `correctIndex` removed from every question.
 */
const mustHideAnswers = (ctx, course) => {
  if (isManager(ctx)) return false;
  if (roleOf(ctx) === 'instructor' && course?.owner?.id === ctx.state.user?.id) {
    return false;
  }
  return true;
};

/**
 * Remove the answer key from a quiz.
 *
 * Returns a NEW object rather than deleting fields in place. Mutating the
 * object Strapi handed back can poison a cached document, so a later request -
 * possibly an instructor's, possibly a different student's - sees a quiz whose
 * key has already been stripped, or worse, has not.
 */
const stripAnswerKey = (quiz) => ({
  ...quiz,
  questions: (quiz.questions ?? []).map(({ correctIndex, ...question }) => question),
});

module.exports = createCoreController('api::quiz.quiz', ({ strapi }) => ({
  /**
   * List quizzes.
   *
   * The stripping happens here, in the controller, and not in the UI. A quiz
   * whose answers are only hidden by the frontend is not hidden at all: the
   * response is one DevTools Network tab away, and a student who wants to cheat
   * does not need to be sophisticated to look there.
   */
  async find(ctx) {
    // Strapi does not populate component fields unless asked, so without this a
    // quiz comes back as a bare title. Worth stating plainly because it also
    // makes the stripping below look like it works when it does nothing: an
    // empty question list has no answer key to leak.
    ctx.query = { ...ctx.query, populate: { questions: true } };

    const { data, meta } = await super.find(ctx);

    const quizzes = await Promise.all(
      (data ?? []).map(async (quiz) => {
        const full = await strapi.documents('api::quiz.quiz').findOne({
          documentId: quiz.documentId,
          populate: { course: { populate: ['owner'] } },
        });

        return mustHideAnswers(ctx, full?.course) ? stripAnswerKey(quiz) : quiz;
      })
    );

    return { data: quizzes, meta };
  },

  async findOne(ctx) {
    ctx.query = { ...ctx.query, populate: { questions: true } };

    const result = await super.findOne(ctx);
    if (!result?.data) return result;

    const full = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.id,
      populate: { course: { populate: ['owner'] } },
    });

    return {
      ...result,
      data: mustHideAnswers(ctx, full?.course)
        ? stripAnswerKey(result.data)
        : result.data,
    };
  },

  /**
   * POST /api/quizzes/:id/start
   *
   * Begins a timed attempt and hands back a signed token recording when it
   * began. The countdown the candidate sees is drawn from this, but it is not
   * what enforces the limit - see submit, which checks the token itself. A timer
   * that exists only in the browser is a courtesy, not a rule.
   */
  async start(ctx) {
    const user = ctx.state.user;

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.id,
      populate: { course: true, questions: true },
    });

    if (!quiz) return ctx.notFound('That quiz does not exist.');

    const questions = quiz.questions ?? [];
    if (questions.length === 0) {
      return ctx.badRequest('That quiz has no questions yet.');
    }

    if (roleOf(ctx) === 'student') {
      const enrolled = await strapi.db.query('api::enrollment.enrollment').count({
        where: { student: user.id, course: quiz.course?.id },
      });
      if (enrolled === 0) return ctx.forbidden('Enrol in this course first.');
    }

    const timeLimitSeconds = quiz.timeLimitSeconds ?? 600;
    const issued = attemptToken.issue({
      quizId: quiz.documentId,
      userId: user.id,
      timeLimitSeconds,
    });

    return {
      data: {
        token: issued.token,
        timeLimitSeconds,
        // Absolute, so a clock skewed on the candidate's machine cannot buy them
        // extra minutes - the browser counts down to a server-stated instant.
        expiresAt: new Date(issued.expiresAt).toISOString(),
        questionCount: questions.length,
      },
    };
  },

  /**
   * POST /api/quizzes/:id/submit
   *
   * ---------------------------------------------------------------------------
   * THE GRADING
   * ---------------------------------------------------------------------------
   * The student sends only their chosen answers - an array of option indexes.
   * The server compares each one against the `correctIndex` it holds and counts
   * the matches.
   *
   * The score is NEVER accepted from the client. That is why quiz-attempt.create
   * is absent from the permission matrix for every role, including Student: if a
   * student could POST to /api/quiz-attempts they would simply post a perfect
   * score and skip the quiz entirely. Attempts come into existence here, or not
   * at all.
   *
   * ---------------------------------------------------------------------------
   * WHY THE SCORE IS STORED WHEN PROGRESS IS COUNTED
   * ---------------------------------------------------------------------------
   * These look like contradictory decisions and are not.
   *
   * A quiz score is a fact about a moment: "on Tuesday, this student answered
   * these questions this way and got 7 of 10". If the instructor later fixes a
   * wrong answer key, that historical result must not silently change - the
   * student really did score 7 against the quiz as it stood. So the score is
   * written down.
   *
   * Progress is a statement about the present: "this student has finished 4 of
   * the 6 lessons that exist right now". It has to move when the course does.
   * So it is counted.
   *
   * `answers` is stored alongside, so a disputed result can be re-examined
   * against the key as it stands today without overwriting what was recorded.
   */
  async submit(ctx) {
    const user = ctx.state.user;
    const submitted = ctx.request.body?.answers ?? ctx.request.body?.data?.answers;
    const startToken = ctx.request.body?.token;

    if (!Array.isArray(submitted)) {
      return ctx.badRequest('Send an "answers" array of selected option indexes.');
    }

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.id,
      // `questions` is a component and is not populated by default. Without it
      // every quiz looks empty and every submission is refused.
      populate: { course: true, questions: true },
    });

    if (!quiz) return ctx.notFound('That quiz does not exist.');

    const questions = quiz.questions ?? [];
    const total = questions.length;

    if (total === 0) {
      return ctx.badRequest('That quiz has no questions yet.');
    }

    // The timer is enforced HERE, against the signed token, because this is the
    // only clock the candidate cannot reach. A missing or altered token is
    // refused outright rather than silently treated as untimed.
    const timeLimitSeconds = quiz.timeLimitSeconds ?? 600;
    const check = attemptToken.verify(startToken, {
      quizId: quiz.documentId,
      userId: user.id,
    });

    if (!check.valid) {
      const message =
        check.reason === 'expired'
          ? 'Your time ran out. Start the assessment again to retry.'
          : check.reason === 'missing'
            ? 'Start the assessment before submitting it.'
            : 'That assessment session is not valid. Start it again.';

      return ctx.badRequest(message, { reason: check.reason, timeLimitSeconds });
    }

    if (submitted.length !== total) {
      // Refuse a partial submission rather than scoring the missing answers as
      // wrong. A length mismatch means the client and the server disagree about
      // what the quiz IS - usually because it was edited mid-attempt - and
      // silently grading that disagreement produces a result nobody can explain.
      return ctx.badRequest(
        `This quiz has ${total} questions; ${submitted.length} answers were sent.`
      );
    }

    // Students must be enrolled. Otherwise quiz results could accumulate for
    // courses the student was never part of.
    if (roleOf(ctx) === 'student') {
      const enrolled = await strapi.db.query('api::enrollment.enrollment').count({
        where: { student: user.id, course: quiz.course?.id },
      });
      if (enrolled === 0) return ctx.forbidden('Enrol in this course first.');
    }

    // The grading itself.
    let score = 0;
    const perQuestion = questions.map((question, index) => {
      const chosen = submitted[index];
      // Strict equality against a number: a chosen value arriving as the string
      // "2" must not quietly count as correct, because that would mean the
      // result depended on how the client happened to serialise it.
      const correct = Number.isInteger(chosen) && chosen === question.correctIndex;
      if (correct) score += 1;
      return { question: question.text, chosen, correct };
    });

    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').create({
      data: {
        student: user.id,
        quiz: quiz.id,
        answers: submitted,
        score,
        total,
        submittedAt: new Date(),
      },
    });

    return {
      data: {
        attemptId: attempt.documentId,
        score,
        total,
        // Derived, not stored. Both inputs are already recorded, so a third copy
        // of the same truth would just be a third thing to keep in step.
        percentage: Math.round((score / total) * 100),
        // Which questions were right - but still never which answer was.
        results: perQuestion,
      },
    };
  },
}));
