'use strict';

/**
 * blog-post controller.
 *
 * The blog is the one place in this application with a published/unpublished
 * distinction, handled by Strapi's native Draft & Publish rather than a status
 * field of our own - which means "only published posts are public" is nearly
 * free, with one catch handled below.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { isAdmin, roleOf } = require('../../../utils/authorization');

module.exports = createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  /**
   * Author comes from the token, never the body - the same rule as course
   * ownership, for the same reason.
   */
  async create(ctx) {
    const submitted = { ...(ctx.request.body?.data ?? {}) };
    delete submitted.author;

    // Same constraint as course ownership: `author` points at the user content
    // type, which a Content Manager cannot write, so it has to be applied after
    // the client's input has been validated rather than mixed into it.
    const data = await this.sanitizeInput(submitted, ctx);

    const created = await strapi.documents('api::blog-post.blog-post').create({
      data: { ...data, author: ctx.state.user.id },
      populate: ['author'],
    });

    const sanitized = await this.sanitizeOutput(created, ctx);

    // super.create() would have set this. Writing through the Document Service
    // skips that, and a create answering 200 instead of 201 is the kind of small
    // wrongness that makes a client's error handling subtly unreliable.
    ctx.status = 201;

    return this.transformResponse(sanitized);
  },

  /** An author change is a transfer of ownership, and only an Admin may do it. */
  async update(ctx) {
    const data = ctx.request.body?.data ?? {};

    if ('author' in data && !isAdmin(ctx)) {
      delete data.author;
      ctx.request.body = { ...ctx.request.body, data };
    }

    return super.update(ctx);
  },

  /**
   * Drafts are for the people who can edit them.
   *
   * Strapi returns published entries by default, which sounds like the whole job
   * is done - but "by default" is doing a lot of work in that sentence. A caller
   * can ask for drafts with ?status=draft, and the default only applies when
   * they have not. So the status is PINNED for anyone without write access
   * rather than left to the query string.
   */
  async find(ctx) {
    if (!canSeeDrafts(ctx)) {
      ctx.query = { ...ctx.query, status: 'published' };
    }
    return super.find(ctx);
  },

  async findOne(ctx) {
    if (!canSeeDrafts(ctx)) {
      ctx.query = { ...ctx.query, status: 'published' };
    }
    return super.findOne(ctx);
  },
}));

/** Admins and Content Managers write the blog; nobody else sees a draft. */
const canSeeDrafts = (ctx) => ['admin', 'content-manager'].includes(roleOf(ctx));
