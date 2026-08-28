/**
 * GET /api/auth/google
 *
 * Sends the browser to Strapi's Google consent flow.
 *
 * It exists as a redirect on THIS side rather than a link straight to Strapi so
 * the backend address stays server-only. The browser never needs to know where
 * the API lives - it asks this application, and this application knows.
 */
import { NextResponse } from 'next/server';
import { STRAPI_URL } from '@/lib/strapi';

export async function GET() {
  return NextResponse.redirect(`${STRAPI_URL}/api/connect/google`);
}
