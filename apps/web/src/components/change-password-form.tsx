'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const field =
  'mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-small outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500';

/**
 * Change password.
 *
 * Posts to this application's own route handler, not to Strapi. That handler
 * holds the access token and, crucially, writes back the NEW token pair Strapi
 * issues - changing a password revokes the old refresh token, so a form that
 * ignored the response would leave the browser holding dead credentials and
 * eject the user at the next renewal with nothing to explain it.
 */
export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);

    const form = new FormData(event.currentTarget);
    const formEl = event.currentTarget;

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: String(form.get('currentPassword') ?? ''),
        password: String(form.get('password') ?? ''),
        passwordConfirmation: String(form.get('passwordConfirmation') ?? ''),
      }),
    });

    const data = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      setError(data?.error ?? 'Could not change your password.');
      return;
    }

    formEl.reset();
    setDone(true);
    // The cookies were replaced on the response above; refresh so anything
    // server-rendered is reading the new session.
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <label className="block text-small font-medium text-ink-700">
        Current password
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
      </label>

      <label className="block text-small font-medium text-ink-700">
        New password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={field}
        />
        <span className="mt-1 block text-micro font-normal text-ink-500">
          At least 8 characters.
        </span>
      </label>

      <label className="block text-small font-medium text-ink-700">
        Confirm new password
        <input
          name="passwordConfirmation"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={field}
        />
      </label>

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
          Password changed.
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-gradient rounded-xl px-5 py-2.5 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
