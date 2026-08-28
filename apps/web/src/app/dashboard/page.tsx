import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, type RoleType } from '@/lib/auth';
import { apiGet, type Enrollment, type Course, type AdminStats } from '@/lib/api';
import { PageShell, Card, Badge } from '@/components/ui';

export const metadata = { title: 'Dashboard' };

/**
 * Rendered on the server, so the role is decided before any HTML is produced.
 *
 * The middleware has already turned away anyone without a session, but this
 * checks again rather than trusting it. Middleware decides which page to render;
 * it is not an authorisation boundary, and a page that assumes a caller exists
 * because something upstream said so is one refactor away from leaking.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const role = user.role.type as RoleType;
  const theme = THEMES[role];

  // A number worth showing, chosen per role. Each is one request, and each is
  // already permission-scoped by the backend - a student's count cannot include
  // anybody else's rows however this page is called.
  let headline: { value: string; label: string } | null = null;

  if (role === 'student') {
    const res = await apiGet<{ data: Enrollment[] }>('/api/my/enrollments');
    if (res.ok) {
      const n = res.data.data.length;
      headline = { value: String(n), label: `course${n === 1 ? '' : 's'} enrolled` };
    }
  } else if (role === 'instructor' || role === 'content-manager') {
    const res = await apiGet<{ data: Course[] }>('/api/my/courses');
    if (res.ok) {
      const n = res.data.data.length;
      headline = { value: String(n), label: `course${n === 1 ? '' : 's'} you own` };
    }
  } else if (role === 'admin') {
    const res = await apiGet<{ data: AdminStats }>('/api/admin/stats');
    if (res.ok) {
      headline = {
        value: String(res.data.data.totals.users),
        label: 'users on the platform',
      };
    }
  }

  const panel = PANELS[role];

  return (
    <>
      {/* A tinted band behind the greeting. Each role gets its own hue, so the
          page identifies who you are before you read a word of it. */}
      <div className="relative isolate overflow-hidden border-b border-ink-200">
        <div aria-hidden className={`absolute inset-0 -z-20 ${theme.wash}`} />
        <div aria-hidden className="bg-dots absolute inset-0 -z-10 opacity-50" />

        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-6 px-4 py-10 sm:px-6">
          <div className="animate-rise">
            <p className="text-small text-ink-500">Signed in as</p>
            <h1 className="mt-1 text-display font-semibold tracking-tight">
              {user.username}
            </h1>
            <div className="mt-2">
              <Badge tone={theme.badge}>{user.role.name}</Badge>
            </div>
          </div>

          {headline && (
            <div className="animate-pop text-right" style={{ animationDelay: '0.15s' }}>
              <p
                className={`text-hero font-semibold leading-none tabular-nums ${theme.figure}`}
              >
                {headline.value}
              </p>
              <p className="mt-1 text-small text-ink-500">{headline.label}</p>
            </div>
          )}
        </div>
      </div>

      <PageShell width="wide">
        <section>
          <h2 className="text-title font-semibold tracking-tight">
            {panel.heading}
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {panel.links.map(([href, label, description, tint], i) => (
              <li
                key={href}
                className="animate-rise"
                style={{ animationDelay: `${0.06 * i}s` }}
              >
                <Link href={href} className="group block h-full">
                  <Card interactive className="h-full p-5">
                    <div className="flex items-start gap-3.5">
                      <span
                        aria-hidden
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tint}`}
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
                          <path
                            d="M4 10h12M11 5l5 5-5 5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium transition-colors group-hover:text-brand-700">
                          {label}
                        </p>
                        <p className="mt-1 text-small leading-relaxed text-ink-500">
                          {description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-small font-semibold text-ink-500">Everyone</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ['/courses', 'Browse all courses'],
              ['/blog', 'Read the blog'],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href}>
                  <Card interactive className="px-4 py-3 text-small">
                    {label}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </PageShell>
    </>
  );
}

/** One hue per role, used for the band, the badge and the headline figure. */
const THEMES: Record<
  RoleType,
  {
    wash: string;
    badge: 'neutral' | 'success' | 'warn' | 'violet';
    figure: string;
  }
> = {
  admin: {
    wash: 'bg-gradient-to-br from-violet-50 via-white to-brand-50',
    badge: 'violet',
    figure: 'text-violet-600',
  },
  'content-manager': {
    wash: 'bg-gradient-to-br from-amber-50 via-white to-brand-50',
    badge: 'warn',
    figure: 'text-amber-600',
  },
  instructor: {
    wash: 'bg-gradient-to-br from-brand-50 via-white to-teal-50',
    badge: 'neutral',
    figure: 'text-brand-600',
  },
  student: {
    wash: 'bg-gradient-to-br from-teal-50 via-white to-brand-50',
    badge: 'success',
    figure: 'text-teal-600',
  },
};

/**
 * What each role sees. A plain lookup: the set of roles is fixed by the backend
 * permission matrix and will not grow at runtime, so anything more dynamic would
 * add indirection without adding flexibility.
 */
const PANELS: Record<
  RoleType,
  { heading: string; links: Array<[string, string, string, string]> }
> = {
  admin: {
    heading: 'Platform administration',
    links: [
      ['/dashboard/admin', 'Users, roles and statistics', 'Assign roles, with the last-admin guard.', 'bg-violet-50 text-violet-600'],
      ['/manage/courses', 'Manage courses', 'Create and edit any course on the platform.', 'bg-brand-50 text-brand-600'],
      ['/manage/blog', 'Manage the blog', 'Write posts and control what is published.', 'bg-amber-50 text-amber-600'],
      ['/dashboard/learning', 'Your own learning', 'Courses you have enrolled in yourself.', 'bg-teal-50 text-teal-600'],
    ],
  },
  'content-manager': {
    heading: 'Content management',
    links: [
      ['/manage/courses', 'Courses and lessons', 'Create and edit any course, not only your own.', 'bg-brand-50 text-brand-600'],
      ['/manage/blog', 'Blog posts', 'Write, publish and unpublish.', 'bg-amber-50 text-amber-600'],
      ['/dashboard/learning', 'Your own learning', 'Courses you have enrolled in yourself.', 'bg-teal-50 text-teal-600'],
    ],
  },
  instructor: {
    heading: 'Your courses',
    links: [
      ['/manage/courses', 'Create and edit courses', 'Your own courses, their lessons and quizzes.', 'bg-brand-50 text-brand-600'],
      ['/dashboard/learning', 'Courses you are taking', 'Your progress as a student.', 'bg-teal-50 text-teal-600'],
    ],
  },
  student: {
    heading: 'Your learning',
    links: [
      ['/dashboard/learning', 'Continue a course', 'Pick up where you left off.', 'bg-teal-50 text-teal-600'],
      ['/dashboard/results', 'Quiz results', 'Every attempt, kept as it was marked.', 'bg-amber-50 text-amber-600'],
      ['/courses', 'Find something new', 'Browse the full catalogue.', 'bg-brand-50 text-brand-600'],
    ],
  },
};
