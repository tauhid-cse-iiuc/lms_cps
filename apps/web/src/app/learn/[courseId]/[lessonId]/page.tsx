import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiGet, type Lesson, type Progress } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { ProgressBar } from '@/components/progress-bar';
import { CompleteLessonButton } from '@/components/complete-lesson-button';

/**
 * The lesson viewer.
 *
 * Sequence comes from the explicit `order` field, not from id or creation date.
 * Ordering by either of those breaks the moment a lesson is inserted between two
 * existing ones - which is exactly when an instructor is most likely to do it.
 *
 * The previous/next links are computed from the progress payload, which already
 * lists every lesson in order, so moving through a course costs no extra request.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const lessonRes = await apiGet<{ data: Lesson }>(`/api/lessons/${lessonId}`);

  // A 403 here is the is-enrolled policy doing its job, not a broken page.
  if (!lessonRes.ok) {
    if (lessonRes.status === 403) {
      return (
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">This lesson is for enrolled students</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enrol in the course to read its lessons.
          </p>
          <Link href={`/courses/${courseId}`} className="mt-4 inline-block text-sm underline">
            Go to the course
          </Link>
        </main>
      );
    }
    notFound();
  }

  const lesson = lessonRes.data.data;

  const progressRes = await apiGet<{ data: Progress }>(
    `/api/courses/${courseId}/progress`
  );
  const progress = progressRes.ok ? progressRes.data.data : null;

  const ordered = progress?.lessons ?? [];
  const index = ordered.findIndex((l) => l.documentId === lessonId);
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const isComplete = index >= 0 ? ordered[index].completed : false;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/courses/${courseId}`} className="text-sm text-slate-600 underline">
        &larr; Back to the course
      </Link>

      {progress && (
        <div className="mt-4">
          <ProgressBar
            percentage={progress.percentage}
            label={`${progress.completedLessons} of ${progress.totalLessons} lessons complete`}
          />
        </div>
      )}

      <h1 className="mt-6 text-2xl font-semibold">
        {lesson.order}. {lesson.title}
      </h1>

      {lesson.videoUrl && (
        <p className="mt-4 text-sm">
          <a
            href={lesson.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Watch the video
          </a>
        </p>
      )}

      {lesson.content && (
        <div className="mt-6 whitespace-pre-wrap text-slate-800">{lesson.content}</div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <CompleteLessonButton
          lessonId={lessonId}
          courseId={courseId}
          initiallyComplete={isComplete}
        />
      </div>

      <nav className="mt-8 flex justify-between border-t border-slate-200 pt-4 text-sm">
        {previous ? (
          <Link href={`/learn/${courseId}/${previous.documentId}`} className="underline">
            &larr; {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${courseId}/${next.documentId}`} className="underline">
            {next.title} &rarr;
          </Link>
        ) : (
          <span className="text-slate-500">Last lesson</span>
        )}
      </nav>
    </main>
  );
}
