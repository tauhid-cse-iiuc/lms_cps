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

/**
 * What to print as a byline.
 *
 * `name` is the person's actual name and `username` is the handle they sign in
 * with, so the name is preferred and the handle is the fallback for accounts
 * that have not set one - including every account created before the field
 * existed.
 */
const displayName = (user) => user?.name?.trim() || user?.username || null;

/**
 * Attaches the author's display name as a plain string.
 *
 * Same reason as the course byline: `author` is a relation to a user, and
 * Strapi drops relations the reader may not read - which is everyone except an
 * Admin. Populating it harder does not help; the field is removed after the
 * query, not skipped during it. A denormalised username carries what a byline
 * needs without granting anyone the ability to read the user table.
 */
const withAuthorName = async (strapi, entries) => {
  const rows = Array.isArray(entries) ? entries : [entries];
  const ids = rows.map((row) => row?.documentId).filter(Boolean);

  if (ids.length === 0) return;

  const posts = await strapi.db.query('api::blog-post.blog-post').findMany({
    where: { documentId: { $in: ids } },
    populate: ['author'],
  });

  // One post has two rows when it has a draft and a published version, and both
  // share a documentId. Either row's author is the same person, so first wins.
  const nameByDocument = new Map();
  for (const post of posts) {
    if (!nameByDocument.has(post.documentId)) {
      nameByDocument.set(post.documentId, displayName(post.author));
    }
  }

  for (const row of rows) {
    if (row) row.authorName = nameByDocument.get(row.documentId) ?? null;
  }
};

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

    const response = await super.find(ctx);
    if (response?.data) await withAuthorName(strapi, response.data);

    return response;
  },

  async findOne(ctx) {
    if (!canSeeDrafts(ctx)) {
      ctx.query = { ...ctx.query, status: 'published' };
    }

    const response = await super.findOne(ctx);
    if (response?.data) await withAuthorName(strapi, response.data);

    return response;
  },

  /**
   * POST /api/blog-posts/:id/publish  and  /unpublish
   *
   * Publishing is an ACTION in Strapi 5, not a field you set.
   *
   * Every entry has a draft version and a published version. Writing
   * publishedAt into the data on create or update looks like it should publish
   * and does not - the value is overwritten and the post stays invisible to the
   * public, with a date sitting in the record that says otherwise. That is a
   * genuinely confusing failure: the row exists, the field is populated, and the
   * blog is still empty.
   *
   * Doing it through named endpoints rather than a query-string convention means
   * the intent is explicit at the call site, and the permission matrix can grant
   * publishing separately from editing if that is ever wanted.
   */
  async publish(ctx) {
    const { id } = ctx.params;

    const post = await strapi.documents('api::blog-post.blog-post').findOne({
      documentId: id,
      status: 'draft',
    });

    if (!post) return ctx.notFound('No such post.');

    await strapi.documents('api::blog-post.blog-post').publish({ documentId: id });

    return { data: { documentId: id, published: true } };
  },

  async unpublish(ctx) {
    const { id } = ctx.params;

    const post = await strapi.documents('api::blog-post.blog-post').findOne({
      documentId: id,
      status: 'draft',
    });

    if (!post) return ctx.notFound('No such post.');

    // Unpublishing removes the published version; the draft survives, so the
    // post returns to the author's management view rather than disappearing.
    await strapi.documents('api::blog-post.blog-post').unpublish({ documentId: id });

    return { data: { documentId: id, published: false } };
  },
}));

/** Admins and Content Managers write the blog; nobody else sees a draft. */
const canSeeDrafts = (ctx) => ['admin', 'content-manager'].includes(roleOf(ctx));
