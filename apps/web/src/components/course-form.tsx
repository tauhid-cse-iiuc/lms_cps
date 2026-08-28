'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createCourseAction, updateCourseAction } from '@/app/actions/manage';

const field =
  'mt-1 w-full rounded border border-ink-300 px-3 py-2 text-small outline-none focus:border-ink-900';

/**
 * Creates a course, or edits one when `existing` is supplied.
 *
 * There is no owner field, deliberately. Ownership is stamped from the token on
 * the server; offering it here would imply it is negotiable.
 */
export function CourseForm({
  existing,
}: {
  existing?: {
    documentId: string;
    title: string;
    description?: string | null;
    coverImageUrl?: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const form = new FormData(event.currentTarget);
    const input = {
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? ''),
      coverImageUrl: String(form.get('coverImageUrl') ?? ''),
    };

    const formEl = event.currentTarget;

    startTransition(async () => {
      const res = existing
        ? await updateCourseAction(existing.documentId, input)
        : await createCourseAction(input);

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setSaved(true);
      if (!existing) formEl.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <label className="block text-small font-medium text-ink-700">
        Title
        <input
          name="title"
          required
          defaultValue={existing?.title ?? ''}
          className={field}
        />
      </label>

      <label className="block text-small font-medium text-ink-700">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={existing?.description ?? ''}
          className={field}
        />
      </label>

      <label className="block text-small font-medium text-ink-700">
        Cover image URL
        <input
          name="coverImageUrl"
          type="url"
          placeholder="https://…"
          defaultValue={existing?.coverImageUrl ?? ''}
          className={field}
        />
        <span className="mt-1 block text-micro font-normal text-ink-500">
          A link, not an upload. Railway&apos;s filesystem is wiped on every
          redeploy, so an uploaded file would disappear.
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded bg-danger/5 px-3 py-2 text-small text-danger">
          {error}
        </p>
      )}
      {saved && <p className="text-small text-ink-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-ink-900 px-4 py-2 text-small font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : existing ? 'Save changes' : 'Create course'}
      </button>
    </form>
  );
}
