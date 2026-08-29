import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { GoogleButton } from '@/components/google-button';
import { LegalConsent } from '@/components/legal-consent';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirmed?: string }>;
}) {
  // `confirmed` is set by the backend's redirect after an emailed confirmation
  // link is clicked. Without it, confirming would drop the person on a plain
  // sign-in form with no sign that anything had happened.
  const { error, confirmed } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-rise">
        <h1 className="text-display font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 mb-7 text-small text-ink-500">
          Continue to your dashboard.
        </p>

        {confirmed && !error && (
          <p className="mb-5 rounded-lg border border-teal-500/25 bg-teal-500/5 px-3.5 py-2.5 text-small text-teal-700">
            Your email is confirmed. Sign in to continue.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-small text-danger"
          >
            {error}
          </p>
        )}

        <AuthForm mode="login" />

        <p className="mt-3 text-right text-small">
          <Link
            href="/forgot-password"
            className="font-medium text-ink-500 underline underline-offset-2 transition-colors hover:text-ink-900"
          >
            Forgot your password?
          </Link>
        </p>

        <GoogleButton label="Sign in with Google" />

        <LegalConsent />

        <p className="mt-6 text-small text-ink-500">
          No account?{' '}
          <Link href="/register" className="font-medium text-ink-900 underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
