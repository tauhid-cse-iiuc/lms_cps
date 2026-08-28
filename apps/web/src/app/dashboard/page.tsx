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
      headline = { value: String(res.data.data.totals.users), label: 'users on the platform' };
    }
  }

  const panel = PANELS[role];

  return (
    <PageShell width="wide">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-6 border-b border-ink-200 pb-6">
        <div>
          <p className="text-small text-ink-500">Signed in as</p>
          <h1 className="mt-1 text-display font-semibold tracking-tight">
            {user.username}
          </h1>
          <div className="mt-2">
            <Badge>{user.role.name}</Badge>
          </div>
        </div>

        {headline && (
          <div className="text-right">
            <p className="text-hero font-semibold leading-none tabular-nums">
              {headline.value}
            </p>
            <p className="mt-1 text-small text-ink-500">{headline.label}</p>
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-title font-semibold">{panel.heading}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {panel.links.map(([href, label, description], i) => (
            <li
              key={href}
              className="animate-rise"
              style={{ animationDelay: `${0.06 * i}s` }}
            >
              <Link href={href} className="block h-full">
                <Card interactive className="h-full p-5">
                  <p className="font-medium">{label}</p>
                  <p className="mt-1.5 text-small text-ink-500">{description}</p>
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
  );
}

/**
 * What each role sees. A plain lookup: the set of roles is fixed by the backend
 * permission matrix and will not grow at runtime, so anything more dynamic would
 * add indirection without adding flexibility.
 */
const PANELS: Record<
  RoleType,
  { heading: string; links: Array<[string, string, string]> }
> = {
  admin: {
    heading: 'Platform administration',
    links: [
      ['/dashboard/admin', 'Users, roles and statistics', 'Assign roles, with the last-admin guard.'],
      ['/manage/courses', 'Manage courses', 'Create and edit any course on the platform.'],
      ['/manage/blog', 'Manage the blog', 'Write posts and control what is published.'],
      ['/dashboard/learning', 'Your own learning', 'Courses you have enrolled in yourself.'],
    ],
  },
  'content-manager': {
    heading: 'Content management',
    links: [
      ['/manage/courses', 'Courses and lessons', 'Create and edit any course, not only your own.'],
      ['/manage/blog', 'Blog posts', 'Write, publish and unpublish.'],
      ['/dashboard/learning', 'Your own learning', 'Courses you have enrolled in yourself.'],
    ],
  },
  instructor: {
    heading: 'Your courses',
    links: [
      ['/manage/courses', 'Create and edit courses', 'Your own courses, their lessons and quizzes.'],
      ['/dashboard/learning', 'Courses you are taking', 'Your progress as a student.'],
    ],
  },
  student: {
    heading: 'Your learning',
    links: [
      ['/dashboard/learning', 'Continue a course', 'Pick up where you left off.'],
      ['/dashboard/results', 'Quiz results', 'Every attempt, kept as it was marked.'],
      ['/courses', 'Find something new', 'Browse the full catalogue.'],
    ],
  },
};
