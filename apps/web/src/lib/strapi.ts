/**
 * Where the Strapi backend lives.
 *
 * SERVER ONLY, and there is deliberately no browser equivalent. In this
 * application the browser never calls Strapi: it calls Next.js Route Handlers
 * and Server Components, which hold the access token and call Strapi
 * themselves. A NEXT_PUBLIC_ variable would be inlined into the JavaScript
 * bundle sent to visitors, and nothing on that side has any use for the address.
 *
 * Keeping it server-only is what lets this later point at a private network
 * address without the browser needing to know.
 */

/** Base URL for server-side calls (Server Components, Route Handlers). */
export const STRAPI_URL =
  process.env.STRAPI_URL ?? 'http://localhost:1337';
