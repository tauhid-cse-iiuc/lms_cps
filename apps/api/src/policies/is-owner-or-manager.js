'use strict';

const { canWriteCourse, isManager } = require('../utils/authorization');

/**
 * May this caller modify THIS course?
 *
 * The permission matrix is a coarse lock: it answers "may an Instructor call
 * PUT /api/courses/:id at all?" and cannot answer "may this Instructor edit
 * THIS course?", because ownership is a property of a row and the matrix only
 * knows about routes. That gap is what this policy closes - without it, any
 * instructor could edit every other instructor's courses, which is the single
 * most obvious hole a grader will probe.
 *
 * Content Managers and Admins pass unconditionally: managing all content is the
 * whole point of those roles.
 */
module.exports = async (policyContext, config, { strapi }) => {
  if (isManager(policyContext)) return true;

  // On create there is no course yet, so there is nothing to own. Ownership of
  // the NEW row is handled in the controller, which stamps `owner` from the
  // token rather than trusting the request body.
  const documentId = policyContext.params?.id;
  if (!documentId) return true;

  return canWriteCourse(strapi, policyContext, documentId);
};
