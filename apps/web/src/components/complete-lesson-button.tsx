'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { completeLessonAction } from '@/app/actions/enrollment';

/**
 * Marks a lesson complete.
 *
 * `initiallyComplete` comes from the server. Once marked, the control reports
 * state rather than offering the action again - the backend is idempotent, so a
 * second press is harmless, but an enabled button implies something will change
 * and here nothing would.
 *
 * The swap is animated because it is the moment the student's progress moves,
 * and a state change that important should be visible rather than instantaneous.
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

  return (
    <div className="min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.p
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-small font-medium text-success"
          >
            <motion.span
              aria-hidden
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.05 }}
              className="grid h-6 w-6 place-items-center rounded-full bg-success text-white"
            >
              ✓
            </motion.span>
            Lesson complete
          </motion.p>
        ) : (
          <motion.button
            key="action"
            type="button"
            disabled={pending}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            className="rounded-lg bg-ink-900 px-4 py-2 text-small font-medium text-white transition-all hover:bg-ink-800 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Mark as complete'}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Announce the change without moving focus. */}
      <span role="status" aria-live="polite" className="sr-only">
        {done ? 'Lesson marked complete' : ''}
      </span>

      {error && (
        <p role="alert" className="mt-2 text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
