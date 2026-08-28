'use strict';

/**
 * Grading lives behind POST /api/quizzes/:id/submit.
 *
 * This is the only way a quiz-attempt row comes into existence. quiz-attempt
 * `create` is granted to no role at all, so there is no endpoint through which
 * a student could post their own score.
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/quizzes/:id/start',
      handler: 'quiz.start',
    },
    {
      method: 'POST',
      path: '/quizzes/:id/submit',
      handler: 'quiz.submit',
    },
  ],
};
