import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet, type Course, type Enrollment, type Progress, type Quiz } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { ProgressBar } from '@/components/progress-bar';
import { EnrollButton } from '@/components/enroll-button';

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
    if (mine.ok) {
      enrolled = mine.data.data.some((e) => e.course?.documentId === id);
    }

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/courses" className="text-sm text-slate-600 underline">
        &larr; All courses
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{course.title}</h1>
      {course.owner?.username && (
        <p className="text-sm text-slate-600">by {course.owner.username}</p>
      )}
      {course.description && <p className="mt-4 text-slate-700">{course.description}</p>}

      {!user && (
        <p className="mt-6 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <Link href="/login" className="font-medium underline">
            Sign in
          </Link>{' '}
          to enrol and view the lessons.
        </p>
      )}

      {user && !enrolled && !isOwner && !isStaff && (
        <div className="mt-6">
          <EnrollButton courseId={course.documentId} />
        </div>
      )}

      {progress && (
        <section className="mt-8">
          <ProgressBar
            percentage={progress.percentage}
            label={`${progress.completedLessons} of ${progress.totalLessons} lessons complete`}
          />

          <ul className="mt-4 space-y-2">
            {progress.lessons.map((lesson) => (
              <li key={lesson.documentId}>
                <Link
                  href={`/learn/${course.documentId}/${lesson.documentId}`}
                  className="flex items-center gap-3 rounded border border-slate-200 px-4 py-3 text-sm hover:border-slate-400"
                >
                  <span
                    aria-hidden
                    className={
                      lesson.completed
                        ? 'inline-block h-4 w-4 rounded-full bg-slate-900'
                        : 'inline-block h-4 w-4 rounded-full border border-slate-300'
                    }
                  />
                  <span className="flex-1">
                    {lesson.order}. {lesson.title}
                  </span>
                  <span className="sr-only">
                    {lesson.completed ? 'Completed' : 'Not completed'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {quizzes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Quizzes</h2>
          <ul className="mt-3 space-y-2">
            {quizzes.map((quiz) => (
              <li key={quiz.documentId}>
                <Link
                  href={`/quiz/${quiz.documentId}`}
                  className="block rounded border border-slate-200 px-4 py-3 text-sm hover:border-slate-400"
                >
                  {quiz.title}
                  <span className="ml-2 text-slate-500">
                    ({quiz.questions?.length ?? 0} questions)
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(isOwner || isStaff) && (
        <section className="mt-8 rounded border border-slate-200 p-4">
          <h2 className="text-sm font-medium">Manage</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Link href={`/manage/courses/${course.documentId}`} className="underline">
              Edit course and lessons
            </Link>
            <Link
              href={`/manage/courses/${course.documentId}/students`}
              className="underline"
            >
              Enrolled students
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
