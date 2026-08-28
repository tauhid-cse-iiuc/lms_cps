import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiGet, type Lesson, type Progress, type Quiz } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { ProgressBar } from '@/components/progress-bar';
import { CompleteLessonButton } from '@/components/complete-lesson-button';
import { PageShell, EmptyState, Button, Card } from '@/components/ui';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const res = await apiGet<{ data: Lesson }>(`/api/lessons/${lessonId}`);
  return { title: res.ok ? res.data.data.title : 'Lesson' };
}

/**
 * The lesson viewer.
 *
 * Sequence comes from the explicit `order` field, not from id or creation date.
 * Ordering by either breaks the moment a lesson is inserted between two existing
 * ones - which is exactly when an instructor is most likely to do it.
 *
 * Previous and next are computed from the progress payload, which already lists
 * every lesson in order, so moving through a course costs no extra request.
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

  // A 403 here is the is-enrolled policy working, not a broken page - so it gets
  // an explanation and a way forward rather than a generic error.
  if (!lessonRes.ok) {
    if (lessonRes.status === 403) {
      return (
        <PageShell width="narrow">
          <div className="pt-12">
            <EmptyState
              title="This lesson is for enrolled students"
              description="The catalogue is public so you can see what a course covers. The material itself needs an enrolment."
              action={<Button href={`/courses/${courseId}`}>Go to the course</Button>}
            />
          </div>
        </PageShell>
      );
    }
    notFound();
  }

  const lesson = lessonRes.data.data;

  const progressRes = await apiGet<{ data: Progress }>(`/api/courses/${courseId}/progress`);
  const progress = progressRes.ok ? progressRes.data.data : null;

  // The course assessment, if it has one. Fetched here so the end of the last
  // lesson can point at it - "Last lesson" was a dead end that told the student
  // the course was over while the quiz they still had to take sat unmentioned.
  const quizRes = await apiGet<{ data: Quiz[] }>(
    `/api/quizzes?filters[course][documentId][$eq]=${courseId}`
  );
  const assessment = quizRes.ok ? quizRes.data.data[0] : undefined;

  const ordered = progress?.lessons ?? [];
  const index = ordered.findIndex((l) => l.documentId === lessonId);
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const isComplete = index >= 0 ? ordered[index].completed : false;

  return (
    <PageShell>
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 text-small text-ink-500 transition-colors hover:text-ink-900"
      >
        <span aria-hidden>&larr;</span> Back to the course
      </Link>

      {progress && (
        <div className="mt-4">
          <ProgressBar
            percentage={progress.percentage}
            size="compact"
            label={`Lesson ${index + 1} of ${progress.totalLessons}`}
          />
        </div>
      )}

      <article className="animate-rise mt-8">
        <p className="text-micro font-medium uppercase tracking-wide text-brand-600">
          Lesson {lesson.order}
        </p>
        <h1 className="mt-2 text-display font-semibold tracking-tight">
          {lesson.title}
        </h1>

        {lesson.videoUrl && (
          <a
            href={lesson.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-ink-300 px-4 py-2 text-small font-medium transition-colors hover:border-ink-400 hover:bg-ink-50"
          >
            <span aria-hidden>▶</span> Watch the video
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}

        {lesson.content && (
          // `prose`-like spacing done by hand: the content is plain text with
          // paragraph breaks, so whitespace-pre-line is enough and avoids
          // pulling in a typography plugin for one field.
          <div className="mt-7 whitespace-pre-line text-body leading-[1.75] text-ink-700">
            {lesson.content}
          </div>
        )}
      </article>

      <Card className="mt-10 flex flex-wrap items-center justify-between gap-4 p-5">
        <CompleteLessonButton
          lessonId={lessonId}
          courseId={courseId}
          initiallyComplete={isComplete}
        />
        {next && isComplete && (
          <Button href={`/learn/${courseId}/${next.documentId}`} variant="secondary">
            Next lesson &rarr;
          </Button>
        )}
        {!next && assessment && (
          <Button href={`/quiz/${assessment.documentId}`}>
            Take the assessment &rarr;
          </Button>
        )}
      </Card>

      <nav
        aria-label="Lesson navigation"
        className="mt-8 flex items-stretch justify-between gap-3 border-t border-ink-200 pt-6"
      >
        {previous ? (
          <Link href={`/learn/${courseId}/${previous.documentId}`} className="max-w-[48%]">
            <Card interactive className="h-full px-4 py-3">
              <p className="text-micro text-ink-400">Previous</p>
              <p className="mt-0.5 truncate text-small font-medium">
                {previous.title}
              </p>
            </Card>
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            href={`/learn/${courseId}/${next.documentId}`}
            className="ml-auto max-w-[48%] text-right"
          >
            <Card interactive className="h-full px-4 py-3">
              <p className="text-micro text-ink-400">Next</p>
              <p className="mt-0.5 truncate text-small font-medium">{next.title}</p>
            </Card>
          </Link>
        ) : assessment ? (
          <Link href={`/quiz/${assessment.documentId}`} className="ml-auto max-w-[48%] text-right">
            <Card interactive className="h-full border-brand-200 bg-brand-50/60 px-4 py-3">
              <p className="text-micro font-semibold text-brand-600">
                Final step
              </p>
              <p className="mt-0.5 truncate text-small font-medium">
                {assessment.title}
              </p>
            </Card>
          </Link>
        ) : (
          <span className="ml-auto self-center text-small text-ink-400">
            Last lesson
          </span>
        )}
      </nav>
    </PageShell>
  );
}
