'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { resetCourseProgressAction } from '@/app/actions/enrollment';

/**
 * Clears your progress on one course.
 *
 * Destructive and irreversible, so it asks first. The confirmation states the
 * consequence in specifics - how many lessons are about to be un-ticked - rather
 * than the usual "are you sure?", which tells the reader nothing they did not
 * already know.
 *
 * It also states what SURVIVES, because that is the part people get wrong: the
 * enrolment stays, and past quiz results are untouched.
 */
export function ResetProgressButton({
  courseId,
  completedLessons,
}: {
  courseId: string;
  completedLessons: number;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (completedLessons === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setAsking((v) => !v)}
        aria-expanded={asking}
        className="text-small font-medium text-ink-500 underline transition-colors hover:text-danger"
      >
        Reset my progress
      </button>

      <AnimatePresence>
        {asking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-danger/25 bg-danger/5 p-4">
              <p className="text-small font-semibold text-ink-900">
                Un-tick {completedLessons} completed lesson
                {completedLessons === 1 ? '' : 's'}?
              </p>
              <p className="mt-1.5 text-small text-ink-600">
                You stay enrolled, and your past quiz results are kept exactly as
                they were marked. Only the lesson ticks are cleared, so the course
                starts from the beginning again.
              </p>

              {error && (
                <p role="alert" className="mt-3 text-small text-danger">
                  {error}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      const res = await resetCourseProgressAction(courseId);
                      if (!res.ok) {
                        setError(res.error);
                        return;
                      }
                      setAsking(false);
                      router.refresh();
                    })
                  }
                  className="rounded-lg bg-danger px-4 py-2 text-small font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {pending ? 'Resetting…' : 'Yes, reset it'}
                </button>
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  className="rounded-lg px-4 py-2 text-small font-medium text-ink-600 transition-colors hover:bg-ink-100"
                >
                  Keep my progress
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
