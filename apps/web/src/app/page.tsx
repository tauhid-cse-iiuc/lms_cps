import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">LMS</h1>
      <p className="mt-3 text-slate-600">
        Courses, lessons, enrolment, progress tracking and auto-graded quizzes,
        with four roles enforced on the backend.
      </p>

      <p className="mt-10 text-sm text-slate-500">
        Under construction. Deployment wiring can be verified at{' '}
        <Link
          href="/health"
          className="font-medium text-slate-900 underline underline-offset-4"
        >
          /health
        </Link>
        .
      </p>
    </main>
  );
}
