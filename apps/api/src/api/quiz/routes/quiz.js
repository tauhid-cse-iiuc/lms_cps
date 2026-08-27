'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

const managesQuizzes = {
  name: 'global::can-manage-course-children',
  config: { contentType: 'api::quiz.quiz' },
};

module.exports = createCoreRouter('api::quiz.quiz', {
  config: {
    create: { policies: [managesQuizzes] },
    update: { policies: [managesQuizzes] },
    delete: { policies: [managesQuizzes] },
  },
});
