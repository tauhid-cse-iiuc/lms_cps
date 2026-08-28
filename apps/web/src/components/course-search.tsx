'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

/**
 * Search box for the catalogue.
 *
 * It drives the URL rather than local state, so a search is linkable, survives a
 * reload, and works with the back button. The actual filtering happens on the
 * server - see the page.
 *
 * Typing is debounced by 300ms. Without it every keystroke would be a request,
 * and on a slow connection the results would arrive out of order and settle on
 * whichever response happened to be last.
 */
export function CourseSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    // Do not fire on mount - the server has already rendered these results.
    if (first.current) {
      first.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set('q', value.trim());
      else next.delete('q');

      startTransition(() => {
        router.replace(next.toString() ? `/courses?${next}` : '/courses', {
          scroll: false,
        });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, params, router]);

  return (
    <div className="relative w-full sm:w-64">
      <label htmlFor="course-search" className="sr-only">
        Search courses
      </label>
      <input
        id="course-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search courses…"
        className="w-full rounded-lg border border-ink-300 bg-white py-2 pl-9 pr-3 text-small outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500"
      />
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      {/* Announced to screen readers without stealing focus. */}
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? 'Searching' : ''}
      </span>
    </div>
  );
}
