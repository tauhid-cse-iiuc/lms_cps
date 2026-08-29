import Link from 'next/link';

/**
 * The consent line under the sign-up controls.
 *
 * Passive consent - continuing is the agreement - rather than a checkbox. That
 * choice is worth being explicit about, because the two are not equivalent:
 * a ticked box is a record that a specific person agreed at a specific moment,
 * and this is not. It is the right shape for a project of this size, where the
 * terms describe how a demonstration platform behaves rather than binding
 * anyone to anything; a service handling payments or personal data at scale
 * should store the agreement, not merely display it.
 *
 * It sits BELOW both the password form and the Google button rather than inside
 * either. Google sign-up creates an account too, and a notice attached to only
 * one of the two routes into the platform would be telling half the truth.
 */
export function LegalConsent() {
  return (
    <p className="mt-5 text-center text-micro leading-relaxed text-ink-500">
      By continuing you accept the{' '}
      <Link
        href="/terms"
        className="font-medium text-ink-700 underline underline-offset-2 transition-colors hover:text-ink-900"
      >
        Terms of Service
      </Link>{' '}
      and the{' '}
      <Link
        href="/privacy"
        className="font-medium text-ink-700 underline underline-offset-2 transition-colors hover:text-ink-900"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
