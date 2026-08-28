'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

/**
 * Progress bar with a counting figure.
 *
 * Two deliberate choices here.
 *
 * The bar animates only when it scrolls into view (`useInView`), so a list of
 * ten courses does not run ten animations off-screen before the reader arrives.
 *
 * The number counts up rather than appearing, because the percentage IS the
 * point of this component - it is the visible output of the progress
 * calculation, and drawing the eye to it is the whole job.
 *
 * The accessible value is set to the FINAL number immediately. A screen reader
 * must not have to wait out an animation, and must never be told 37% when the
 * real answer is 40%.
 */
export function ProgressBar({
  percentage,
  label,
  size = 'default',
}: {
  percentage: number;
  label?: string;
  size?: 'default' | 'compact';
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percentage)));
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? safe : 0);

  useEffect(() => {
    if (reduce) {
      setShown(safe);
      return;
    }
    if (!inView) return;

    let raf = 0;
    const start = performance.now();
    const duration = 700;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic: quick at first, settling at the end.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(safe * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, safe, reduce]);

  const complete = safe === 100;

  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-micro text-ink-500">{label ?? 'Progress'}</span>
        <span
          className={`text-small font-semibold tabular-nums ${
            complete ? 'text-success' : 'text-ink-900'
          }`}
        >
          {shown}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Course progress'}
        className={`w-full overflow-hidden rounded-full bg-ink-100 ${
          size === 'compact' ? 'h-1.5' : 'h-2'
        }`}
      >
        <motion.div
          initial={{ width: reduce ? `${safe}%` : 0 }}
          animate={{ width: inView || reduce ? `${safe}%` : 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${
            complete ? 'bg-success' : 'bg-brand-500'
          }`}
        />
      </div>
    </div>
  );
}
