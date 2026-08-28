/**
 * GET /connect/google/redirect
 *
 * Where Google sends the browser back to, by way of Strapi.
 *
 * Strapi handles the consent exchange and then redirects here with an
 * access_token in the query string. That token is Google's, not ours - it is
 * exchanged for a session by asking Strapi, which is also where the sign-up
 * domain policy is applied. A Google account outside the allowed domains is
 * refused at that point, before any user row exists.
 *
 * The session cookies are set here, so the tokens never touch client JavaScript
 * and never appear in a URL the browser keeps in history.
 */
import { NextResponse } from 'next/server';
import { STRAPI_URL } from '@/lib/strapi';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  sessionCookie,
} from '@/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get('access_token');

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(reason)}`, url.origin)
    );

  if (!accessToken) return fail('Google sign-in was cancelled.');

  const res = await fetch(
    `${STRAPI_URL}/api/auth/google/callback?access_token=${encodeURIComponent(accessToken)}`,
    { cache: 'no-store' }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.jwt) {
    // The domain policy rejects here, and its message is the useful one - it
    // tells the person which addresses are accepted rather than "sign-in
    // failed", which would leave them retrying the same account forever.
    return fail(data?.error?.message ?? 'Could not sign you in with Google.');
  }

  const response = NextResponse.redirect(new URL('/dashboard', url.origin));
  response.cookies.set(ACCESS_COOKIE, data.jwt, sessionCookie(ACCESS_MAX_AGE));
  if (data.refreshToken) {
    response.cookies.set(
      REFRESH_COOKIE,
      data.refreshToken,
      sessionCookie(REFRESH_MAX_AGE)
    );
  }

  return response;
}
