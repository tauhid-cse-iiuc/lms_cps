'use strict';

const { isEnrolledIn, isManager, roleOf } = require('../utils/authorization');

/**
 * Gates lesson content behind enrolment.
 *
 * The course catalogue is public - title, description, cover image - so that a
 * visitor can see what exists. The lessons are the product, and listing a course
 * publicly must not hand them out. This is the line between the two.
 *
 * Instructors reach their own courses' lessons through course ownership rather
 * than through an enrolment row, since nobody expects an instructor to enrol in
 * their own material.
 */
module.exports = async (policyContext, config, { strapi }) => {
  const user = policyContext.state?.user;
  if (!user) return false;
  if (isManager(policyContext)) return true;

  const documentId = policyContext.params?.id;

  // A list request rather than a single lesson. Which lessons this caller may
  // see depends on the query, not on one row, so the controller scopes the
  // result set instead - a policy can only say yes or no to the whole call.
  if (!documentId) return true;

  const lesson = await strapi.documents('api::lesson.lesson').findOne({
    documentId,
    populate: { course: { populate: ['owner'] } },
  });

  if (!lesson?.course) return false;

  if (roleOf(policyContext) === 'instructor') {
    return lesson.course.owner?.id === user.id;
  }

  return isEnrolledIn(strapi, user.id, lesson.course.id);
};
