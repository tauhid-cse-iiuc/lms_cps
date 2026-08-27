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
    <main className="mx-auto max-w-4xl px-6 py-10">
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
    </main>
  );
}

/**
 * What each role sees. Deliberately a plain switch: the set of roles is fixed by
 * the backend permission matrix and is not going to grow at runtime, so a lookup
 * table would add indirection without adding flexibility.
 */
function RolePanel({ role }: { role: RoleType }) {
  const panels: Record<RoleType, { heading: string; items: string[] }> = {
    admin: {
      heading: 'Platform administration',
      items: [
        'Manage users and assign roles',
        'Browse every course and enrolment',
        'Platform statistics',
      ],
    },
    'content-manager': {
      heading: 'Content management',
      items: ['Create and edit any course', 'Manage lessons and quizzes', 'Write blog posts'],
    },
    instructor: {
      heading: 'Your courses',
      items: ['Create a course', 'Add lessons and quizzes', 'See who is enrolled and how far they are'],
    },
    student: {
      heading: 'Your learning',
      items: ['Browse the catalogue', 'Continue a course', 'Take a quiz'],
    },
  };

  const panel = panels[role];

  return (
    <>
      <h2 className="text-lg font-medium">{panel.heading}</h2>
      <ul className="mt-3 space-y-2">
        {panel.items.map((item) => (
          <li key={item} className="rounded border border-slate-200 px-4 py-3 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}
