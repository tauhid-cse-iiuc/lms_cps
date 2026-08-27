import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiGet, type Quiz } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { QuizForm } from '@/components/quiz-form';

/**
 * Taking a quiz.
 *
 * The questions arrive here already stripped of `correctIndex` by the backend,
 * for anyone who is not the owning instructor or staff. That is worth being
 * precise about: the answers are not hidden by this page, they were never sent
 * to it. Hiding them in the UI would leave them one DevTools Network tab away.
 */
export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const res = await apiGet<{ data: Quiz }>(`/api/quizzes/${id}?populate=questions`);

  if (!res.ok) {
    if (res.status === 403) {
      return (
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">This quiz is for enrolled students</h1>
          <Link href="/courses" className="mt-4 inline-block text-sm underline">
            Browse courses
          </Link>
        </main>
      );
    }
    notFound();
  }

  const quiz = res.data.data;
  const questions = quiz.questions ?? [];

  // Belt and braces. The backend strips the key, and this makes sure a future
  // change there cannot quietly start shipping it into the HTML.
  const safeQuestions = questions.map((q) => ({
    text: q.text,
    options: Array.isArray(q.options) ? q.options : [],
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{quiz.title}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {safeQuestions.length} question{safeQuestions.length === 1 ? '' : 's'}
      </p>

      {safeQuestions.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600">This quiz has no questions yet.</p>
      ) : (
        <QuizForm quizId={quiz.documentId} questions={safeQuestions} />
      )}
    </main>
  );
}
