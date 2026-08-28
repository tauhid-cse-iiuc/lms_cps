import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { PageShell, PageHeader, Card, Badge } from '@/components/ui';
import { Avatar } from '@/components/user-menu';
import { ChangePasswordForm } from '@/components/change-password-form';

export const metadata = { title: 'Account settings' };

/**
 * Account settings.
 *
 * Note what cannot be edited here: the role. A user changing their own role is
 * exactly the escalation the whole permission model exists to prevent, and the
 * backend would refuse it anyway - role assignment lives behind the admin panel,
 * with an is-admin policy and a last-admin guard. Showing it as read-only says
 * so plainly rather than offering a control that would fail.
 */
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <PageShell>
      <PageHeader
        title="Account settings"
        description="Your profile and password."
        back={{ href: '/dashboard', label: 'Dashboard' }}
      />

      <Card className="mt-8 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.username} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lead font-semibold">{user.username}</p>
            <p className="truncate text-small text-ink-500">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-ink-100 pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-micro text-ink-500">Role</dt>
            <dd className="mt-1.5 flex items-center gap-2">
              <Badge>{user.role.name}</Badge>
            </dd>
            <p className="mt-2 text-micro leading-relaxed text-ink-500">
              Only an administrator can change this. Your role decides what the
              API will let you do, so it is not something an account can grant
              itself.
            </p>
          </div>

          <div>
            <dt className="text-micro text-ink-500">Email</dt>
            <dd className="mt-1.5 text-small">{user.email}</dd>
            <p className="mt-2 text-micro leading-relaxed text-ink-500">
              Used to sign in. Changing it is not supported in this build.
            </p>
          </div>
        </dl>
      </Card>

      <section className="mt-8">
        <h2 className="text-title font-semibold tracking-tight">Change password</h2>
        <p className="mt-1.5 text-small text-ink-500">
          You will stay signed in on this device. Any other session ends, because
          changing a password revokes the tokens behind it.
        </p>

        <Card className="mt-5 p-6">
          <ChangePasswordForm />
        </Card>
      </section>
    </PageShell>
  );
}
