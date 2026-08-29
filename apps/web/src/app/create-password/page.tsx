import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import { NewPasswordForm } from '@/components/new-password-form';

export const metadata = { title: 'Add a password' };

type PasswordStatus = { provider: string; hasPassword: boolean };

/**
 * Offered once, to an account created through Google.
 *
 * Such an account has no password at all, so it can only ever be reached
 * through Google - and if Google sign-in is unavailable, or the person later
 * prefers a password, there is no way in. Setting one here makes both routes
 * work for the same account.
 *
 * It is a page rather than a forced step. Skipping is a legitimate choice: the
 * account already works, and a Google-only account is a perfectly reasonable
 * thing to keep. The redirect that sends people here fires only while there is
 * no password, so anyone who skips is asked again next time they sign in with
 * Google - and stops being asked the moment they set one.
 *
 * Anyone who already has a password is sent to the account page instead, where
 * changing it requires the current one. That is the same rule the backend
 * enforces; checking here just means they see the right form rather than an
 * error.
 */
export default async function CreatePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const res = await apiGet<{ data: PasswordStatus }>('/api/account/password-status');
  if (res.ok && res.data.data.hasPassword) redirect('/account');

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-rise">
        <h1 className="text-display font-semibold tracking-tight">
          Add a password
        </h1>
        <p className="mt-1.5 mb-7 text-small leading-relaxed text-ink-500">
          You signed in with Google, so{' '}
          <span className="font-medium text-ink-900">{user.email}</span> has no
          password yet. Add one and you can use either route next time.
        </p>

        <NewPasswordForm
          endpoint="/api/auth/set-password"
          submitLabel="Save password"
          busyLabel="Saving…"
          redirectTo="/dashboard"
        />

        <p className="mt-6 text-center text-small text-ink-500">
          <Link href="/dashboard" className="font-medium text-ink-900 underline">
            Skip for now
          </Link>
        </p>
      </div>
    </main>
  );
}
