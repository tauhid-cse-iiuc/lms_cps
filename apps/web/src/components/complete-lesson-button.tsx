'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeLessonAction } from '@/app/actions/enrollment';

/**
 * Marks a lesson complete.
 *
 * `initiallyComplete` comes from the server. Once marked, the button reports the
 * state rather than offering the action again - the backend is idempotent, so a
 * second press would be harmless, but an enabled button implies something will
 * change and here nothing would.
 */
export function CompleteLessonButton({
  lessonId,
  courseId,
  initiallyComplete,
}: {
  lessonId: string;
  courseId: string;
  initiallyComplete: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyComplete);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p className="text-sm font-medium text-slate-900">
        <span aria-hidden>✓</span> Completed
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await completeLessonAction(lessonId, courseId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setDone(true);
            router.refresh();
          })
        }
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Mark as complete'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
