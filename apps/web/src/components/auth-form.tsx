'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type Mode = 'login' | 'register';

/**
 * The sign-in and sign-up forms are the same form with a different field list,
 * so they share one component.
 *
 * Note where this posts: to THIS application, not to Strapi. The browser never
 * sees a token. The route handler on the other end puts it in an httpOnly
 * cookie, which is why there is nothing here that stores a credential.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = isRegister
      ? {
          username: String(form.get('username') ?? ''),
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }
      : {
          identifier: String(form.get('identifier') ?? ''),
          password: String(form.get('password') ?? ''),
        };

    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? 'Something went wrong. Try again.');
      setBusy(false);
      return;
    }

    router.push('/dashboard');
    // The cookie was set on the response to the fetch above, so the server has
    // not yet rendered anything with it. Without this the dashboard would render
    // from a cached, signed-out view.
    router.refresh();
  }

  const field =
    'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isRegister && (
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input name="username" type="text" required autoComplete="name" className={field} />
        </label>
      )}

      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          name={isRegister ? 'email' : 'identifier'}
          type="email"
          required
          autoComplete="email"
          className={field}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          className={field}
        />
      </label>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
