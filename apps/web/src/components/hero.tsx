'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * The landing hero.
 *
 * `useReducedMotion` reads the same OS setting the stylesheet honours. The CSS
 * rule shortens transitions globally, but JavaScript-driven animation is not a
 * CSS transition, so it has to be asked separately - otherwise this would keep
 * moving for exactly the people who asked it not to.
 */
export function Hero({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();

  // Each element starts slightly low and fades up, staggered. With reduced
  // motion the offset becomes zero, so it appears rather than travels.
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  });

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
        <motion.p
          {...rise(0)}
          className="text-small font-medium tracking-wide text-brand-600 uppercase"
        >
          Learning Management System
        </motion.p>

        <motion.h1
          {...rise(0.08)}
          className="mt-3 max-w-2xl text-hero font-semibold leading-[1.1] tracking-tight sm:text-[3.25rem]"
        >
          Courses that know who you are.
        </motion.h1>

        <motion.p {...rise(0.16)} className="mt-5 max-w-xl text-lead text-ink-600">
          Role-based access enforced on the server, sequential lessons, progress
          tracked per student, and quizzes that mark themselves.
        </motion.p>

        <motion.div {...rise(0.24)} className="mt-8 flex flex-wrap gap-3">
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
        </motion.div>

        {children && (
          <motion.div {...rise(0.32)} className="mt-14">
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}
