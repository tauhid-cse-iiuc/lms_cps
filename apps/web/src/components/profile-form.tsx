'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const field =
  'w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-small outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500';

/**
 * Edits the display name.
 *
 * `router.refresh()` on success rather than local state, because the name is
 * rendered by server components all over the application - the header, the
 * dashboard greeting, the byline on every course this person owns. Updating
 * only this form would leave the rest of the page addressing them by their old
 * name until they navigated.
 */
export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = value.trim() === name.trim();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);

    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    });

    const data = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      setError(data?.error ?? 'Could not save your name.');
      return;
    }

    setDone(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
      <label className="min-w-0 flex-1 text-small font-medium text-ink-700">
        {/* The row this sits in is already headed "Name", so a second visible
            label would just be the same word twice. Kept for screen readers,
            which do not see the heading as this input's label. */}
        <span className="sr-only">Full name</span>
        <input
          name="name"
          type="text"
          required
          maxLength={80}
          autoComplete="name"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDone(false);
          }}
          className={field}
        />
      </label>

      <button
        type="submit"
        disabled={busy || unchanged || !value.trim()}
        className="btn-gradient shrink-0 rounded-lg px-4 py-2.5 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save'}
      </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-small text-danger"
        >
          {error}
        </p>
      )}

      {done && (
        <p
          role="status"
          className="rounded-lg border border-teal-100 bg-teal-50 px-3.5 py-2.5 text-small text-teal-600"
        >
          Name saved.
        </p>
      )}

    </form>
  );
}
