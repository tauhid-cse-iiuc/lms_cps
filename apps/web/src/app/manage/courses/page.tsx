import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type Course } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { CourseForm } from '@/components/course-form';

export const metadata = { title: 'Manage courses' };

/**
 * The instructor and content-manager view.
 *
 * /my/courses is a dedicated endpoint rather than a filtered /api/courses,
 * precisely so there is no query string a caller could alter to see someone
 * else's. The server decides whose courses these are from the token.
 */
export default async function ManageCoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (user.role.type === 'student') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Not available for students</h1>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          Back to your dashboard
        </Link>
      </main>
    );
  }

  const res = await apiGet<{ data: Course[] }>('/api/my/courses');
  const courses = res.ok ? res.data.data : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Your courses</h1>
        <Link href="/dashboard" className="text-sm underline">
          Dashboard
        </Link>
      </header>

      {!res.ok && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {res.error}
        </p>
      )}

      {courses.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">
          You have not created any courses yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {courses.map((course) => (
            <li
              key={course.documentId}
              className="rounded border border-slate-200 p-4"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-medium">{course.title}</h2>
                <Link
                  href={`/manage/courses/${course.documentId}`}
                  className="shrink-0 text-sm underline"
                >
                  Edit
                </Link>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {course.lessonCount ?? 0} lesson{course.lessonCount === 1 ? '' : 's'} ·{' '}
                {course.quizCount ?? 0} quiz{course.quizCount === 1 ? '' : 'zes'} ·{' '}
                {course.studentCount ?? 0} student{course.studentCount === 1 ? '' : 's'}
              </p>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-medium">Create a course</h2>
        <CourseForm />
      </section>
    </main>
  );
}
