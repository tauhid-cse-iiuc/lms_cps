import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold">Learning Management System</h1>
      <p className="mt-3 text-slate-600">
        Courses, lessons and quizzes with role-based access, progress tracking and
        automatic grading.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Go to your dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium"
            >
              Create an account
            </Link>
          </>
        )}
        <Link
          href="/courses"
          className="rounded border border-slate-300 px-4 py-2 text-sm font-medium"
        >
          Browse courses
        </Link>
        <Link
          href="/blog"
          className="rounded border border-slate-300 px-4 py-2 text-sm font-medium"
        >
          Blog
        </Link>
      </div>
    </main>
  );
}
