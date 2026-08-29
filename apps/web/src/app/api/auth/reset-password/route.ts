/**
 * POST /api/auth/reset-password
 *
 * Exchanges the code from the reset email for a new password, and signs the
 * person in on the way out - Strapi returns a session for the account it just
 * reset, so making them type the password they set thirty seconds ago would be
 * ceremony rather than security.
 *
 * The code is a bearer credential: anyone holding it can take the account. It
 * therefore travels in the request BODY, never in a query string, so it stays
 * out of server logs and out of any Referer header this application sends.
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
  let body: { code?: unknown; password?: unknown; passwordConfirmation?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const passwordConfirmation =
    typeof body.passwordConfirmation === 'string' ? body.passwordConfirmation : '';

  if (!code) {
    return NextResponse.json(
      { error: 'This reset link is incomplete. Request a new one.' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Use a password of at least 8 characters.' },
      { status: 400 }
    );
  }

  if (password !== passwordConfirmation) {
    return NextResponse.json(
      { error: 'The two passwords do not match.' },
      { status: 400 }
    );
  }

  const res = await fetch(`${STRAPI_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, password, passwordConfirmation }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.jwt) {
    return NextResponse.json(
      {
        error:
          data?.error?.message ??
          'That reset link is no longer valid. Request a new one.',
      },
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
