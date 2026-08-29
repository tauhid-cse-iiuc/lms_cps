import { notFound, redirect } from 'next/navigation';
import { apiGet, type Quiz } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AssessmentRunner } from '@/components/assessment-runner';
import { PageShell, PageHeader, EmptyState, Button } from '@/components/ui';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiGet<{ data: Quiz }>(`/api/quizzes/${id}`);
  return { title: res.ok ? res.data.data.title : 'Quiz' };
}

/**
 * Taking a quiz.
 *
 * The questions arrive here already stripped of `correctIndex` by the backend,
 * for anyone who is not the owning instructor or staff. Worth being precise
 * about: the answers are not hidden by this page, they were never sent to it.
 * Hiding them client-side would leave them one Network tab away.
 */
export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  /**
   * Taking a quiz is Student-only in the permission matrix, and the backend
   * enforces it: quiz.start answers 403 for every other role.
   *
   * Staff can still READ a quiz, so without this check the page would load,
   * render the whole assessment, and fail only when the timer was requested -
   * an instructor would sit down to a quiz that refuses to start. Saying so up
   * front, and pointing at the editor, is the honest version.
   */
  if (user.role.type !== 'student') {
    return (
      <PageShell width="narrow">
        <div className="pt-12">
          <EmptyState
            title="Quizzes are taken by students"
            description="Your role can write and edit this quiz, but not sit it. Open it in the course editor to change its questions."
            action={<Button href="/manage/courses">Your courses</Button>}
          />
        </div>
      </PageShell>
    );
  }

  const res = await apiGet<{ data: Quiz }>(`/api/quizzes/${id}?populate=questions`);

  if (!res.ok) {
    if (res.status === 403) {
      return (
        <PageShell width="narrow">
          <div className="pt-12">
            <EmptyState
              title="This quiz is for enrolled students"
              description="Enrol in the course to take its quizzes."
              action={<Button href="/courses">Browse courses</Button>}
            />
          </div>
        </PageShell>
      );
    }
    notFound();
  }

  const quiz = res.data.data;

  // Belt and braces. The backend strips the key; this makes sure a future change
  // there cannot quietly start shipping it into the HTML.
  const questions = (quiz.questions ?? []).map((q) => ({
    text: q.text,
    options: Array.isArray(q.options) ? q.options : [],
  }));

  return (
    <PageShell width="narrow">
      <PageHeader
        title={quiz.title}
        description={`${questions.length} question${questions.length === 1 ? '' : 's'} · timed · marked by the server`}
      />

      {questions.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No questions yet"
            description="This quiz has not been written yet."
          />
        </div>
      ) : (
        <AssessmentRunner
          quizId={quiz.documentId}
          quizTitle={quiz.title}
          questions={questions}
        />
      )}
    </PageShell>
  );
}
