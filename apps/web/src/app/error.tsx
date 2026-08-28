'use client';

import { useEffect } from 'react';
import { PageShell, EmptyState, Button } from '@/components/ui';

/**
 * The last line of defence: an unhandled exception during render.
 *
 * It must be a client component - React needs to attach it as an error boundary
 * - and it is deliberately vague about what went wrong. An error message from
 * the server can carry internals a visitor should not see; the details go to the
 * console for whoever is debugging.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell width="narrow">
      <div className="pt-16">
        <EmptyState
          title="Something went wrong"
          description="This page could not be displayed. Trying again often works; if it does not, the backend may be restarting."
          action={
            <div className="flex justify-center gap-3">
              <Button onClick={reset}>Try again</Button>
              <Button href="/dashboard" variant="secondary">
                Dashboard
              </Button>
            </div>
          }
        />
        {error.digest && (
          <p className="mt-4 text-center text-micro text-ink-400">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </PageShell>
  );
}
