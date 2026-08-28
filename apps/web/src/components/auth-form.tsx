'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';

type Mode = 'login' | 'register';

type FieldCheck = { valid: boolean; available: boolean; reason: string | null };
type Availability = { username?: FieldCheck; email?: FieldCheck };

const field =
  'mt-1.5 w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-small outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500';

/**
 * The sign-in and sign-up forms.
 *
 * Note where this posts: to THIS application, not to Strapi. The browser never
 * sees a token - the Route Handler on the other end puts it in an httpOnly
 * cookie. That is why there is nothing here that stores a credential.
 *
 * Sign-in takes a username OR an email in one field. Strapi's login already
 * matches either - it queries `$or: [{ email: identifier }, { username:
 * identifier }]` - so this is a labelling change rather than a feature. The
 * input is deliberately type="text": type="email" would make the browser reject
 * a perfectly valid username before the form was ever submitted.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  /* ---- live availability, sign-up only -------------------------------- */
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<Availability>({});
  const requestId = useRef(0);

  useEffect(() => {
    if (!isRegister) return;
    if (!username && !email) {
      setAvailability({});
      return;
    }

    // Debounced, or every keystroke is a request and the answers arrive out of
    // order. The id guard discards a slow reply that lands after a newer one -
    // without it an early "available" can overwrite a later "taken", which is
    // the wrong way for that race to resolve.
    const id = ++requestId.current;
    setChecking(true);

    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (username.trim()) params.set('username', username.trim());
      if (email.trim()) params.set('email', email.trim());

      try {
        const res = await fetch(`/api/account/availability?${params}`);
        const body = await res.json();
        if (id === requestId.current) setAvailability(body?.data ?? {});
      } catch {
        if (id === requestId.current) setAvailability({});
      } finally {
        if (id === requestId.current) setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, email, isRegister]);

  const usernameCheck = availability.username;
  const emailCheck = availability.email;

  // Only block on a definite "no". While a check is in flight the button stays
  // live: the server validates again on submit, so the worst case is an error
  // the person would have seen anyway, and a button that disables itself on
  // every keystroke feels broken.
  const blocked =
    isRegister &&
    ((usernameCheck && (!usernameCheck.valid || !usernameCheck.available)) ||
      (emailCheck && (!emailCheck.valid || !emailCheck.available)));

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
      {isRegister ? (
        <>
          <label className="block text-small font-medium text-ink-700">
            Username
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_name"
              aria-describedby="username-status"
              className={field}
            />
            <FieldStatus
              id="username-status"
              check={usernameCheck}
              checking={checking && Boolean(username)}
              okLabel="That username is free."
            />
          </label>

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
              aria-describedby="email-status"
              className={field}
            />
            <FieldStatus
              id="email-status"
              check={emailCheck}
              checking={checking && Boolean(email)}
              okLabel="That email is free."
              fallback="Gmail only for password sign-up — or use Google below for any address."
            />
          </label>
        </>
      ) : (
        <label className="block text-small font-medium text-ink-700">
          Email or username
          <input
            name="identifier"
            type="text"
            required
            autoComplete="username"
            className={field}
          />
        </label>
      )}

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
        disabled={busy || Boolean(blocked)}
        className="btn-gradient w-full rounded-lg px-4 py-2.5 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}

/**
 * The line under a field.
 *
 * `aria-live="polite"` so a screen reader hears the verdict without focus being
 * yanked mid-typing, and the status is a sentence rather than a colour, so it
 * survives being read aloud and works for anyone who cannot tell the red from
 * the green.
 */
function FieldStatus({
  id,
  check,
  checking,
  okLabel,
  fallback,
}: {
  id: string;
  check?: FieldCheck;
  checking: boolean;
  okLabel: string;
  fallback?: string;
}) {
  if (checking) {
    return (
      <span id={id} aria-live="polite" className="mt-1 block text-micro text-ink-400">
        Checking…
      </span>
    );
  }

  if (!check) {
    return fallback ? (
      <span id={id} className="mt-1 block text-micro font-normal text-ink-500">
        {fallback}
      </span>
    ) : (
      <span id={id} aria-live="polite" className="sr-only" />
    );
  }

  const good = check.valid && check.available;

  return (
    <span
      id={id}
      aria-live="polite"
      className={`mt-1 block text-micro font-normal ${
        good ? 'text-teal-600' : 'text-danger'
      }`}
    >
      {good ? okLabel : check.reason}
    </span>
  );
}
