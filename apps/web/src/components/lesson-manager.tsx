'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  createLessonAction,
  deleteLessonAction,
  updateLessonAction,
} from '@/app/actions/manage';
import type { Lesson } from '@/lib/api';

const field =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900';

/**
 * Lessons for one course.
 *
 * `order` is an explicit, editable integer rather than something inferred from
 * position in the list. Inferring it would mean every reorder rewrites every
 * lesson, and it would leave no way to insert a lesson between two others
 * without touching both.
 */
export function LessonManager({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: Lesson[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nextOrder =
    lessons.length === 0 ? 1 : Math.max(...lessons.map((l) => l.order ?? 0)) + 1;

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const formEl = event.currentTarget;

    startTransition(async () => {
      const res = await createLessonAction({
        courseId,
        title: String(form.get('title') ?? ''),
        content: String(form.get('content') ?? ''),
        videoUrl: String(form.get('videoUrl') ?? ''),
        order: Number(form.get('order') ?? nextOrder),
      });
      if (!res.ok) setError(res.error);
      else {
        formEl.reset();
        router.refresh();
      }
    });
  }

  function handleUpdate(documentId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await updateLessonAction(documentId, courseId, {
        title: String(form.get('title') ?? ''),
        content: String(form.get('content') ?? ''),
        videoUrl: String(form.get('videoUrl') ?? ''),
        order: Number(form.get('order') ?? 1),
      });
      if (!res.ok) setError(res.error);
      else {
        setEditing(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-4">
      {error && (
        <p role="alert" className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {lessons.length === 0 ? (
        <p className="text-sm text-slate-600">No lessons yet.</p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.documentId} className="rounded border border-slate-200 p-3">
              {editing === lesson.documentId ? (
                <form onSubmit={(e) => handleUpdate(lesson.documentId, e)} className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Title
                    <input name="title" required defaultValue={lesson.title} className={field} />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Order
                    <input
                      name="order"
                      type="number"
                      min={1}
                      required
                      defaultValue={lesson.order}
                      className={field}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Video URL
                    <input
                      name="videoUrl"
                      type="url"
                      defaultValue={lesson.videoUrl ?? ''}
                      className={field}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Content
                    <textarea
                      name="content"
                      rows={5}
                      defaultValue={lesson.content ?? ''}
                      className={field}
                    />
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-sm underline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm">
                    <span className="text-slate-500">{lesson.order}.</span> {lesson.title}
                  </span>
                  <span className="flex shrink-0 gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setEditing(lesson.documentId)}
                      className="underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await deleteLessonAction(lesson.documentId, courseId);
                          if (!res.ok) setError(res.error);
                          else router.refresh();
                        })
                      }
                      className="text-red-700 underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-6 space-y-3 rounded border border-slate-200 p-4">
        <h3 className="text-sm font-medium">Add a lesson</h3>
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input name="title" required className={field} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Order
          <input name="order" type="number" min={1} defaultValue={nextOrder} className={field} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Video URL
          <input name="videoUrl" type="url" placeholder="https://…" className={field} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Content
          <textarea name="content" rows={4} className={field} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Add lesson'}
        </button>
      </form>
    </div>
  );
}
