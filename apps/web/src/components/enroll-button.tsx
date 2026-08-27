'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enrollAction } from '@/app/actions/enrollment';

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await enrollAction(courseId);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Enrolling…' : 'Enrol in this course'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
