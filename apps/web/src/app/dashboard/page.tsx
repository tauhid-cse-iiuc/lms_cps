import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, type RoleType } from '@/lib/auth';
import { SignOutButton } from '@/components/sign-out-button';

export const metadata = { title: 'Dashboard — LMS' };

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{user.username}</h1>
          <p className="text-sm text-slate-600">
            Signed in as <span className="font-medium">{user.role.name}</span>
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="mt-8">
        <RolePanel role={role} />
      </section>

      <section className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-medium text-slate-600">Everyone</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <PanelLink href="/courses" label="Browse all courses" />
          <PanelLink href="/blog" label="Read the blog" />
        </ul>
      </section>
    </main>
  );
}

function PanelLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded border border-slate-200 px-4 py-3 text-sm hover:border-slate-400"
      >
        {label}
      </Link>
    </li>
  );
}

/**
 * What each role sees. Deliberately a plain lookup: the set of roles is fixed by
 * the backend permission matrix and will not grow at runtime, so anything more
 * dynamic would add indirection without adding flexibility.
 */
function RolePanel({ role }: { role: RoleType }) {
  const panels: Record<RoleType, { heading: string; links: Array<[string, string]> }> = {
    admin: {
      heading: 'Platform administration',
      links: [
        ['/dashboard/admin', 'Users, roles and statistics'],
        ['/manage/courses', 'Manage courses'],
        ['/manage/blog', 'Manage the blog'],
      ],
    },
    'content-manager': {
      heading: 'Content management',
      links: [
        ['/manage/courses', 'Manage courses and lessons'],
        ['/manage/blog', 'Write and publish blog posts'],
      ],
    },
    instructor: {
      heading: 'Your courses',
      links: [
        ['/manage/courses', 'Create and edit your courses'],
        ['/dashboard/learning', 'Courses you are enrolled in'],
      ],
    },
    student: {
      heading: 'Your learning',
      links: [
        ['/dashboard/learning', 'Continue your courses'],
        ['/dashboard/results', 'Your quiz results'],
        ['/courses', 'Find something new'],
      ],
    },
  };

  const panel = panels[role];

  return (
    <>
      <h2 className="text-lg font-medium">{panel.heading}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {panel.links.map(([href, label]) => (
          <PanelLink key={href} href={href} label={label} />
        ))}
      </ul>
    </>
  );
}
