/**
 * Every call to the Strapi backend goes through this file.
 *
 * Two URLs, on purpose:
 *
 *   STRAPI_URL             - read on the SERVER only. Never shipped to the browser.
 *   NEXT_PUBLIC_STRAPI_URL - read in the BROWSER. Next.js inlines any variable
 *                            prefixed with NEXT_PUBLIC_ into the JavaScript bundle
 *                            it sends to visitors, so anything named that way is
 *                            effectively public. Never put a secret behind that
 *                            prefix.
 *
 * They usually hold the same value. Keeping them separate means server-side code
 * can later be pointed at a private network address while the browser keeps using
 * the public one.
 */

/** Base URL for server-side calls (Server Components, Route Handlers). */
export const STRAPI_URL =
  process.env.STRAPI_URL ?? 'http://localhost:1337';

/** Base URL for browser-side calls. Safe to expose. */
export const PUBLIC_STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';

export type HealthResult =
  | { ok: true; status: number; elapsedMs: number }
  | { ok: false; status: number | null; elapsedMs: number; error: string };

/**
 * Ask Strapi whether it is alive, from the server.
 *
 * `/_health` is built into Strapi and answers 204 No Content when the app has
 * finished booting. It touches no database tables and needs no auth, which makes
 * it the right thing to probe: it proves the app is up without depending on any
 * of our own content existing yet.
 */
export async function checkStrapiHealth(): Promise<HealthResult> {
  const startedAt = performance.now();

  try {
    const res = await fetch(`${STRAPI_URL}/_health`, {
      // Never serve a cached answer for a liveness check - a stale "healthy" is
      // worse than no answer. Without this Next.js may cache the fetch at build
      // time and the page would report health from whenever it was compiled.
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const elapsedMs = Math.round(performance.now() - startedAt);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        elapsedMs,
        error: `Strapi answered ${res.status} ${res.statusText}`,
      };
    }

    return { ok: true, status: res.status, elapsedMs };
  } catch (err) {
    return {
      ok: false,
      status: null,
      elapsedMs: Math.round(performance.now() - startedAt),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
