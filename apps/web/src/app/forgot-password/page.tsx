import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export const metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-rise">
        <h1 className="text-display font-semibold tracking-tight">
          Forgot your password?
        </h1>
        <p className="mt-1.5 mb-7 text-small text-ink-500">
          Enter the address on your account and we will email you a link to set
          a new one.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-small text-ink-500">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-ink-900 underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
