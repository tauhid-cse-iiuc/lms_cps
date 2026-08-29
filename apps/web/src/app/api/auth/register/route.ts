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
  let body: {
    username?: unknown;
    email?: unknown;
    password?: unknown;
    name?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || !username || !email || !password) {
    return NextResponse.json(
      { error: 'Enter your name, a username, an email address and a password.' },
      { status: 400 }
    );
  }

  if (name.length > 80) {
    return NextResponse.json(
      { error: 'That name is too long; use 80 characters or fewer.' },
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
    // `name` reaches Strapi only because it is listed in the plugin's
    // register.allowedFields - see config/plugins.js. An unlisted key is not
    // ignored, it fails the whole request.
    body: JSON.stringify({ name, username, email, password }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? 'Could not create your account.' },
      { status: res.status }
    );
  }

  /**
   * A successful registration with NO token is not a failure - it is email
   * confirmation being on.
   *
   * Strapi returns `{ user }` and withholds the session until the address is
   * confirmed (auth controller: `if (settings.email_confirmation) return
   * ctx.send({ user })`). Treating a missing jwt as an error, which is what the
   * obvious check does, would tell someone their sign-up failed at the exact
   * moment it succeeded - and they would go on to create a second account.
   *
   * Whether confirmation is on depends on whether SMTP is configured, so both
   * shapes are live in this codebase and the caller is told which happened.
   */
  if (!data?.jwt) {
    if (data?.user) {
      return NextResponse.json({ ok: true, confirmationRequired: true, email });
    }

    return NextResponse.json(
      { error: 'Could not create your account.' },
      { status: 502 }
    );
  }

  // No confirmation needed: registering signs you straight in, with the same
  // cookies a login would set.
  const response = NextResponse.json({ ok: true, confirmationRequired: false });
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
