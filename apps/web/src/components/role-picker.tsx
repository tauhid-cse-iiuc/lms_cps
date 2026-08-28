'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setUserRoleAction } from '@/app/actions/manage';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'content-manager', label: 'Content Manager' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'student', label: 'Student' },
];

/**
 * Changes one user's role.
 *
 * The control is disabled for the last remaining admin. That is a courtesy, not
 * the guard - the backend refuses the change regardless, and if this component
 * were wrong about the count the request would still be rejected. Disabling it
 * here just means the user finds out before they click rather than after.
 */
export function RolePicker({
  userId,
  current,
  isLastAdmin,
  isSelf,
}: {
  userId: string;
  current: string;
  isLastAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 flex-col items-end">
      <div className="flex items-center gap-2">
        {isSelf && <span className="text-micro text-ink-500">you</span>}
        <select
          value={value}
          disabled={pending || isLastAdmin}
          aria-label="Role"
          onChange={(event) => {
            const next = event.target.value;
            const previous = value;
            setValue(next);
            setError(null);

            startTransition(async () => {
              const res = await setUserRoleAction(userId, next);
              if (!res.ok) {
                setValue(previous);
                setError(res.error);
                return;
              }
              router.refresh();
            });
          }}
          className="rounded border border-ink-300 px-2 py-1 text-small disabled:opacity-50"
        >
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {isLastAdmin && (
        <span className="mt-1 text-micro text-ink-500">last administrator</span>
      )}
      {error && (
        <span role="alert" className="mt-1 max-w-xs text-right text-micro text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
