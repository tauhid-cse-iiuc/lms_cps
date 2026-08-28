import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Continue to your dashboard.
      </p>

      <AuthForm mode="login" />

      <p className="mt-6 text-sm text-slate-600">
        No account?{' '}
        <Link href="/register" className="font-medium text-slate-900 underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
