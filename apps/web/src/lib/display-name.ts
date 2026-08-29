/**
 * How to address someone, for server and client alike.
 *
 * It lives in its own module rather than in `lib/auth.ts` for one hard reason:
 * `auth.ts` imports `next/headers`, which exists only on the server. A client
 * component importing anything from that file - even a two-line pure function -
 * drags `cookies()` into the browser bundle and the build fails outright. The
 * header and the user menu are client components and both need this, so the
 * function has to sit somewhere with no server-only imports at all.
 */
export type Named = { name?: string | null; username: string };

/**
 * The person's own name if they have set one, otherwise their handle.
 *
 * One helper rather than `user.name ?? user.username` at every call site,
 * because the fallback has to apply EVERYWHERE - miss it once and somebody with
 * no name set is greeted by an empty space.
 */
export const displayName = (user: Named): string =>
  user.name?.trim() || user.username;
