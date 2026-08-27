import Link from 'next/link';
import { apiGet, type Course } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Courses — LMS' };

/**
 * The public catalogue.
 *
 * Readable signed out on purpose: the Public role holds course.find and
 * course.findOne and nothing else, so a visitor can see WHAT exists without
 * getting the lessons. This page is the reason that permission exists.
 */
export default async function CoursesPage() {
  const user = await getCurrentUser();
  const res = await apiGet<{ data: Course[] }>('/api/courses?populate=owner');
  const courses = res.ok ? res.data.data : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-slate-600">
            {courses.length} course{courses.length === 1 ? '' : 's'} available
          </p>
        </div>
        <Link href={user ? '/dashboard' : '/login'} className="text-sm underline">
          {user ? 'Dashboard' : 'Sign in'}
        </Link>
      </header>

      {!res.ok && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {res.error}
        </p>
      )}

      {courses.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600">No courses have been published yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {courses.map((course) => (
            <li key={course.documentId}>
              <Link
                href={`/courses/${course.documentId}`}
                className="block rounded border border-slate-200 p-4 hover:border-slate-400"
              >
                <h2 className="font-medium">{course.title}</h2>
                {course.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {course.description}
                  </p>
                )}
                {course.owner?.username && (
                  <p className="mt-2 text-xs text-slate-500">by {course.owner.username}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
