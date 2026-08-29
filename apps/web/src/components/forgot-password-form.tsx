'use client';

import { useState, type FormEvent } from 'react';

const field =
  'mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-small outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500';

/**
 * Requests a password reset email.
 *
 * The success message says "if that address has an account" rather than "sent",
 * and that wording is load-bearing. The backend answers identically for an
 * address it knows and one it does not, precisely so this form cannot be used
 * to test whether somebody is registered here; a confident "email sent!" would
 * hand that answer back through the interface after the API refused to give it.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      setError(data?.error ?? 'Something went wrong. Try again.');
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-soft">
        <h2 className="text-lead font-semibold">Check your inbox</h2>
        <p className="mt-2 text-small leading-relaxed text-ink-500">
          If{' '}
          <span className="font-medium text-ink-900">{email}</span> has an
          account, a reset link is on its way. It works once, and it stops
          working after it is used.
        </p>
        <p className="mt-3 text-micro leading-relaxed text-ink-400">
          Signed up with Google and never set a password? Sign in with Google
          instead — there is no password on that account to reset yet.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-small font-medium text-ink-700">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
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

      <button
        type="submit"
        disabled={busy}
        className="btn-gradient w-full rounded-lg px-4 py-2.5 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Email me a reset link'}
      </button>
    </form>
  );
}
