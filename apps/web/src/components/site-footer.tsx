import Link from 'next/link';

/**
 * Site footer.
 *
 * A server component - it has no state and should cost the client nothing.
 *
 * Deliberately free of platform statistics. How many users or roles exist is
 * information about the database, not about the reader, and putting it on a
 * public page invites a visitor to draw conclusions about the size of something
 * that has nothing to do with what they came here to do.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-ink-200 bg-night-950 text-white">
      <div
        aria-hidden
        className="bg-aurora-night absolute inset-0 opacity-50"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-lead font-semibold tracking-tight">LMS</p>
            <p className="mt-3 max-w-sm text-small leading-relaxed text-white/60">
              Courses, lessons and quizzes with role-based access. Progress is
              counted per student, quizzes are marked by the server, and the
              answer key never reaches the browser.
            </p>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-micro font-semibold uppercase tracking-wide text-white/40">
                {section.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {section.links.map(([href, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-small text-white/70 transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="text-micro text-white/40">
            &copy; {year} LMS. Built as a project-round submission.
          </p>
          <p className="text-micro text-white/40">
            Next.js on Vercel · Strapi on Railway
          </p>
        </div>
      </div>
    </footer>
  );
}

const SECTIONS = [
  {
    heading: 'Learn',
    links: [
      ['/courses', 'Browse courses'],
      ['/blog', 'Blog'],
      ['/search', 'Search'],
    ] as Array<[string, string]>,
  },
  {
    heading: 'Account',
    links: [
      ['/login', 'Sign in'],
      ['/register', 'Create an account'],
      ['/dashboard', 'Dashboard'],
    ] as Array<[string, string]>,
  },
];
