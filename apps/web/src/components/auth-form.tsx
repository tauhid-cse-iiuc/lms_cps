'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';

type Mode = 'login' | 'register';

const field =
  'mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-small outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500';

/**
 * The sign-in and sign-up forms are the same form with a different field list.
 *
 * Note where this posts: to THIS application, not to Strapi. The browser never
 * sees a token - the Route Handler on the other end puts it in an httpOnly
 * cookie. That is why there is nothing here that stores a credential.
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isRegister && (
        <label className="block text-small font-medium text-ink-700">
          Name
          <input name="username" type="text" required autoComplete="name" className={field} />
        </label>
      )}

      <label className="block text-small font-medium text-ink-700">
        Email
        <input
          name={isRegister ? 'email' : 'identifier'}
          type="email"
          required
          autoComplete="email"
          className={field}
        />
      </label>

      <label className="block text-small font-medium text-ink-700">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          className={field}
        />
        {isRegister && (
          <span className="mt-1 block text-micro font-normal text-ink-500">
            At least 8 characters.
          </span>
        )}
      </label>

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-small text-danger"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-small font-medium text-white transition-all hover:bg-ink-800 active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
