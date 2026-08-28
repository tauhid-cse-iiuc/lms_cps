import { redirect } from 'next/navigation';
import { apiGet, type AdminStats, type AdminUser } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { RolePicker } from '@/components/role-picker';
import { PageShell, PageHeader, Card, EmptyState, Button, Badge } from '@/components/ui';

export const metadata = { title: 'Admin' };

/** Same hues the dashboard band uses, so a role looks the same everywhere. */
const ROLE_BAR: Record<string, string> = {
  admin: 'bg-violet-500',
  'content-manager': 'bg-amber-500',
  instructor: 'bg-brand-500',
  student: 'bg-teal-500',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  'content-manager': 'Content Manager',
  instructor: 'Instructor',
  student: 'Student',
};

/**
 * The admin panel: platform statistics, and the user list with role assignment.
 *
 * Both endpoints are Admin-only in the permission matrix AND carry the is-admin
 * policy, so this page cannot show anything to a non-admin even if they navigate
 * straight to it - the API returns 403 and there is nothing to render.
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [statsRes, usersRes] = await Promise.all([
    apiGet<{ data: AdminStats }>('/api/admin/stats'),
    apiGet<{ data: AdminUser[] }>('/api/admin/users'),
  ]);

  if (statsRes.status === 403 || usersRes.status === 403) {
    return (
      <PageShell width="narrow">
        <div className="pt-12">
          <EmptyState
            title="Administrators only"
            description="This page needs the Admin role. The API refuses these endpoints to everyone else, so there is nothing here to show you."
            action={<Button href="/dashboard">Back to your dashboard</Button>}
          />
        </div>
      </PageShell>
    );
  }

  const stats = statsRes.ok ? statsRes.data.data : null;
  const users = usersRes.ok ? usersRes.data.data : [];
  const adminCount = users.filter((u) => u.role?.type === 'admin').length;

  const totals = stats
    ? ([
        ['Users', stats.totals.users, 'text-violet-600', 'from-violet-50'],
        ['Courses', stats.totals.courses, 'text-brand-600', 'from-brand-50'],
        ['Lessons', stats.totals.lessons, 'text-brand-600', 'from-brand-50'],
        ['Enrolments', stats.totals.enrollments, 'text-teal-600', 'from-teal-50'],
        ['Quiz attempts', stats.totals.quizAttempts, 'text-amber-600', 'from-amber-50'],
        ['Blog posts', stats.totals.blogPosts, 'text-amber-600', 'from-amber-50'],
      ] as const)
    : [];

  const peak = stats
    ? Math.max(1, ...stats.usersByRole.map((r) => r.count))
    : 1;

  return (
    <PageShell width="wide">
      <PageHeader
        title="Administration"
        description="Platform statistics and role assignment."
      />

      {stats && (
        <>
          <section className="mt-8">
            <h2 className="sr-only">Totals</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {totals.map(([label, value, figure, wash], i) => (
                <div
                  key={label}
                  className={`animate-rise rounded-card border border-ink-200 bg-gradient-to-b ${wash} to-white p-4 shadow-soft`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <dt className="text-micro text-ink-500">{label}</dt>
                  <dd className={`mt-1 text-title font-semibold tabular-nums ${figure}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-10">
            <h2 className="text-title font-semibold">Users by role</h2>
            <ul className="mt-4 space-y-2.5">
              {stats.usersByRole.map((row, i) => (
                <li key={row.role} className="flex items-center gap-4">
                  <span className="w-32 shrink-0 text-small text-ink-600">
                    {ROLE_LABEL[row.role] ?? row.role}
                  </span>
                  {/* A bar rather than a number alone: relative size is the
                      thing being communicated, and the figure is still there. */}
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <span
                      className={`block h-full rounded-full ${ROLE_BAR[row.role] ?? 'bg-brand-400'}`}
                      style={{
                        width: `${(row.count / peak) * 100}%`,
                        animation: `rise 0.5s var(--ease-out-soft) ${0.1 + i * 0.07}s both`,
                      }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-small font-medium tabular-nums">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-200 pb-4">
          <h2 className="text-title font-semibold">Users</h2>
          <p className="text-micro text-ink-500">
            The last remaining administrator cannot be demoted.
          </p>
        </div>

        <ul className="mt-4 space-y-2.5">
          {users.map((u, i) => (
            <li
              key={u.documentId}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}
            >
              <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  {/* Initials avatar. Deterministic hue so a person keeps the
                      same colour between page loads. */}
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-micro font-semibold text-white"
                    style={{
                      background: `oklch(0.62 0.13 ${
                        [...u.username].reduce(
                          (a, c) => (a * 31 + c.charCodeAt(0)) % 360,
                          11
                        )
                      })`,
                    }}
                  >
                    {u.username.slice(0, 2).toUpperCase()}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-small font-medium">
                      {u.username}
                      {u.email === user.email && (
                        <span className="ml-2 text-micro font-normal text-ink-400">
                          you
                        </span>
                      )}
                    </p>
                    <p className="truncate text-micro text-ink-500">{u.email}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {u.blocked && <Badge tone="muted">Blocked</Badge>}
                  <RolePicker
                    userId={u.documentId}
                    current={u.role?.type ?? 'student'}
                    isLastAdmin={u.role?.type === 'admin' && adminCount <= 1}
                    isSelf={u.email === user.email}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
