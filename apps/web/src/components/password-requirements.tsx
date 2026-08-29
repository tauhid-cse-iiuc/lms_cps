'use client';

import { RULES, SPECIALS } from '@/lib/password-policy';

/**
 * The rules a new password has to meet, ticking off as they are met.
 *
 * A checklist rather than a strength meter, because the two answer different
 * questions. A meter says "this is weak-ish", which is a judgement somebody can
 * argue with and cannot act on; a checklist says exactly what is still missing.
 * The backend enforces this same list, so nothing here is advisory.
 *
 * `aria-live="polite"` on the list means a screen reader hears each rule as it
 * is satisfied, instead of the sighted-only feedback of a colour change.
 */
export function PasswordRequirements({
  value,
  id,
}: {
  value: string;
  id?: string;
}) {
  return (
    <ul id={id} aria-live="polite" className="mt-2 grid gap-1 sm:grid-cols-2">
      {RULES.map((rule) => {
        const met = rule.test(value);

        return (
          <li
            key={rule.id}
            className={`flex items-start gap-1.5 text-micro transition-colors ${
              met ? 'text-teal-600' : 'text-ink-500'
            }`}
          >
            <span aria-hidden className="mt-px w-3 shrink-0 text-center">
              {met ? '✓' : '·'}
            </span>
            <span className="min-w-0">
              {rule.label}
              {rule.id === 'special' && (
                <span className="ml-1 break-all text-ink-400">{SPECIALS}</span>
              )}
            </span>
            <span className="sr-only">{met ? ' — met' : ' — not yet met'}</span>
          </li>
        );
      })}
    </ul>
  );
}
