import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type Course } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { CourseForm } from '@/components/course-form';
import { PageShell, PageHeader, Card, EmptyState, ErrorNote, Button } from '@/components/ui';

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
      <PageShell width="narrow">
        <div className="pt-12">
          <EmptyState
            title="Not available for students"
            description="Course management needs the Instructor, Content Manager or Admin role."
            action={<Button href="/dashboard">Back to your dashboard</Button>}
          />
        </div>
      </PageShell>
    );
  }

  const res = await apiGet<{ data: Course[] }>('/api/my/courses');
  const courses = res.ok ? res.data.data : [];

  const totals = courses.reduce(
    (acc, c) => ({
      lessons: acc.lessons + (c.lessonCount ?? 0),
      students: acc.students + (c.studentCount ?? 0),
    }),
    { lessons: 0, students: 0 }
  );

  return (
    <PageShell>
      <PageHeader
        title="Your courses"
        description={
          courses.length === 0
            ? undefined
            : `${courses.length} course${courses.length === 1 ? '' : 's'} · ${totals.lessons} lessons · ${totals.students} enrolled`
        }
      />

      {!res.ok && (
        <div className="mt-6">
          <ErrorNote>{res.error}</ErrorNote>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No courses yet"
            description="Create one below. You are recorded as its owner automatically — ownership comes from your session, never from the form."
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {courses.map((course, i) => (
            <li
              key={course.documentId}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
            >
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/manage/courses/${course.documentId}`}
                      className="font-medium hover:underline"
                    >
                      {course.title}
                    </Link>
                    <p className="mt-1 text-micro text-ink-500">
                      {course.lessonCount ?? 0} lesson
                      {course.lessonCount === 1 ? '' : 's'} ·{' '}
                      {course.quizCount ?? 0} quiz
                      {course.quizCount === 1 ? '' : 'zes'} ·{' '}
                      {course.studentCount ?? 0} student
                      {course.studentCount === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      href={`/manage/courses/${course.documentId}`}
                      variant="secondary"
                    >
                      Edit
                    </Button>
                    <Button
                      href={`/manage/courses/${course.documentId}/students`}
                      variant="ghost"
                    >
                      Students
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-12 border-t border-ink-200 pt-8">
        <h2 className="text-title font-semibold">Create a course</h2>
        <CourseForm />
      </section>
    </PageShell>
  );
}
