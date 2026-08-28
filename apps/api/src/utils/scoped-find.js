'use strict';

/**
 * A `find` that scopes results to what the caller is entitled to see.
 *
 * ---------------------------------------------------------------------------
 * WHY NOT JUST SET ctx.query.filters
 * ---------------------------------------------------------------------------
 * That was the original approach and it did not work. Assigning
 * `ctx.query.filters = { student: user.id }` and calling super.find() produces:
 *
 *     400 ValidationError: Invalid key student
 *
 * because the content API validates query filters against what the CALLER may
 * read, and `student` points at the users-permissions user type, which a Student
 * has no read permission on. The same rule that rejects `owner` in a request
 * body rejects it in a filter. An Instructor scoping by `course.owner` hits it
 * too.
 *
 * The failure was invisible for a long time because it fails CLOSED - a 400
 * returns no rows, so nothing leaked, and a test asserting "the caller sees at
 * most their own row" passed against an error response without ever exercising
 * the scoping.
 *
 * So the query is issued through the Document Service instead, which is server
 * code and not subject to caller-facing query validation. The filter is built
 * here, from the token, and the client's own filters are discarded rather than
 * merged - merging leaves the hole open, because Strapi's filter syntax supports
 * $or and a merged filter can be widened straight back out.
 */

/**
 * @param ctx        the request context
 * @param controller `this` from inside the controller, for sanitize/transform
 * @param uid        content type to query
 * @param filters    the scope, built from the token - never from the client
 * @param populate   relations the caller is allowed to see expanded
 */
const scopedFind = async (strapi, ctx, controller, uid, filters, populate) => {
  // Pagination is still the client's to choose; only the SCOPE is fixed.
  const page = Number(ctx.query?.pagination?.page ?? 1);
  const rawPageSize = Number(ctx.query?.pagination?.pageSize ?? 25);
  const pageSize = Math.min(Math.max(rawPageSize, 1), 100);

  const [entries, total] = await Promise.all([
    strapi.documents(uid).findMany({
      filters,
      populate,
      sort: ctx.query?.sort,
      start: (page - 1) * pageSize,
      limit: pageSize,
    }),
    strapi.documents(uid).count({ filters }),
  ]);

  const sanitized = await controller.sanitizeOutput(entries, ctx);

  return controller.transformResponse(sanitized, {
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total,
    },
  });
};

module.exports = { scopedFind };
