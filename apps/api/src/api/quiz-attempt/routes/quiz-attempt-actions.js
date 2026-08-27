'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/my/quiz-attempts',
      handler: 'quiz-attempt.mine',
    },
  ],
};
