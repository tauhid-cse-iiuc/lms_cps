import { GOOGLE_SIGNIN_ENABLED } from '@/lib/strapi';

/**
 * Sign in with Google.
 *
 * A plain link, not a button with a click handler - the whole flow is a browser
 * navigation, so there is nothing for JavaScript to do and no reason to ship any.
 *
 * It renders nothing when Google sign-in is not configured. An offered button
 * that fails at the redirect with an opaque error from Google is worse than no
 * button: the person cannot tell whether they did something wrong.
 */
export function GoogleButton({ label }: { label: string }) {
  if (!GOOGLE_SIGNIN_ENABLED) return null;

  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-200" />
        <span className="text-micro text-ink-400">or</span>
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <a
        href="/api/auth/google"
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-small font-semibold shadow-soft transition-all hover:border-ink-400 hover:shadow-lift active:scale-[0.99]"
      >
        <GoogleMark />
        {label}
      </a>
    </>
  );
}

/** Google's mark, inline so it needs no network request and no icon package. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
