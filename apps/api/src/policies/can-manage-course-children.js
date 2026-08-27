'use strict';

const { canWriteCourse, isManager } = require('../utils/authorization');

/**
 * May this caller modify this lesson or quiz?
 *
 * A lesson has no owner of its own - it belongs to a course, and the course has
 * the owner. So the check has to walk up to the parent before it can answer,
 * and where the parent comes from depends on the verb:
 *
 *   create          the parent is named in the request body
 *   update, delete  the parent is whatever the stored row already points at
 *
 * Reading it from the body on update would be a hole rather than a shortcut: an
 * instructor could send the id of a course they DO own while editing a lesson
 * belonging to one they do not, and the check would happily pass.
 */
module.exports = async (policyContext, config, { strapi }) => {
  if (isManager(policyContext)) return true;

  // Which content type this policy is guarding. Set per route, because the same
  // logic serves both lessons and quizzes.
  const uid = config?.contentType;
  if (!uid) {
    strapi.log.error('[policy] can-manage-course-children needs a contentType in its config');
    return false;
  }

  const documentId = policyContext.params?.id;

  if (!documentId) {
    // Creating. Trust the body only for the parent id, and only because there is
    // no stored row to consult yet - canWriteCourse still verifies ownership.
    const courseRef = policyContext.request?.body?.data?.course;
    return canWriteCourse(strapi, policyContext, normaliseRef(courseRef));
  }

  const existing = await strapi.documents(uid).findOne({
    documentId,
    populate: { course: { populate: ['owner'] } },
  });

  if (!existing?.course) return false;

  return existing.course.owner?.id === policyContext.state.user?.id;
};

/**
 * A relation in a request body may arrive as a bare id, as a documentId string,
 * or as an object. Reduce those to the documentId this policy can look up.
 */
const normaliseRef = (ref) => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    if (typeof ref.documentId === 'string') return ref.documentId;
    if (Array.isArray(ref.connect) && ref.connect.length > 0) {
      const first = ref.connect[0];
      return typeof first === 'string' ? first : (first?.documentId ?? null);
    }
  }
  return null;
};
