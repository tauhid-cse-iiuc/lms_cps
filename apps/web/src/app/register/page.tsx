import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        New accounts start as students.
      </p>

      <AuthForm mode="register" />

      <p className="mt-6 text-sm text-slate-600">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
