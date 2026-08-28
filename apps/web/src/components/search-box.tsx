'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';

/**
 * The search input.
 *
 * Used both in the header and on the search page itself. It submits to /search
 * through the URL rather than holding results in local state, so a search is
 * linkable, survives a reload, and works with the back button - and the actual
 * querying stays on the server, where the caller's permissions are known.
 *
 * `compact` is the header variant: narrower, and it does not steal focus.
 */
export function SearchBox({
  initial,
  compact = false,
  autoFocus = false,
  onNavigate,
}: {
  initial: string;
  compact?: boolean;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep in step when the URL changes underneath - for instance when the reader
  // uses the back button after a search.
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const term = value.trim();
    if (!term) return;

    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(term)}`);
      onNavigate?.();
    });
  }

  return (
    <form onSubmit={submit} role="search" className={compact ? 'w-full' : 'w-full max-w-lg'}>
      <label htmlFor={compact ? 'nav-search' : 'page-search'} className="sr-only">
        Search courses, lessons and posts
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={compact ? 'nav-search' : 'page-search'}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={compact ? 'Search…' : 'Search courses, lessons and posts…'}
          className={`w-full rounded-xl border border-ink-300 bg-white pl-9 pr-3 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 ${
            compact ? 'py-1.5 text-small' : 'py-3 text-body'
          }`}
        />

        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 ${
            compact ? 'h-4 w-4' : 'h-4.5 w-4.5'
          }`}
        >
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="m13.5 13.5 3 3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        <span role="status" aria-live="polite" className="sr-only">
          {pending ? 'Searching' : ''}
        </span>
      </div>
    </form>
  );
}
