import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type Enrollment, type Progress } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { ProgressBar } from '@/components/progress-bar';
import { PageShell, PageHeader, Card, EmptyState, Button, Badge } from '@/components/ui';

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

  /**
   * Learning pages are for the role that learns. Enrolling and taking quizzes
   * are Student-only in the permission matrix, so for anyone else these
   * endpoints answer 403 and the page could only ever render an empty state
   * that looks like a bug. Sending them to their own dashboard says what is
   * actually true: this is not their screen.
   */
  if (user.role.type !== 'student') redirect('/dashboard');

  const res = await apiGet<{ data: Enrollment[] }>('/api/my/enrollments');
  const enrollments = res.ok ? res.data.data : [];

  const rows = await Promise.all(
    enrollments.map(async (enrollment) => {
      const courseId = enrollment.course?.documentId;
      if (!courseId) return { enrollment, progress: null as Progress | null };
      const p = await apiGet<{ data: Progress }>(`/api/courses/${courseId}/progress`);
      return { enrollment, progress: p.ok ? p.data.data : null };
    })
  );

  const finished = rows.filter((r) => r.progress?.percentage === 100).length;

  return (
    <PageShell>
      <PageHeader
        title="My learning"
        description={
          rows.length === 0
            ? undefined
            : `${rows.length} course${rows.length === 1 ? '' : 's'}${
                finished > 0 ? ` · ${finished} finished` : ''
              }`
        }
      />

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="You are not enrolled in anything yet"
            description="Find a course in the catalogue and enrol to start tracking progress."
            action={<Button href="/courses">Browse courses</Button>}
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map(({ enrollment, progress }, i) => {
            const course = enrollment.course;
            if (!course) return null;

            const next = progress?.lessons.find((l) => !l.completed);
            const complete = progress?.percentage === 100;

            return (
              <li
                key={enrollment.documentId}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
              >
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/courses/${course.documentId}`}
                        className="font-medium hover:underline"
                      >
                        {course.title}
                      </Link>
                      {complete && (
                        <span className="ml-2 align-middle">
                          <Badge tone="success">Complete</Badge>
                        </span>
                      )}
                    </div>

                    {next ? (
                      <Button
                        href={`/learn/${course.documentId}/${next.documentId}`}
                        variant="secondary"
                        className="shrink-0"
                      >
                        {progress?.completedLessons === 0 ? 'Start' : 'Continue'}
                      </Button>
                    ) : (
                      <Button
                        href={`/courses/${course.documentId}`}
                        variant="ghost"
                        className="shrink-0"
                      >
                        Review
                      </Button>
                    )}
                  </div>

                  {progress && (
                    <div className="mt-4">
                      <ProgressBar
                        percentage={progress.percentage}
                        label={`${progress.completedLessons} of ${progress.totalLessons} lessons`}
                      />
                    </div>
                  )}

                  {next && (
                    <p className="mt-3 truncate text-micro text-ink-400">
                      Up next: {next.title}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
