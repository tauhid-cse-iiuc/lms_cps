import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type AttemptSummary } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'My results' };

/**
 * Quiz results, stored and viewable later - which the brief asks for explicitly.
 *
 * The score shown here is the one recorded at the time of the attempt, not a
 * fresh grading. If an instructor corrects a wrong answer key next week, this
 * page keeps reporting what the student actually scored against the quiz as it
 * stood, which is the honest thing for a historical record to do.
 */
export default async function ResultsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const res = await apiGet<{ data: AttemptSummary[] }>('/api/my/quiz-attempts');
  const attempts = res.ok ? res.data.data : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">My results</h1>
        <Link href="/dashboard" className="text-sm underline">
          Dashboard
        </Link>
      </header>

      {!res.ok && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {res.error}
        </p>
      )}

      {attempts.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600">You have not taken any quizzes yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {attempts.map((attempt) => (
            <li
              key={attempt.documentId}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {attempt.quiz?.title ?? 'Quiz'}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {attempt.course?.title ? `${attempt.course.title} · ` : ''}
                  {attempt.submittedAt
                    ? new Date(attempt.submittedAt).toLocaleString()
                    : ''}
                </p>
              </div>
              <p className="shrink-0 text-sm">
                <span className="font-semibold">
                  {attempt.score}/{attempt.total}
                </span>
                <span className="ml-2 text-slate-500">{attempt.percentage}%</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
