/**
 * POST /api/auth/change-password
 *
 * Proxies to Strapi's change-password endpoint, which every role can reach
 * because auth.changePassword is granted in the permission matrix - a user who
 * holds Admin, Instructor, Content Manager or Student inherits nothing from the
 * built-in Authenticated role, so it had to be granted explicitly.
 *
 * The important detail is what Strapi does afterwards. Changing a password
 * invalidates the existing refresh token and issues a NEW pair, so a handler
 * that ignored the response body would leave the browser holding credentials
 * that had just been revoked - the user would appear signed in and then be
 * thrown out on the next renewal, with nothing to explain why. The new tokens
 * are written back into the cookies here.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { STRAPI_URL } from '@/lib/strapi';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  sessionCookie,
} from '@/lib/auth';

export async function POST(request: Request) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });
  }

  let body: {
    currentPassword?: unknown;
    password?: unknown;
    passwordConfirmation?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const passwordConfirmation =
    typeof body.passwordConfirmation === 'string' ? body.passwordConfirmation : '';

  if (!currentPassword || !password) {
    return NextResponse.json(
      { error: 'Enter your current password and a new one.' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Use a new password of at least 8 characters.' },
      { status: 400 }
    );
  }

  if (password !== passwordConfirmation) {
    return NextResponse.json(
      { error: 'The two new passwords do not match.' },
      { status: 400 }
    );
  }

  const res = await fetch(`${STRAPI_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, password, passwordConfirmation }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.jwt) {
    return NextResponse.json(
      { error: data?.error?.message ?? 'Could not change your password.' },
      { status: res.status === 200 ? 502 : res.status }
    );
  }

  const response = NextResponse.json({ ok: true });

  // The old refresh token is dead from this moment. Storing the replacement is
  // not optional - miss it and the user is signed out at the next renewal.
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
