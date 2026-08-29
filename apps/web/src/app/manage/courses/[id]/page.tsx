import { notFound, redirect } from 'next/navigation';
import { apiGet, type Course, type Lesson, type Quiz } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { CourseForm } from '@/components/course-form';
import { LessonManager } from '@/components/lesson-manager';
import { QuizManager } from '@/components/quiz-manager';
import { PageShell, PageHeader, Button } from '@/components/ui';

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const courseRes = await apiGet<{ data: Course }>(`/api/courses/${id}?populate=owner`);
  if (!courseRes.ok || !courseRes.data?.data) notFound();
  const course = courseRes.data.data;

  const lessonsRes = await apiGet<{ data: Lesson[] }>(
    `/api/lessons?filters[course][documentId][$eq]=${id}&sort=order:asc&pagination[pageSize]=100`
  );
  const lessons = lessonsRes.ok ? lessonsRes.data.data : [];

  const quizzesRes = await apiGet<{ data: Quiz[] }>(
    `/api/quizzes?filters[course][documentId][$eq]=${id}&populate=questions`
  );
  const quizzes = quizzesRes.ok ? quizzesRes.data.data : [];

  return (
    <PageShell>
      <PageHeader
        title={course.title}
        description="Edit the course, its lessons and its quizzes."
        back={{ href: '/manage/courses', label: 'Your courses' }}
        action={
          <div className="flex gap-2">
            {/* The escape hatch from the redirect on the catalogue page: the
                people who write a course description are the ones who most need
                to see how it reads to a visitor. */}
            <Button href={`/courses/${id}?preview=1`} variant="secondary">
              View public page
            </Button>
            <Button href={`/manage/courses/${id}/students`} variant="secondary">
              Enrolled students
            </Button>
          </div>
        }
      />

      <section className="mt-8">
        <h2 className="text-title font-semibold">Course details</h2>
        <CourseForm
          existing={{
            documentId: course.documentId,
            title: course.title,
            description: course.description,
            coverImageUrl: course.coverImageUrl,
          }}
        />
      </section>

      <section className="mt-12 border-t border-ink-200 pt-8">
        <h2 className="text-title font-semibold">Lessons</h2>
        <LessonManager courseId={id} lessons={lessons} />
      </section>

      <section className="mt-12 border-t border-ink-200 pt-8">
        <h2 className="text-title font-semibold">Quizzes</h2>
        <QuizManager courseId={id} quizzes={quizzes} />
      </section>
    </PageShell>
  );
}
