import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The landing hero.
 *
 * The entrance is CSS, not JavaScript, and that is a correctness decision. A
 * JavaScript reveal starts an element at opacity 0 and depends on a library
 * running to bring it back; if that never happens - blocked bundle, background
 * tab with requestAnimationFrame paused - the headline is simply invisible with
 * no error anywhere. A CSS keyframe's worst case is that it plays instantly.
 *
 * Being plain CSS also makes this a server component, shipping no JavaScript.
 */
export function Hero({
  signedIn,
  stats,
  children,
}: {
  signedIn: boolean;
  stats?: Array<{ value: string; label: string }>;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Three decorative layers, all aria-hidden - they carry no information.
          Depth here comes from stacking cheap effects rather than one heavy
          image: a colour field, a drifting highlight, and a faint dot grid. */}
      <div aria-hidden className="bg-aurora absolute inset-0 -z-20" />
      <div
        aria-hidden
        className="animate-drift absolute -left-32 -top-40 -z-20 h-[34rem] w-[34rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--color-brand-200), transparent 66%)',
        }}
      />
      <div aria-hidden className="bg-dots absolute inset-0 -z-10" />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <span
          className="animate-rise inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-micro font-medium text-brand-700 backdrop-blur"
          style={{ animationDelay: '0s' }}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-teal-500"
          />
          Four roles · enforced server-side
        </span>

        <h1
          className="animate-rise mt-5 max-w-2xl text-hero font-semibold leading-[1.08] tracking-tight sm:text-[3.5rem]"
          style={{ animationDelay: '0.08s' }}
        >
          Courses that know{' '}
          {/* The gradient sits on the text itself, so the emphasis is part of
              the sentence rather than a highlight pasted behind it. */}
          <span className="bg-gradient-to-br from-brand-500 via-violet-500 to-teal-500 bg-clip-text text-transparent">
            who you are.
          </span>
        </h1>

        <p
          className="animate-rise mt-5 max-w-xl text-lead leading-relaxed text-ink-600"
          style={{ animationDelay: '0.16s' }}
        >
          Sequential lessons, progress counted per student, quizzes marked by the
          server, and an answer key that never reaches the browser.
        </p>

        <div
          className="animate-rise mt-8 flex flex-wrap gap-3"
          style={{ animationDelay: '0.24s' }}
        >
          {signedIn ? (
            <Link
              href="/dashboard"
              className="group relative overflow-hidden rounded-lg bg-ink-900 px-5 py-2.5 text-small font-medium text-white shadow-lift transition-all hover:bg-ink-800 active:scale-[0.98]"
            >
              {/* A single light sweep. One moving element on the page is alive;
                  several competing ones are busy. */}
              <span
                aria-hidden
                className="animate-sheen absolute inset-y-0 -left-8 w-8 bg-white/20"
              />
              <span className="relative">Go to your dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="group relative overflow-hidden rounded-lg bg-ink-900 px-5 py-2.5 text-small font-medium text-white shadow-lift transition-all hover:bg-ink-800 active:scale-[0.98]"
              >
                <span
                  aria-hidden
                  className="animate-sheen absolute inset-y-0 -left-8 w-8 bg-white/20"
                />
                <span className="relative">Sign in</span>
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-ink-300 bg-white/80 px-5 py-2.5 text-small font-medium shadow-soft backdrop-blur transition-all hover:border-ink-400 hover:shadow-lift active:scale-[0.98]"
              >
                Create an account
              </Link>
            </>
          )}
          <Link
            href="/courses"
            className="rounded-lg px-5 py-2.5 text-small font-medium text-ink-600 transition-colors hover:bg-white/70 hover:text-ink-900"
          >
            Browse courses
          </Link>
        </div>

        {stats && stats.length > 0 && (
          <dl
            className="animate-rise mt-12 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-card border border-ink-200 bg-ink-200 shadow-soft"
            style={{ animationDelay: '0.3s' }}
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="bg-white/85 px-4 py-4 text-center backdrop-blur"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span
                    className="animate-pop block text-title font-semibold tabular-nums"
                    style={{ animationDelay: `${0.36 + i * 0.08}s` }}
                  >
                    {stat.value}
                  </span>
                  <span className="mt-0.5 block text-micro text-ink-500">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}

        {children && (
          <div className="animate-rise mt-14" style={{ animationDelay: '0.36s' }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
