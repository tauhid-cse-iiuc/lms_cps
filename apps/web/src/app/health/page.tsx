/**
 * Deployment wiring check.
 *
 * Its only job is to prove the frontend on Vercel can reach the backend on
 * Railway, from both sides of the wire: server-to-server, and browser-to-server.
 * Those two paths fail for different reasons, so testing only one hides bugs.
 *
 * This page is a diagnostic, not a feature. It stays for the walkthrough video and
 * then has no reason to exist.
 */

import { checkStrapiHealth, STRAPI_URL } from '@/lib/strapi';
import { BrowserCorsCheck } from './browser-cors-check';

// Never prerender this at build time - a health check baked into a build tells you
// how things were when the build ran, which is not what anybody wants to know.
export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const health = await checkStrapiHealth();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Connection check</h1>
      <p className="mt-2 text-slate-600">
        Frontend on Vercel, backend on Railway. Both directions tested separately.
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-lg border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Server &rarr; Strapi</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ran on the server when this page was requested. No browser involved, so
            CORS does not apply here.
          </p>

          {health.ok ? (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <strong>Reachable.</strong> HTTP {health.status} in {health.elapsedMs} ms.
            </p>
          ) : (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
              <strong>Unreachable.</strong> {health.error}
              {health.status === null && (
                <>
                  {' '}
                  Check that <code>STRAPI_URL</code> is set correctly on Vercel.
                </>
              )}
            </p>
          )}

          <p className="mt-3 font-mono text-xs break-all text-slate-400">
            {STRAPI_URL}/_health
          </p>
        </div>

        <BrowserCorsCheck />
      </div>

      <p className="mt-8 text-sm text-slate-500">
        If the first check passes and the second is blocked, the backend is healthy
        and the CORS allow-list is wrong. Those are separate problems with separate
        fixes, which is why they are separate checks.
      </p>
    </main>
  );
}
