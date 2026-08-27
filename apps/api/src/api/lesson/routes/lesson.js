'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

/**
 * `findOne` is gated on enrolment: listing a course publicly must not hand out
 * its material. Writes are gated on owning the parent course - a lesson has no
 * owner of its own, so the check walks up to the course.
 */
const managesLessons = {
  name: 'global::can-manage-course-children',
  config: { contentType: 'api::lesson.lesson' },
};

module.exports = createCoreRouter('api::lesson.lesson', {
  config: {
    findOne: { policies: ['global::is-enrolled'] },
    create: { policies: [managesLessons] },
    update: { policies: [managesLessons] },
    delete: { policies: [managesLessons] },
  },
});
