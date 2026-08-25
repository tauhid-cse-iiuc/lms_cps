'use client';

/**
 * This component runs in the visitor's browser, not on our server.
 *
 * That distinction is the whole point of it. The check above it on the page is a
 * server-to-server call, which no browser is involved in and therefore no CORS
 * rule applies to. This one is a real browser request to a different origin, so
 * it is the only half of the page that actually tests CORS.
 */

import { useState } from 'react';
import { PUBLIC_STRAPI_URL } from '@/lib/strapi';

type State =
  | { phase: 'idle' }
  | { phase: 'running' }
  | { phase: 'allowed'; status: number; elapsedMs: number }
  | { phase: 'blocked'; error: string };

export function BrowserCorsCheck() {
  const [state, setState] = useState<State>({ phase: 'idle' });

  async function run() {
    setState({ phase: 'running' });
    const startedAt = performance.now();

    try {
      const res = await fetch(`${PUBLIC_STRAPI_URL}/_health`, {
        cache: 'no-store',
      });
      setState({
        phase: 'allowed',
        status: res.status,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
    } catch (err) {
      // A CORS refusal surfaces here as an opaque "Failed to fetch". The browser
      // deliberately hides the reason so a page cannot use failures to probe
      // another site. The real explanation is only in the devtools console.
      setState({
        phase: 'blocked',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900">Browser &rarr; Strapi</h2>
          <p className="mt-1 text-sm text-slate-600">
            Runs in your browser. This is the half that CORS governs.
          </p>
        </div>
        <button
          onClick={run}
          disabled={state.phase === 'running'}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {state.phase === 'running' ? 'Checking…' : 'Run check'}
        </button>
      </div>

      {state.phase === 'allowed' && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <strong>Allowed.</strong> HTTP {state.status} in {state.elapsedMs} ms. This
          origin is in Strapi&rsquo;s <code>CORS_ORIGINS</code> list.
        </p>
      )}

      {state.phase === 'blocked' && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
          <strong>Blocked.</strong> <code>{state.error}</code> &mdash; this origin is
          most likely missing from <code>CORS_ORIGINS</code> on Railway. Open the
          devtools console for the browser&rsquo;s real explanation.
        </p>
      )}

      <p className="mt-3 font-mono text-xs break-all text-slate-400">
        {PUBLIC_STRAPI_URL}/_health
      </p>
    </div>
  );
}
