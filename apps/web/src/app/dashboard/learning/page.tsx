import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type Enrollment, type Progress } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { ProgressBar } from '@/components/progress-bar';

export const metadata = { title: 'My learning' };

/**
 * The courses this student is enrolled in, each with its progress.
 *
 * Progress is fetched per course rather than being part of the enrolment row,
 * because it is counted from completions at read time rather than stored. See
 * the course controller for why that trade is the right way round.
 */
export default async function MyLearningPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const res = await apiGet<{ data: Enrollment[] }>('/api/my/enrollments');
  const enrollments = res.ok ? res.data.data : [];

  const withProgress = await Promise.all(
    enrollments.map(async (enrollment) => {
      const courseId = enrollment.course?.documentId;
      if (!courseId) return { enrollment, progress: null as Progress | null };
      const p = await apiGet<{ data: Progress }>(`/api/courses/${courseId}/progress`);
      return { enrollment, progress: p.ok ? p.data.data : null };
    })
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">My learning</h1>
        <Link href="/dashboard" className="text-sm underline">
          Dashboard
        </Link>
      </header>

      {withProgress.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600">
          You are not enrolled in anything yet.{' '}
          <Link href="/courses" className="underline">
            Browse the catalogue
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {withProgress.map(({ enrollment, progress }) => {
            const course = enrollment.course;
            if (!course) return null;

            const next = progress?.lessons.find((l) => !l.completed);

            return (
              <li key={enrollment.documentId} className="rounded border border-slate-200 p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <Link
                    href={`/courses/${course.documentId}`}
                    className="font-medium underline"
                  >
                    {course.title}
                  </Link>
                  {next && (
                    <Link
                      href={`/learn/${course.documentId}/${next.documentId}`}
                      className="shrink-0 text-sm underline"
                    >
                      Continue
                    </Link>
                  )}
                </div>

                {progress && (
                  <div className="mt-3">
                    <ProgressBar
                      percentage={progress.percentage}
                      label={`${progress.completedLessons} of ${progress.totalLessons} lessons`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
