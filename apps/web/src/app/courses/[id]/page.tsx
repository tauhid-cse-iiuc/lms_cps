import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet, type Course, type Enrollment, type Progress, type Quiz } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { ProgressBar } from '@/components/progress-bar';
import { EnrollButton } from '@/components/enroll-button';
import { PageShell, Card, Badge, Button } from '@/components/ui';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiGet<{ data: Course }>(`/api/courses/${id}`);
  return { title: res.ok ? res.data.data.title : 'Course' };
}

/**
 * One course.
 *
 * What this page shows depends on who is looking, and the differences are not
 * cosmetic - a signed-out visitor genuinely cannot fetch the lessons, because
 * the backend refuses. The UI is arranged to match what the API will allow
 * rather than to hide buttons over data it has already been handed.
 */
export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const courseRes = await apiGet<{ data: Course }>(`/api/courses/${id}?populate=owner`);
  if (!courseRes.ok || !courseRes.data?.data) notFound();
  const course = courseRes.data.data;

  let enrolled = false;
  let progress: Progress | null = null;

  if (user) {
    const mine = await apiGet<{ data: Enrollment[] }>('/api/my/enrollments');
    if (mine.ok) enrolled = mine.data.data.some((e) => e.course?.documentId === id);

    if (enrolled) {
      const p = await apiGet<{ data: Progress }>(`/api/courses/${id}/progress`);
      if (p.ok) progress = p.data.data;
    }
  }

  const isOwner = Boolean(user && course.owner?.id === user.id);
  const isStaff = Boolean(user && ['admin', 'content-manager'].includes(user.role.type));

  let quizzes: Quiz[] = [];
  if (enrolled || isOwner || isStaff) {
    const q = await apiGet<{ data: Quiz[] }>(
      `/api/quizzes?filters[course][documentId][$eq]=${id}`
    );
    if (q.ok) quizzes = q.data.data;
  }

  const nextLesson = progress?.lessons.find((l) => !l.completed);

  return (
    <PageShell>
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-small text-ink-500 transition-colors hover:text-ink-900"
      >
        <span aria-hidden>&larr;</span> All courses
      </Link>

      <header className="animate-rise mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {enrolled && <Badge tone="success">Enrolled</Badge>}
          {isOwner && <Badge>Your course</Badge>}
          {isStaff && !isOwner && <Badge tone="muted">Staff view</Badge>}
        </div>

        <h1 className="mt-3 text-display font-semibold tracking-tight">
          {course.title}
        </h1>
        {course.owner?.username && (
          <p className="mt-1 text-small text-ink-500">by {course.owner.username}</p>
        )}
        {course.description && (
          <p className="mt-4 text-lead leading-relaxed text-ink-700">
            {course.description}
          </p>
        )}
      </header>

      {!user && (
        <Card className="mt-8 p-5">
          <p className="text-small text-ink-600">
            <Link href="/login" className="font-medium text-ink-900 underline">
              Sign in
            </Link>{' '}
            to enrol and read the lessons. The catalogue is public; the material is not.
          </p>
        </Card>
      )}

      {user && !enrolled && !isOwner && !isStaff && (
        <div className="animate-rise mt-8">
          <EnrollButton courseId={course.documentId} />
        </div>
      )}

      {progress && (
        <section className="animate-rise mt-10" style={{ animationDelay: '0.05s' }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-title font-semibold">Lessons</h2>
            {nextLesson && (
              <Button href={`/learn/${course.documentId}/${nextLesson.documentId}`}>
                {progress.completedLessons === 0 ? 'Start course' : 'Continue'}
              </Button>
            )}
          </div>

          <div className="mt-4">
            <ProgressBar
              percentage={progress.percentage}
              label={`${progress.completedLessons} of ${progress.totalLessons} lessons complete`}
            />
          </div>

          <ol className="mt-5 space-y-2">
            {progress.lessons.map((lesson, i) => (
              <li
                key={lesson.documentId}
                className="animate-rise"
                style={{ animationDelay: `${0.1 + Math.min(i, 10) * 0.04}s` }}
              >
                <Link href={`/learn/${course.documentId}/${lesson.documentId}`}>
                  <Card
                    interactive
                    className="flex items-center gap-4 px-4 py-3.5"
                  >
                    <span
                      aria-hidden
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-micro font-semibold transition-colors ${
                        lesson.completed
                          ? 'bg-success text-white'
                          : 'border border-ink-300 text-ink-400'
                      }`}
                    >
                      {lesson.completed ? '✓' : lesson.order}
                    </span>

                    <span className="min-w-0 flex-1 text-small">{lesson.title}</span>

                    <span className="sr-only">
                      {lesson.completed ? 'Completed' : 'Not completed'}
                    </span>
                    <span aria-hidden className="text-ink-300">
                      &rarr;
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {quizzes.length > 0 && (
        <section className="animate-rise mt-10" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-title font-semibold">Quizzes</h2>
          <ul className="mt-4 space-y-2">
            {quizzes.map((quiz) => (
              <li key={quiz.documentId}>
                <Link href={`/quiz/${quiz.documentId}`}>
                  <Card interactive className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <span className="text-small font-medium">{quiz.title}</span>
                    <span className="text-micro text-ink-500">
                      {quiz.questions?.length ?? 0} questions
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(isOwner || isStaff) && (
        <section className="mt-12 border-t border-ink-200 pt-6">
          <h2 className="text-small font-semibold text-ink-500">Manage</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button href={`/manage/courses/${course.documentId}`} variant="secondary">
              Edit course and lessons
            </Button>
            <Button
              href={`/manage/courses/${course.documentId}/students`}
              variant="secondary"
            >
              Enrolled students
            </Button>
          </div>
        </section>
      )}
    </PageShell>
  );
}
