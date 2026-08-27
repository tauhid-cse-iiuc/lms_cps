/**
 * POST /api/auth/logout
 *
 * Clears the local cookies AND tells Strapi to revoke the session, in that order
 * of importance. Dropping the cookies alone would leave a refresh token that is
 * still valid for fourteen days sitting on the backend - signed out in
 * appearance only.
 */
import { NextResponse } from 'next/server';
import { STRAPI_URL } from '@/lib/strapi';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;

  if (accessToken) {
    // Best effort. If Strapi is unreachable the user must still end up signed
    // out locally, so a failure here is swallowed rather than surfaced.
    await fetch(`${STRAPI_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }).catch(() => null);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
