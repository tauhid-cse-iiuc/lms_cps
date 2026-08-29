import { redirect } from 'next/navigation';
import { getCurrentUser, displayName } from '@/lib/auth';
import { apiGet } from '@/lib/api';
import { PageShell, PageHeader, Card, Badge } from '@/components/ui';
import { Avatar } from '@/components/user-menu';
import { ChangePasswordForm } from '@/components/change-password-form';
import { NewPasswordForm } from '@/components/new-password-form';
import { ProfileForm } from '@/components/profile-form';

type PasswordStatus = { provider: string; hasPassword: boolean };

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

  /**
   * A Google account has no password, so the change form - which verifies the
   * current one - could never succeed for it. Showing it anyway would be a
   * control that fails whatever you type into it, so the page asks first and
   * renders whichever of the two forms can actually work.
   *
   * If the check itself fails, the change form is the safe default: it verifies
   * before it writes, so offering it wrongly costs an error message, while
   * offering the set form wrongly would be offering a form the backend refuses.
   */
  const status = await apiGet<{ data: PasswordStatus }>(
    '/api/account/password-status'
  );
  const hasPassword = status.ok ? status.data.data.hasPassword : true;

  return (
    <PageShell width="wide">
      <PageHeader
        title="Account settings"
        description="Your profile and password."
        back={{ href: '/dashboard', label: 'Dashboard' }}
      />

      {/* One card, two columns on a wide screen: who you are on the left, your
          password on the right. Stacked as one list on narrow screens, where
          side-by-side would just be two cramped columns. */}
      <Card className="mt-6 overflow-hidden p-0">
        <div className="flex items-center gap-3.5 border-b border-ink-100 px-5 py-4">
          <Avatar name={displayName(user)} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{displayName(user)}</p>
            <p className="truncate text-micro text-ink-500">
              @{user.username} · {user.email}
            </p>
          </div>
          <span className="ml-auto shrink-0">
            <Badge>{user.role.name}</Badge>
          </span>
        </div>

        <div className="grid lg:grid-cols-2">
          <div className="space-y-5 border-b border-ink-100 p-5 lg:border-b-0 lg:border-r">
            <Field label="Name" hint="The name people see — on your courses, your posts and your dashboard.">
              <ProfileForm name={user.name ?? ''} />
            </Field>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Readonly
                label="Username"
                hint="The handle you sign in with. Separate from your name on purpose, so changing how you are addressed never changes how you sign in. Not editable in this build."
              >
                @{user.username}
              </Readonly>

              <Readonly
                label="Email"
                hint="Used to sign in and to reach you. Not editable in this build."
              >
                {user.email}
              </Readonly>

              <Readonly
                label="Role"
                hint="Decides what the API will let you do, which is why an account cannot grant it to itself. Only an administrator can change it."
              >
                {user.role.name}
              </Readonly>
            </dl>
          </div>

          <div className="p-5">
            <Field
              label={hasPassword ? 'Change password' : 'Add a password'}
              hint={
                hasPassword
                  ? 'You stay signed in on this device. Any other session ends, because changing a password revokes the tokens behind it.'
                  : 'This account was created with Google and has no password, so Google is currently the only way in. Add one to be able to sign in either way.'
              }
            >
              {hasPassword ? (
                <ChangePasswordForm />
              ) : (
                <NewPasswordForm
                  endpoint="/api/auth/set-password"
                  submitLabel="Save password"
                  busyLabel="Saving…"
                  redirectTo="/account"
                />
              )}
            </Field>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}

/** A labelled control: heading, its "?" , then whatever edits it. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-small font-semibold">
        {label}
        <Hint>{hint}</Hint>
      </h2>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

/** A fact about the account that this page cannot change. */
function Readonly({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-micro text-ink-500">
        {label}
        <Hint>{hint}</Hint>
      </dt>
      <dd className="mt-1 truncate text-small">{children}</dd>
    </div>
  );
}

/**
 * The "?" beside a label, and the explanation it hides.
 *
 * Pure CSS - no state, no effect, so the page stays a server component. It
 * shows on hover AND on focus, which is not decoration: a keyboard user tabs to
 * it and a touch user taps it, and both of those are focus rather than hover.
 * A tooltip that only answers to a mouse is a tooltip half the people reading
 * the page cannot open.
 *
 * The button is real and typed `button` on purpose. A `<span>` with a hover
 * handler is invisible to assistive technology and unreachable by keyboard, and
 * inside a form an untyped button submits it.
 */
function Hint({ children }: { children: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`What is this? ${children}`}
        className="grid h-4 w-4 shrink-0 cursor-help place-items-center rounded-full border border-ink-300 text-[0.6rem] font-bold leading-none text-ink-400 transition-colors hover:border-ink-400 hover:text-ink-700 focus-visible:border-brand-500 focus-visible:text-brand-600 focus-visible:outline-none"
      >
        ?
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-60 rounded-lg bg-night-900 px-3 py-2 text-micro font-normal leading-relaxed text-white opacity-0 shadow-lift transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
