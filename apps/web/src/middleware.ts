/**
 * Runs before every page request. Two jobs.
 *
 * FIRST, it renews the session. The access token lasts ten minutes, which would
 * otherwise mean signing in again several times an hour. Middleware is the right
 * place for this and very nearly the only place: a Server Component can READ
 * cookies but cannot SET them, so it has no way to persist a token it renewed.
 * Middleware can do both.
 *
 * The renewal has a subtlety worth understanding. Setting a cookie on the
 * response tells the BROWSER about the new token, which helps the next request
 * and does nothing for this one - the page about to render would still see the
 * old cookie header and conclude nobody is signed in. So the request's own
 * cookies are rewritten too, and the amended headers handed to the rest of the
 * pipeline. Without that, every renewal would cost the user one spuriously
 * logged-out page.
 *
 * SECOND, it enforces the coarse signed-in / signed-out routing rule. This is
 * NOT the application's access control: middleware runs on cookies, and cookies
 * describe what the browser is willing to say about itself. Anyone can call the
 * API directly with curl. The real enforcement is the permission matrix and the
 * policies in the backend; this only decides which page to render.
 */
import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  sessionCookie,
} from '@/lib/auth';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

/** Pages that require a session. */
const PROTECTED = ['/dashboard', '/account', '/create-password'];
/**
 * Pages that make no sense once you already have one.
 *
 * /reset-password is deliberately NOT here. Someone following a reset link may
 * still have a live session in that browser - that is exactly the case where a
 * password is forgotten rather than lost - and bouncing them to the dashboard
 * would make the emailed link do nothing.
 */
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

const startsWithAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  let renewed: { access: string; refresh?: string } | null = null;
  let refreshFailed = false;

  // The access cookie is set to expire slightly BEFORE the token inside it, so
  // "gone, but a refresh token remains" is the normal, expected renewal signal
  // rather than a sign of anything wrong.
  if (!accessToken && refreshToken) {
    try {
      const res = await fetch(`${STRAPI_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });

      const data = res.ok ? await res.json().catch(() => null) : null;

      if (data?.jwt) {
        renewed = { access: data.jwt, refresh: data.refreshToken };
        accessToken = data.jwt;
        // Make the new token visible to THIS request, not just the next one.
        request.cookies.set(ACCESS_COOKIE, data.jwt);
      } else {
        refreshFailed = true;
      }
    } catch {
      // Backend unreachable. Treat as not-signed-in for routing purposes, but
      // do NOT delete the refresh token - it is probably still perfectly valid
      // and the outage is ours.
      refreshFailed = false;
      accessToken = undefined;
    }
  }

  /**
   * Holding a cookie is not the same as having a session.
   *
   * An access token can be dead while its cookie is very much alive - the
   * session was revoked, the account was deleted, the backend's JWT secret
   * changed. Treating "cookie present" as "signed in" then produces a loop
   * nobody can escape from inside the browser: /register redirects to
   * /dashboard, the dashboard finds no user and redirects to /login, /login is
   * an auth page so the middleware redirects it back to /dashboard, forever.
   *
   * So the token is VERIFIED before it is allowed to bounce anyone off an auth
   * page, and cleared when it turns out to be dead. That costs one request, and
   * only on /login, /register and /forgot-password - the three pages where
   * being wrong is unrecoverable. Everywhere else a dead token is harmless:
   * the page asks who the caller is, gets nobody, and handles it.
   */
  let signedIn = Boolean(accessToken);

  if (signedIn && startsWithAny(pathname, AUTH_PAGES)) {
    try {
      const res = await fetch(`${STRAPI_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        signedIn = false;
        refreshFailed = true; // clears both cookies below
      }
    } catch {
      // Backend unreachable. Leave the session alone and let them see the form;
      // an outage of ours must not delete somebody's credentials.
    }
  }

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    return NextResponse.redirect(url);
  };

  let response: NextResponse;

  if (!signedIn && startsWithAny(pathname, PROTECTED)) {
    response = redirectTo('/login');
  } else if (signedIn && startsWithAny(pathname, AUTH_PAGES)) {
    response = redirectTo('/dashboard');
  } else {
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  if (renewed) {
    response.cookies.set(ACCESS_COOKIE, renewed.access, sessionCookie(ACCESS_MAX_AGE));
    // Refresh tokens rotate: the one just used is now dead. Storing the
    // replacement is not optional - miss it and the user is signed out on the
    // request after next, which looks random rather than like an expiry.
    if (renewed.refresh) {
      response.cookies.set(
        REFRESH_COOKIE,
        renewed.refresh,
        sessionCookie(REFRESH_MAX_AGE)
      );
    }
  }

  // Only clear on an explicit rejection from the backend - an expired or
  // already-rotated refresh token. A network failure must not sign anyone out.
  if (refreshFailed) {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *  - /api/auth/*  the route handlers, which set these cookies themselves
     *  - /_next/*     framework assets
     *  - static files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
