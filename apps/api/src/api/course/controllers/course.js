'use strict';

/**
 * course controller.
 *
 * Layer 3 of authorization. The permission matrix decides who may call an
 * endpoint; the policies decide which rows they may touch; this decides what
 * the request is allowed to SAY.
 *
 * The rule running through all of it: identity comes from the token, never from
 * the request body. A client that can name the owner of a course can give one
 * away, or take one.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { isManager } = require('../../../utils/authorization');

module.exports = createCoreController('api::course.course', ({ strapi }) => ({
  /**
   * Create a course, owned by whoever is holding the token.
   *
   * `owner` is overwritten rather than validated. Rejecting a request that names
   * the wrong owner would work too, but overwriting means there is no version of
   * this request - malformed, malicious or merely confused - that produces a
   * course belonging to somebody else.
   */
  async create(ctx) {
    const user = ctx.state.user;
    const submitted = { ...(ctx.request.body?.data ?? {}) };

    // Drop any owner the client named before doing anything else. It is about to
    // be replaced regardless, but removing it here means the value never reaches
    // validation or a log line.
    delete submitted.owner;

    // Validate what the client DID send, using the caller's own permissions -
    // the same check super.create() would have run.
    const data = await this.sanitizeInput(submitted, ctx);

    // Then write through the Document Service rather than super.create().
    //
    // This is not a shortcut, it is the only way round a real constraint. The
    // content API validates an incoming body against what the CALLER is allowed
    // to write, and `owner` points at the user content type, which an Instructor
    // has no write permission on. So a body containing `owner` is rejected with
    // "Invalid key owner" - even when the server is the one that put it there.
    // Setting it after sanitisation keeps the field server-controlled and keeps
    // client input validated, which is what we actually wanted from both.
    const created = await strapi.documents('api::course.course').create({
      data: { ...data, owner: user.id },
      populate: ['owner'],
    });

    const sanitized = await this.sanitizeOutput(created, ctx);

    // super.create() would have set this. Writing through the Document Service
    // skips that, and a create answering 200 instead of 201 is the kind of small
    // wrongness that makes a client's error handling subtly unreliable.
    ctx.status = 201;

    return this.transformResponse(sanitized);
  },

  /**
   * Update a course without letting it change hands.
   *
   * The is-owner-or-manager policy has already established that this caller may
   * edit this course. It says nothing about whether they may hand it to someone
   * else, which is a separate question: an instructor could otherwise reassign
   * their course to another user, or - more usefully to an attacker - to
   * themselves, if they could reach any course at all.
   *
   * Only managers may deliberately reassign ownership.
   */
  async update(ctx) {
    const data = ctx.request.body?.data ?? {};

    if ('owner' in data && !isManager(ctx)) {
      delete data.owner;
      ctx.request.body = { ...ctx.request.body, data };
    }

    return super.update(ctx);
  },

  /**
   * Courses owned by the caller.
   *
   * A separate endpoint rather than a filter on `find`, because "my courses" is
   * a different question from "the catalogue" and deserves to be un-spoofable:
   * there is no query string here that could make it return someone else's.
   */
  async mine(ctx) {
    const user = ctx.state.user;

    const courses = await strapi.documents('api::course.course').findMany({
      filters: { owner: user.id },
      populate: ['lessons', 'quizzes', 'enrollments'],
      sort: 'createdAt:desc',
    });

    return {
      data: courses.map((course) => ({
        ...course,
        lessonCount: course.lessons?.length ?? 0,
        quizCount: course.quizzes?.length ?? 0,
        studentCount: course.enrollments?.length ?? 0,
        lessons: undefined,
        quizzes: undefined,
        enrollments: undefined,
      })),
    };
  },

  /**
   * How far through a course a student is.
   *
   * ---------------------------------------------------------------------------
   * THE CALCULATION
   * ---------------------------------------------------------------------------
   * percentage = completed lessons in this course / total lessons in this course
   *
   * It is COUNTED on every request, never stored. That is the important design
   * decision here, and it is worth being able to defend.
   *
   * A stored percentage is a copy of something already recorded elsewhere, and
   * copies drift. Add a lesson to a course and every stored figure is silently
   * wrong - each student is now further from finishing than the number claims,
   * and nothing in the system knows. Correcting it would mean recalculating
   * every enrolled student's progress at the moment a lesson is created, which
   * is a background job, a failure mode, and a source of bugs, in exchange for
   * avoiding one indexed COUNT.
   *
   * Counting instead means the number is derived from the rows that ARE the
   * truth: the completions. It cannot disagree with them, because it is them.
   *
   * (Quiz scores go the other way and are stored - see the quiz controller.
   * The distinction is that a score is a historical fact about one moment, while
   * progress is a statement about the present.)
   *
   * ---------------------------------------------------------------------------
   * THE EDGE CASES
   * ---------------------------------------------------------------------------
   * - A course with no lessons: 0/0. Reported as 0%, not 100% and not a crash.
   *   Dividing by zero would give NaN, which serialises to null and renders as
   *   an empty progress bar with no explanation.
   * - More completions than lessons: possible if a lesson is deleted after
   *   somebody completed it. Clamped, so the bar can never read 120%.
   */
  async progress(ctx) {
    const user = ctx.state.user;

    const course = await strapi.documents('api::course.course').findOne({
      documentId: ctx.params.id,
      populate: ['lessons'],
    });

    if (!course) return ctx.notFound('That course does not exist.');

    const lessons = [...(course.lessons ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const totalLessons = lessons.length;

    // One indexed count, thanks to `course` being stored on the completion row.
    // Without that denormalisation this would have to walk two link tables.
    const completions = await strapi.db
      .query('api::lesson-completion.lesson-completion')
      .findMany({
        where: { student: user.id, course: course.id },
        populate: ['lesson'],
      });

    const completedLessonIds = new Set(
      completions.map((completion) => completion.lesson?.id).filter(Boolean)
    );

    // Count against the lessons that actually exist now, rather than trusting
    // the number of completion rows - see the edge case note above.
    const completedCount = lessons.filter((lesson) =>
      completedLessonIds.has(lesson.id)
    ).length;

    const percentage =
      totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

    return {
      data: {
        courseId: course.documentId,
        totalLessons,
        completedLessons: completedCount,
        percentage,
        // Per-lesson flags, so the UI can tick individual lessons without
        // asking a second time.
        lessons: lessons.map((lesson) => ({
          documentId: lesson.documentId,
          title: lesson.title,
          order: lesson.order,
          completed: completedLessonIds.has(lesson.id),
        })),
      },
    };
  },

  /**
   * Who is enrolled on this course, and how far each of them has got.
   *
   * For the instructor's view. The policy on the route has already established
   * that the caller owns this course.
   */
  async students(ctx) {
    const course = await strapi.documents('api::course.course').findOne({
      documentId: ctx.params.id,
      populate: ['lessons'],
    });

    if (!course) return ctx.notFound('That course does not exist.');

    const totalLessons = course.lessons?.length ?? 0;

    const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: { course: course.id },
      populate: ['student'],
    });

    const rows = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completed = await strapi.db
          .query('api::lesson-completion.lesson-completion')
          .count({ where: { student: enrollment.student?.id, course: course.id } });

        const clamped = Math.min(completed, totalLessons);

        return {
          studentId: enrollment.student?.documentId,
          username: enrollment.student?.username,
          email: enrollment.student?.email,
          enrolledAt: enrollment.enrolledAt,
          completedLessons: clamped,
          totalLessons,
          percentage: totalLessons === 0 ? 0 : Math.round((clamped / totalLessons) * 100),
        };
      })
    );

    return { data: rows };
  },
}));
