/**
 * POST /api/auth/resend-confirmation
 *
 * Sends the confirmation email again, for the account that has just been
 * created and cannot sign in yet.
 *
 * Strapi answers `{ sent: true }` for an address it has never seen, and errors
 * with "Already confirmed" for one that is done - the second of which is worth
 * passing through as a failure, because the useful next step there is to sign
 * in rather than to keep waiting for an email that will not arrive.
 */
import { NextResponse } from 'next/server';
import { STRAPI_URL } from '@/lib/strapi';

export async function POST(request: Request) {
  let body: { email?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!email) {
    return NextResponse.json({ error: 'No address to send to.' }, { status: 400 });
  }

  const res = await fetch(`${STRAPI_URL}/api/auth/send-email-confirmation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    const message =
      res.status >= 500
        ? 'The email could not be sent. The mail service may not be configured on this deployment.'
        : (data?.error?.message ?? 'Could not send the email.');

    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
