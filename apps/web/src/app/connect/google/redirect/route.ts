/**
 * GET /connect/google/redirect
 *
 * Where Google sends the browser back to, by way of Strapi.
 *
 * Strapi handles the consent exchange and then redirects here with an
 * access_token in the query string. That token is Google's, not ours - it is
 * exchanged for a session by asking Strapi, which is also where the sign-up
 * domain policy is applied. A Google account outside the allowed domains is
 * refused at that point, before any user row exists.
 *
 * The session cookies are set here, so the tokens never touch client JavaScript
 * and never appear in a URL the browser keeps in history.
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get('access_token');

  // The plugin redirects here with error/error_description when the exchange
  // fails - a denied consent, an expired state, a mismatched redirect URI. It
  // is worth passing that through rather than flattening every failure into one
  // message: "OAuth2 state mismatch" and "user denied access" need different
  // responses from whoever is reading it.
  const oauthError = url.searchParams.get('error');
  const oauthDetail = url.searchParams.get('error_description');

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(reason)}`, url.origin)
    );

  if (oauthError) {
    return fail(oauthDetail || `Google sign-in failed (${oauthError}).`);
  }

  if (!accessToken) return fail('Google sign-in was cancelled.');

  const res = await fetch(
    `${STRAPI_URL}/api/auth/google/callback?access_token=${encodeURIComponent(accessToken)}`,
    { cache: 'no-store' }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.jwt) {
    // The domain policy rejects here, and its message is the useful one - it
    // tells the person which addresses are accepted rather than "sign-in
    // failed", which would leave them retrying the same account forever.
    return fail(data?.error?.message ?? 'Could not sign you in with Google.');
  }

  // Google knows their name; Strapi does not ask for it. Fill it in before
  // deciding where to send them, so the first page they see greets them
  // properly rather than by an email prefix.
  await adoptGoogleName(accessToken, data.jwt);

  /**
   * Where to land.
   *
   * An account created through Google has NO password, so it can only ever be
   * signed into through Google. That is fine until Google sign-in is
   * unavailable or the person would rather type a password - at which point
   * there is no way in at all, and no reset to ask for, because there is
   * nothing to reset.
   *
   * So a passwordless account is offered the form for adding one. Offered, not
   * forced: the page has a skip. The check is "has no password" rather than "is
   * new", which means someone who skips is asked again next time and someone
   * who sets one is never asked again - both without storing a flag anywhere.
   *
   * A failure to answer is treated as "has a password", because being sent to
   * the dashboard is the harmless outcome; the alternative would push people
   * towards a form they may not need every time the backend hiccups.
   */
  const destination = (await hasNoPassword(data.jwt)) ? '/create-password' : '/dashboard';

  const response = NextResponse.redirect(new URL(destination, url.origin));
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

/** Asks the backend whether the account behind this token has a password yet. */
async function hasNoPassword(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${STRAPI_URL}/api/account/password-status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) return false;

    const body = await res.json();
    return body?.data?.hasPassword === false;
  } catch {
    return false;
  }
}

/**
 * Copies the person's name from Google onto their account, once.
 *
 * Strapi's Google provider does not do this. Its `authCallback` asks
 * `oauth2.googleapis.com/tokeninfo`, which answers with the email and nothing
 * else, and it derives a username from the part before the `@` - so an account
 * created through Google arrives with a handle like `jane.doe` and no name at
 * all, no matter that the consent screen asked for the `profile` scope.
 *
 * The userinfo endpoint DOES return the name, and we are holding a token scoped
 * for it (see seed/providers.js, which requests `email` and `profile`). So this
 * asks Google directly rather than patching the plugin's internals.
 *
 * Failure is deliberately silent. A name is a nicety; refusing to sign somebody
 * in because Google was slow to answer a second request would trade a working
 * login for a cosmetic one.
 */
async function adoptGoogleName(googleToken: string, jwt: string): Promise<void> {
  try {
    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${googleToken}` },
        cache: 'no-store',
      }
    );

    if (!profileRes.ok) return;

    const profile = await profileRes.json();
    const name = typeof profile?.name === 'string' ? profile.name.trim() : '';

    if (!name) return;

    // The backend only sets a name that is missing, so this cannot overwrite a
    // name the person has since edited on their account page.
    await fetch(`${STRAPI_URL}/api/account/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ name, onlyIfEmpty: true }),
      cache: 'no-store',
    });
  } catch {
    // Nothing to do: they are signed in, they simply have no name yet.
  }
}
