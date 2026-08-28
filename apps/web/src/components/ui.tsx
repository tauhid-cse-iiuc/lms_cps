import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared layout and presentation primitives.
 *
 * These exist so that spacing, width and rhythm are decided once. Before this,
 * every page repeated `mx-auto max-w-3xl px-6 py-10` with small variations, and
 * the variations were accidents rather than decisions.
 *
 * All server components - none of them need state, so none of them should cost
 * the client any JavaScript.
 */

/** The page container. `width` is the only knob, and it has three settings. */
export function PageShell({
  children,
  width = 'default',
}: {
  children: ReactNode;
  width?: 'narrow' | 'default' | 'wide';
}) {
  const max =
    width === 'narrow' ? 'max-w-2xl' : width === 'wide' ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <main className={`mx-auto ${max} px-4 pb-20 pt-8 sm:px-6 sm:pt-10`}>{children}</main>
  );
}

/** Page title, optional description, optional action on the right. */
export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="animate-rise">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 text-small text-ink-500 transition-colors hover:text-ink-900"
        >
          <span aria-hidden>&larr;</span>
          {back.label}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 pb-5">
        <div className="min-w-0">
          <h1 className="text-display font-semibold tracking-tight">{title}</h1>
          {description && (
            <div className="mt-1.5 text-small text-ink-500">{description}</div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/**
 * A surface. `interactive` adds the lift and border change that signal the whole
 * card is a link - applied only when it genuinely is one, because a card that
 * animates on hover and does nothing is a broken affordance.
 */
export function Card({
  children,
  interactive = false,
  className = '',
}: {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-ink-200 bg-white ${
        interactive
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-lg hover:shadow-ink-900/5'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Shown when a list is legitimately empty - not when a request failed. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-rise rounded-card border border-dashed border-ink-300 px-6 py-14 text-center">
      <p className="text-lead font-medium text-ink-700">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-small text-ink-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A request failed. Deliberately distinct from EmptyState. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/25 bg-danger/5 px-4 py-3 text-small text-danger"
    >
      {children}
    </p>
  );
}

/** Primary action. */
export function Button({
  children,
  href,
  type = 'button',
  variant = 'primary',
  disabled,
  onClick,
  className = '',
}: {
  children: ReactNode;
  href?: string;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-small font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50';
  const styles = {
    primary: 'bg-ink-900 text-white hover:bg-ink-800 active:scale-[0.98]',
    secondary:
      'border border-ink-300 bg-white text-ink-800 hover:border-ink-400 hover:bg-ink-50 active:scale-[0.98]',
    ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  }[variant];

  if (href) {
    return (
      <Link href={href} className={`${base} ${styles} ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/** A small status pill. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'muted';
}) {
  const styles = {
    neutral: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-success/10 text-success border-success/25',
    muted: 'bg-ink-100 text-ink-600 border-ink-200',
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-micro font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

/**
 * Loading placeholder.
 *
 * Shaped like the content it replaces, so the layout does not jump when the real
 * thing arrives. A centred spinner would be less work and would move everything.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-ink-100 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-card border border-ink-200 p-5">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="mt-3 h-3.5 w-4/5" />
      <Skeleton className="mt-2 h-3.5 w-2/3" />
    </div>
  );
}

/** A list of card skeletons, for a page that is fetching a collection. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-6 space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
