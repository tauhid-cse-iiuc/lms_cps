/**
 * Session handling for the Next.js side of the application.
 *
 * The shape of this is dictated by two facts about the backend, both measured
 * rather than assumed:
 *
 *  1. Strapi is running in `jwtManagement: 'refresh'` mode, so a login returns a
 *     SHORT-LIVED access token - ten minutes - plus a refresh token that lasts
 *     fourteen days. The refresh token ROTATES: using it invalidates it and
 *     issues a replacement, so whatever comes back has to be stored or the user
 *     is logged out on the request after next.
 *
 *  2. The access token carries no role. Its payload is `{userId, sessionId,
 *     type}` and nothing else, so the only way to find out who is calling is to
 *     ask the backend - see `getCurrentUser` below.
 *
 * Both tokens live in httpOnly cookies set by this application on its own
 * domain. They are never returned to the browser in a response body and never
 * touch localStorage: a token JavaScript can read is a token an XSS can steal,
 * and it would also be invisible to Server Components and middleware, which is
 * where the real access control has to happen.
 */
import { cache } from 'react';
import { cookies } from 'next/headers';
import { STRAPI_URL } from './strapi';

export const ACCESS_COOKIE = 'lms_access';
export const REFRESH_COOKIE = 'lms_refresh';

/**
 * The access token itself is valid for 600 seconds. The cookie is deliberately
 * given slightly LESS than that.
 *
 * Expiring the cookie first means the browser stops sending the access token
 * shortly before the backend would start rejecting it, so the middleware sees
 * "no access token, but a refresh token" and renews cleanly. The alternative -
 * a cookie that outlives its token - guarantees a window where every request
 * carries credentials that are already dead.
 */
export const ACCESS_MAX_AGE = 9 * 60; // 9 minutes; the token itself lasts 10
export const REFRESH_MAX_AGE = 14 * 24 * 60 * 60; // matches idleRefreshTokenLifespan

export type RoleType = 'admin' | 'content-manager' | 'instructor' | 'student';

export type CurrentUser = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  role: { id: number; name: string; type: RoleType };
};

/** Cookie attributes. Secure only in production, because localhost is http. */
export const sessionCookie = (maxAge: number) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }) as const;

/**
 * Who is making this request, according to the backend.
 *
 * Wrapped in React's `cache` so that a page rendering a header, a sidebar and a
 * guard clause asks once per request rather than three times.
 *
 * Note the check on `role`. Strapi sanitises this response against the caller's
 * own permissions and silently DROPS any relation the caller may not read, so a
 * misconfigured role produces a perfectly successful 200 with the role missing
 * rather than an error. Treating that as "not signed in" fails closed: it is
 * always safer to under-grant than to carry on with an unknown role.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const res = await fetch(`${STRAPI_URL}/api/users/me?populate=role`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const user = (await res.json()) as Partial<CurrentUser>;
  if (!user?.role?.type) return null;

  return user as CurrentUser;
});

/** The access token for outgoing calls made on behalf of the signed-in user. */
export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}
