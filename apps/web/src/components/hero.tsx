import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The landing hero, on a dark ground.
 *
 * The previous version was tinted white with 4%-opacity texture, which is
 * invisible unless you already know it is there. A dark band does more for
 * perceived depth than any amount of subtle layering on white, because it gives
 * the rest of the page something to contrast against - and saturated light
 * reads far stronger over dark than over white.
 *
 * The entrance is CSS, not JavaScript. A JavaScript reveal starts an element at
 * opacity 0 and depends on a library running to bring it back; if that never
 * happens - blocked bundle, background tab with requestAnimationFrame paused -
 * the headline is invisible with no error anywhere. A CSS keyframe's worst case
 * is that it plays instantly. It also keeps this a server component.
 */
export function Hero({
  signedIn,
  highlights,
  children,
}: {
  signedIn: boolean;
  /** Short capability statements. Never counts of rows in a table. */
  highlights?: Array<{ title: string; body: string }>;
  children?: ReactNode;
}) {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-night-950 text-white">
        {/* Layered light. All aria-hidden - none of it carries information. */}
        <div
          aria-hidden
          className="bg-aurora-night animate-hue absolute inset-0 -z-20"
        />
        <div
          aria-hidden
          className="animate-drift absolute -right-40 -top-52 -z-20 h-[42rem] w-[42rem] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, var(--color-violet-500), transparent 65%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="mx-auto max-w-5xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28">
          <span
            className="animate-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-micro font-medium text-white/90 backdrop-blur"
            style={{ animationDelay: '0s' }}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_var(--color-teal-500)]"
            />
            Four roles · enforced server-side
          </span>

          <h1
            className="animate-rise mt-6 max-w-3xl text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-hero sm:leading-[1.02] lg:text-mega"
            style={{ animationDelay: '0.08s' }}
          >
            Courses that know
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-violet-500 to-teal-500 bg-clip-text text-transparent">
              who you are.
            </span>
          </h1>

          <p
            className="animate-rise mt-6 max-w-xl text-lead leading-relaxed text-white/70"
            style={{ animationDelay: '0.16s' }}
          >
            Sequential lessons, progress counted per student, quizzes marked by
            the server, and an answer key that never reaches the browser.
          </p>

          <div
            className="animate-rise mt-9 flex flex-wrap gap-3"
            style={{ animationDelay: '0.24s' }}
          >
            {signedIn ? (
              <Link
                href="/dashboard"
                className="btn-gradient rounded-xl px-6 py-3 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.98]"
              >
                Go to your dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-gradient rounded-xl px-6 py-3 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.98]"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-small font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 active:scale-[0.98]"
                >
                  Create an account
                </Link>
              </>
            )}
            <Link
              href="/courses"
              className="rounded-xl px-6 py-3 text-small font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Browse courses
            </Link>
          </div>

          {highlights && highlights.length > 0 && (
            <ul
              className="animate-rise mt-14 grid gap-4 sm:grid-cols-3"
              style={{ animationDelay: '0.3s' }}
            >
              {highlights.map((item, i) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-5 backdrop-blur"
                  style={{ animation: `pop 0.4s var(--ease-out-soft) ${0.36 + i * 0.08}s both` }}
                >
                  <p className="text-small font-semibold">{item.title}</p>
                  <p className="mt-1.5 text-small leading-relaxed text-white/60">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fades the dark band into the page below instead of stopping at a hard
            edge, which would read as two unrelated pages stacked. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-canvas"
        />
      </section>

      {children && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">{children}</section>
      )}
    </>
  );
}
