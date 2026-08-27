/**
 * A plain progress bar. Server component - it renders a number, nothing more.
 *
 * `aria-*` rather than only colour, so the figure is available to a screen
 * reader instead of being conveyed by width alone.
 */
export function ProgressBar({
  percentage,
  label,
}: {
  percentage: number;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percentage)));

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs text-slate-600">
        <span>{label ?? 'Progress'}</span>
        <span className="font-medium text-slate-900">{safe}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Course progress'}
        className="h-2 w-full overflow-hidden rounded bg-slate-200"
      >
        <div className="h-full rounded bg-slate-900" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
