import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type AdminStats, type AdminUser } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { RolePicker } from '@/components/role-picker';

export const metadata = { title: 'Admin — LMS' };

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
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Administrators only</h1>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          Back to your dashboard
        </Link>
      </main>
    );
  }

  const stats = statsRes.ok ? statsRes.data.data : null;
  const users = usersRes.ok ? usersRes.data.data : [];
  const adminCount = users.filter((u) => u.role?.type === 'admin').length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Administration</h1>
        <Link href="/dashboard" className="text-sm underline">
          Dashboard
        </Link>
      </header>

      {stats && (
        <section className="mt-6">
          <h2 className="text-lg font-medium">Platform</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['Users', stats.totals.users],
              ['Courses', stats.totals.courses],
              ['Lessons', stats.totals.lessons],
              ['Enrolments', stats.totals.enrollments],
              ['Quiz attempts', stats.totals.quizAttempts],
              ['Blog posts', stats.totals.blogPosts],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded border border-slate-200 p-3">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-6 text-sm font-medium">Users by role</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {stats.usersByRole.map((row) => (
              <li key={row.role} className="flex justify-between rounded border border-slate-200 px-3 py-2">
                <span>{row.role}</span>
                <span className="font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-medium">Users</h2>
        <p className="mt-1 text-xs text-slate-500">
          The last remaining administrator cannot be demoted — losing it would
          leave nobody able to assign roles.
        </p>

        <ul className="mt-4 space-y-2">
          {users.map((u) => (
            <li
              key={u.documentId}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.username}</p>
                <p className="truncate text-xs text-slate-500">{u.email}</p>
              </div>
              <RolePicker
                userId={u.documentId}
                current={u.role?.type ?? 'student'}
                isLastAdmin={u.role?.type === 'admin' && adminCount <= 1}
                isSelf={u.email === user.email}
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
