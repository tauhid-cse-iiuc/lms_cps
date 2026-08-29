'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PasswordRequirements } from '@/components/password-requirements';
import { passwordIsValid } from '@/lib/password-policy';

const field =
  'mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-small outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500';

/**
 * Chooses a new password. Used by two flows that differ only in what they send.
 *
 *  - the reset page, which carries a `code` from an emailed link and has no
 *    session yet
 *  - the create-password page, which has a session and no password
 *
 * They are one component because the RULES have to match: the same minimum
 * length, the same confirmation field, the same refusal to submit a mismatch.
 * Two copies drift, and the drift shows up as one flow accepting a password the
 * other would have rejected.
 *
 * The confirmation field is checked here AND on the server. This copy exists to
 * catch the typo before a round trip, not to be trusted - a form is a
 * convenience, never a validation boundary.
 */
export function NewPasswordForm({
  endpoint,
  extra,
  submitLabel,
  busyLabel,
  redirectTo,
}: {
  endpoint: string;
  extra?: Record<string, string>;
  submitLabel: string;
  busyLabel: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unmetRules = password.length > 0 && !passwordIsValid(password);
  const mismatch = confirmation.length > 0 && password !== confirmation;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...extra,
        password,
        passwordConfirmation: confirmation,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? 'Something went wrong. Try again.');
      setBusy(false);
      return;
    }

    router.push(redirectTo);
    // Session cookies may have just changed on this response, and the server has
    // not rendered anything with them yet.
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-small font-medium text-ink-700">
        New password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-requirements"
          className={field}
        />
        <PasswordRequirements value={password} id="password-requirements" />
      </label>

      <label className="block text-small font-medium text-ink-700">
        Confirm new password
        <input
          name="passwordConfirmation"
          type="password"
          required
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          aria-describedby="confirmation-status"
          className={field}
        />
        <span
          id="confirmation-status"
          aria-live="polite"
          className={`mt-1 block text-micro font-normal ${
            mismatch ? 'text-danger' : 'sr-only'
          }`}
        >
          {mismatch ? 'The two passwords do not match.' : ''}
        </span>
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
        disabled={busy || unmetRules || mismatch || !password}
        className="btn-gradient w-full rounded-lg px-4 py-2.5 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}
