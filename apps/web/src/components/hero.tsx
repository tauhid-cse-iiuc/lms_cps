import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The landing hero.
 *
 * The entrance is a CSS animation, not a JavaScript one, and that is a
 * correctness decision rather than a preference.
 *
 * A JavaScript reveal starts an element at opacity 0 and depends on a library
 * running to bring it back. If that never happens - the bundle is slow, a script
 * is blocked, the tab is in the background and requestAnimationFrame is paused -
 * the headline of the site is simply invisible, with no error anywhere.
 *
 * A CSS keyframe has no such dependency. It runs from the stylesheet, so the
 * worst case is that it plays instantly rather than not at all. Nothing here can
 * leave text permanently unreadable.
 *
 * Being plain CSS also means this is a server component and ships no JavaScript.
 */
export function Hero({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative wash. aria-hidden because it carries no information. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60rem 30rem at 15% -10%, var(--color-brand-50), transparent 60%)',
        }}
      />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <p
          className="animate-rise text-small font-medium uppercase tracking-wide text-brand-600"
          style={{ animationDelay: '0s' }}
        >
          Learning Management System
        </p>

        <h1
          className="animate-rise mt-3 max-w-2xl text-hero font-semibold leading-[1.1] tracking-tight sm:text-[3.25rem]"
          style={{ animationDelay: '0.08s' }}
        >
          Courses that know who you are.
        </h1>

        <p
          className="animate-rise mt-5 max-w-xl text-lead text-ink-600"
          style={{ animationDelay: '0.16s' }}
        >
          Role-based access enforced on the server, sequential lessons, progress
          tracked per student, and quizzes that mark themselves.
        </p>

        <div
          className="animate-rise mt-8 flex flex-wrap gap-3"
          style={{ animationDelay: '0.24s' }}
        >
          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-ink-900 px-5 py-2.5 text-small font-medium text-white transition-all hover:bg-ink-800 active:scale-[0.98]"
            >
              Go to your dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg bg-ink-900 px-5 py-2.5 text-small font-medium text-white transition-all hover:bg-ink-800 active:scale-[0.98]"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-ink-300 bg-white px-5 py-2.5 text-small font-medium transition-all hover:border-ink-400 hover:bg-ink-50 active:scale-[0.98]"
              >
                Create an account
              </Link>
            </>
          )}
          <Link
            href="/courses"
            className="rounded-lg px-5 py-2.5 text-small font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            Browse courses
          </Link>
        </div>

        {children && (
          <div className="animate-rise mt-14" style={{ animationDelay: '0.32s' }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
