import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type Course } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { ProgressBar } from '@/components/progress-bar';

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
 * Who is on this course and how far they have got.
 *
 * The endpoint carries the is-owner-or-manager policy, so an instructor who does
 * not own this course gets a 403 from the API rather than an empty table - which
 * is the distinction worth showing the user honestly.
 */
export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const courseRes = await apiGet<{ data: Course }>(`/api/courses/${id}`);
  const rosterRes = await apiGet<{ data: Row[] }>(`/api/courses/${id}/students`);

  const title = courseRes.ok ? courseRes.data.data.title : 'Course';

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/manage/courses/${id}`} className="text-sm text-slate-600 underline">
        &larr; Back to the course
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-slate-600">Enrolled students</p>

      {!rosterRes.ok ? (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {rosterRes.status === 403
            ? 'This is not your course.'
            : rosterRes.error}
        </p>
      ) : rosterRes.data.data.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">Nobody has enrolled yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rosterRes.data.data.map((row) => (
            <li key={row.studentId} className="rounded border border-slate-200 p-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{row.username}</span>
                <span className="text-xs text-slate-500">{row.email}</span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  percentage={row.percentage}
                  label={`${row.completedLessons} of ${row.totalLessons} lessons`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
