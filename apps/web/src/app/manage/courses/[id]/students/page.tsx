import { redirect } from 'next/navigation';
import { apiGet, type Course } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { ProgressBar } from '@/components/progress-bar';
import { PageShell, PageHeader, Card, EmptyState, ErrorNote } from '@/components/ui';

type Row = {
  studentId: string;
  username: string;
  email: string;
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
};

/**
 * Who is on this course and how far each has got.
 *
 * The endpoint carries the is-owner-or-manager policy, so an instructor who does
 * not own this course gets a 403 from the API rather than an empty table - and
 * this page says so, because "not yours" and "nobody enrolled" are different
 * facts and showing the same blank list for both would be misleading.
 */
export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [courseRes, rosterRes] = await Promise.all([
    apiGet<{ data: Course }>(`/api/courses/${id}`),
    apiGet<{ data: Row[] }>(`/api/courses/${id}/students`),
  ]);

  const title = courseRes.ok ? courseRes.data.data.title : 'Course';
  const rows = rosterRes.ok ? rosterRes.data.data : [];
  const average =
    rows.length > 0
      ? Math.round(rows.reduce((a, r) => a + r.percentage, 0) / rows.length)
      : 0;

  return (
    <PageShell>
      <PageHeader
        title={title}
        description={
          rows.length === 0
            ? 'Enrolled students'
            : `${rows.length} enrolled · ${average}% average progress`
        }
        back={{ href: `/manage/courses/${id}`, label: 'Back to the course' }}
      />

      {!rosterRes.ok ? (
        <div className="mt-6">
          <ErrorNote>
            {rosterRes.status === 403
              ? 'This is not your course. Only its owner, a content manager or an admin can see who is enrolled.'
              : rosterRes.error}
          </ErrorNote>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nobody has enrolled yet"
            description="Students appear here as soon as they enrol, with their progress."
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((row, i) => (
            <li
              key={row.studentId}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}
            >
              <Card className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="font-medium">{row.username}</span>
                  <span className="text-micro text-ink-500">{row.email}</span>
                </div>
                <div className="mt-4">
                  <ProgressBar
                    percentage={row.percentage}
                    label={`${row.completedLessons} of ${row.totalLessons} lessons`}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
