import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col justify-center px-6 py-12">
      <div className="animate-rise">
        <h1 className="text-display font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 mb-7 text-small text-ink-500">
          Continue to your dashboard.
        </p>

        <AuthForm mode="login" />

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
