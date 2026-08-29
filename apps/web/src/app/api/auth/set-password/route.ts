/**
 * POST /api/auth/set-password
 *
 * A FIRST password, for an account created through Google and therefore holding
 * none. The backend refuses this the moment a password exists, so it cannot be
 * used to skip the current-password check that /api/auth/change-password makes.
 *
 * No cookies are rewritten here, and that is the difference from change-password.
 * Strapi rotates the session when an existing password is changed, because the
 * old one may have been the thing that leaked. Setting a first password revokes
 * nothing - there was no earlier credential to distrust - so the session the
 * person is already holding stays exactly as it was.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { STRAPI_URL } from '@/lib/strapi';
import { ACCESS_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });
  }

  let body: { password?: unknown; passwordConfirmation?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  const passwordConfirmation =
    typeof body.passwordConfirmation === 'string' ? body.passwordConfirmation : '';

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

  const res = await fetch(`${STRAPI_URL}/api/account/set-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password, passwordConfirmation }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? 'Could not set your password.' },
      { status: res.status }
    );
  }

  return NextResponse.json({ ok: true });
}
