import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-rise">
        <h1 className="text-display font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1.5 mb-7 text-small text-ink-500">
          New accounts start as students. Roles are assigned by an administrator,
          never chosen at sign-up.
        </p>

        <AuthForm mode="register" />

        <p className="mt-6 text-small text-ink-500">
          Already registered?{' '}
          <Link href="/login" className="font-medium text-ink-900 underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
