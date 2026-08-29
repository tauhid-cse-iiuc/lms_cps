/**
 * PUT /api/account/profile
 *
 * Changes the signed-in user's display name.
 *
 * A thin proxy: the backend does the real validation, because this handler is
 * not the only way to reach that endpoint and a rule enforced only here would
 * be a rule that holds for the browser and nothing else. The checks below exist
 * to save a round trip on the obvious mistakes, not to be the boundary.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { STRAPI_URL } from '@/lib/strapi';
import { ACCESS_COOKIE } from '@/lib/auth';

export async function PUT(request: Request) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });
  }

  let body: { name?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  }

  if (name.length > 80) {
    return NextResponse.json(
      { error: 'That name is too long; use 80 characters or fewer.' },
      { status: 400 }
    );
  }

  const res = await fetch(`${STRAPI_URL}/api/account/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? 'Could not save your name.' },
      { status: res.status }
    );
  }

  return NextResponse.json({ ok: true, name: data?.data?.name ?? name });
}
