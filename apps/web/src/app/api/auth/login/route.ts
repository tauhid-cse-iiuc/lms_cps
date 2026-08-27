/**
 * POST /api/auth/login
 *
 * Exchanges credentials for a session, and is the ONLY place the browser is
 * allowed to obtain one. The tokens Strapi returns are written straight into
 * httpOnly cookies and are deliberately absent from the JSON that goes back:
 * the browser learns that it is signed in, never what it is signed in with.
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

export async function POST(request: Request) {
  let body: { identifier?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identifier || !password) {
    return NextResponse.json(
      { error: 'Enter your email address and password.' },
      { status: 400 }
    );
  }

  const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.jwt) {
    // Strapi answers 400 for both "no such user" and "wrong password", which is
    // the right behaviour - distinguishing them tells an attacker which email
    // addresses are registered. Pass that single message through unchanged.
    return NextResponse.json(
      { error: data?.error?.message ?? 'Could not sign you in.' },
      { status: res.status === 200 ? 502 : res.status }
    );
  }

  const response = NextResponse.json({ ok: true });
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
