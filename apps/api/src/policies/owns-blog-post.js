'use strict';

const { isAdmin, roleOf } = require('../utils/authorization');

/**
 * A Content Manager manages the posts they wrote; an Admin manages everyone's.
 *
 * Both roles hold identical blog permissions in the matrix, because the matrix
 * grants per route and cannot express "only your own rows". The difference
 * between the two lives entirely here.
 */
module.exports = async (policyContext, config, { strapi }) => {
  const user = policyContext.state?.user;
  if (!user) return false;
  if (isAdmin(policyContext)) return true;

  // Only Content Managers get this far with write permission at all; anyone else
  // was already stopped by the permission matrix.
  if (roleOf(policyContext) !== 'content-manager') return false;

  const documentId = policyContext.params?.id;

  // Creating. The controller stamps `author` from the token, so the new post is
  // theirs by construction and there is nothing to compare against yet.
  if (!documentId) return true;

  const post = await strapi.documents('api::blog-post.blog-post').findOne({
    documentId,
    populate: ['author'],
    // Without this a draft is invisible here, and editing your own unpublished
    // post would be refused on the grounds that it does not exist.
    status: 'draft',
  });

  if (!post) return false;

  return post.author?.id === user.id;
};
