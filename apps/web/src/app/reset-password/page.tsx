import Link from 'next/link';
import { NewPasswordForm } from '@/components/new-password-form';

export const metadata = { title: 'Set a new password' };

/**
 * The page the reset email links to.
 *
 * The code arrives in the query string because that is the only place an email
 * link can carry it. It is read on the SERVER and handed to the form as a prop,
 * so it is submitted in a request body rather than being appended to another
 * URL - the code is a bearer credential for the account, and query strings end
 * up in logs, history and Referer headers.
 *
 * Deliberately not behind the signed-in redirect in the middleware: a person
 * resetting a password may well still have a live session in that browser, and
 * bouncing them to the dashboard would make the link they were sent do nothing.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-rise">
        <h1 className="text-display font-semibold tracking-tight">
          Set a new password
        </h1>

        {code ? (
          <>
            <p className="mt-1.5 mb-7 text-small text-ink-500">
              Choose a new password. You will be signed in straight afterwards.
            </p>

            <NewPasswordForm
              endpoint="/api/auth/reset-password"
              extra={{ code }}
              submitLabel="Set password and sign in"
              busyLabel="Setting…"
              redirectTo="/dashboard"
            />
          </>
        ) : (
          <>
            <p className="mt-1.5 mb-7 text-small text-ink-500">
              This link is missing its reset code, so there is nothing to set a
              password against. Reset links can only be used once — if you have
              already used this one, ask for another.
            </p>

            <Link
              href="/forgot-password"
              className="btn-gradient block rounded-lg px-4 py-2.5 text-center text-small font-semibold text-white shadow-glow"
            >
              Send a new link
            </Link>
          </>
        )}

        <p className="mt-6 text-small text-ink-500">
          <Link href="/login" className="font-medium text-ink-900 underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
