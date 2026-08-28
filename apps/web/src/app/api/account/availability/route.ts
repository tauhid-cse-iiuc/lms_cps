/**
 * GET /api/account/availability
 *
 * Proxies the sign-up availability check to Strapi.
 *
 * It exists on this side so the backend address stays server-only - the browser
 * asks this application, and this application knows where the API lives. It also
 * means the check goes through the same origin as the form, so no CORS
 * preflight on every keystroke.
 */
import { NextResponse } from 'next/server';
import { STRAPI_URL } from '@/lib/strapi';

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const username = incoming.searchParams.get('username') ?? '';
  const email = incoming.searchParams.get('email') ?? '';

  if (!username && !email) {
    return NextResponse.json({ data: {} });
  }

  const target = new URL(`${STRAPI_URL}/api/account/availability`);
  if (username) target.searchParams.set('username', username);
  if (email) target.searchParams.set('email', email);

  const res = await fetch(target, { cache: 'no-store' });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json({ data: {} }, { status: res.status });
  }

  return NextResponse.json(body);
}
