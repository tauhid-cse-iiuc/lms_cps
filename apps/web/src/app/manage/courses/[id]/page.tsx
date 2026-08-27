import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiGet, type Course, type Lesson, type Quiz } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { CourseForm } from '@/components/course-form';
import { LessonManager } from '@/components/lesson-manager';
import { QuizManager } from '@/components/quiz-manager';

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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <Link href="/manage/courses" className="text-sm text-slate-600 underline">
          &larr; Your courses
        </Link>
        <Link
          href={`/manage/courses/${id}/students`}
          className="text-sm underline"
        >
          Enrolled students
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-semibold">{course.title}</h1>

      <section className="mt-6 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-medium">Course details</h2>
        <CourseForm
          existing={{
            documentId: course.documentId,
            title: course.title,
            description: course.description,
            coverImageUrl: course.coverImageUrl,
          }}
        />
      </section>

      <section className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-medium">Lessons</h2>
        <LessonManager courseId={id} lessons={lessons} />
      </section>

      <section className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-medium">Quizzes</h2>
        <QuizManager courseId={id} quizzes={quizzes} />
      </section>
    </main>
  );
}
