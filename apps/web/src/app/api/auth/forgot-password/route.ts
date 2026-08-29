/**
 * POST /api/auth/forgot-password
 *
 * Asks Strapi to email a reset link.
 *
 * The reply is deliberately the same whether or not the address has an account.
 * Strapi already answers `{ ok: true }` for an unknown address - a decision
 * worth preserving rather than "helpfully" improving, because an endpoint that
 * says "no account with that email" is an account-enumeration oracle that needs
 * no password and no rate limit to be useful.
 *
 * The one thing this DOES surface is a mail-transport failure. If SMTP is
 * misconfigured, Strapi throws after generating the token, and reporting that as
 * success would leave someone waiting forever for an email that was never sent.
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
    return NextResponse.json(
      { error: 'Enter the email address on the account.' },
      { status: 400 }
    );
  }

  const res = await fetch(`${STRAPI_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    // A 5xx here is almost always the mailer, because the only work Strapi does
    // after validating the address is generate a token and hand it to the email
    // service. Passing its "Internal Server Error" straight through would tell
    // the reader nothing and send them to retry the same form forever, so the
    // likely cause is named instead.
    const message =
      res.status >= 500
        ? 'The email could not be sent. The mail service may not be configured on this deployment.'
        : (data?.error?.message ?? 'Could not send the reset email.');

    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
