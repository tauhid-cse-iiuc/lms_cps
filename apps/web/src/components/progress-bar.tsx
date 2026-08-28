'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Progress bar with a counting figure.
 *
 * ---------------------------------------------------------------------------
 * THE CORRECT VALUE IS RENDERED FIRST; THE ANIMATION IS AN ENHANCEMENT
 * ---------------------------------------------------------------------------
 * Both the number and the bar width start at their FINAL values, server-side.
 * The count-up only begins once the component has mounted and scrolled into
 * view, and it restores the true figure the moment it finishes.
 *
 * The alternative - starting at zero and relying on JavaScript to arrive at the
 * real number - means that whenever the animation does not run, the page states
 * a percentage that is simply false. A blocked bundle, a background tab with
 * requestAnimationFrame paused, or a slow device would all produce a confident
 * "0%" on a course the student has half finished. A progress figure is data, not
 * decoration, and it should never be wrong in service of a transition.
 *
 * The bar itself animates through a CSS transition rather than JavaScript, so it
 * moves whenever the value changes without needing a library at all.
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
  const [shown, setShown] = useState(safe);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Honour the OS setting. The global CSS rule shortens transitions, but a
    // JavaScript count is not a transition, so it has to be asked separately.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const duration = 700;

        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // Ease-out cubic: quick at first, settling at the end.
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(Math.round(safe * eased));
          if (t < 1) raf = requestAnimationFrame(step);
          // No else-branch resetting to `safe`: the final step already lands
          // there, because eased reaches exactly 1.
        };

        setShown(0);
        raf = requestAnimationFrame(step);
      },
      { rootMargin: '-40px' }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [safe]);

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
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            complete ? 'bg-success' : 'bg-brand-500'
          }`}
          style={{ width: `${shown}%` }}
        />
      </div>
    </div>
  );
}
