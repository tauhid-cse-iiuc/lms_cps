/**
 * POST /api/auth/register
 *
 * Self-registration. Note what is NOT accepted here: a role. Strapi assigns one
 * itself, from the `default_role` setting the bootstrap seed points at Student,
 * so there is no request a visitor can craft that signs them up as an Admin.
 * That rule lives in the backend rather than in this handler on purpose - it
 * holds even for someone calling Strapi's own /api/auth/local/register directly
 * and bypassing this application entirely.
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
  let body: { username?: unknown; email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: 'Enter a name, an email address and a password.' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Use a password of at least 8 characters.' },
      { status: 400 }
    );
  }

  const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.jwt) {
    return NextResponse.json(
      { error: data?.error?.message ?? 'Could not create your account.' },
      { status: res.status === 200 ? 502 : res.status }
    );
  }

  // Registering signs you straight in - the same cookies a login would set.
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
