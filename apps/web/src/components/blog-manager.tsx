'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBlogPostAction,
  deleteBlogPostAction,
  setBlogPostPublishedAction,
} from '@/app/actions/manage';
import type { BlogPost } from '@/lib/api';

const field =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900';

/**
 * Draft and published states come from Strapi's native Draft & Publish, not a
 * status field of our own: `publishedAt` set means published, null means draft.
 * Using the built-in means "only published posts are public" is enforced by the
 * same mechanism that powers the filtering, rather than by a rule we maintain.
 */
export function BlogManager({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const formEl = event.currentTarget;

    startTransition(async () => {
      const res = await createBlogPostAction({
        title: String(form.get('title') ?? ''),
        excerpt: String(form.get('excerpt') ?? ''),
        body: String(form.get('body') ?? ''),
        publish: form.get('publish') === 'on',
      });
      if (!res.ok) setError(res.error);
      else {
        formEl.reset();
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6">
      {error && (
        <p role="alert" className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-slate-600">No posts yet.</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => {
            const published = Boolean(post.publishedAt);
            return (
              <li
                key={post.documentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{post.title}</p>
                  <p className="text-xs text-slate-500">
                    {published ? 'Published' : 'Draft'}
                    {post.author?.username ? ` · ${post.author.username}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 gap-3 text-sm">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await setBlogPostPublishedAction(
                          post.documentId,
                          !published
                        );
                        if (!res.ok) setError(res.error);
                        else router.refresh();
                      })
                    }
                    className="underline disabled:opacity-50"
                  >
                    {published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await deleteBlogPostAction(post.documentId);
                        if (!res.ok) setError(res.error);
                        else router.refresh();
                      })
                    }
                    className="text-red-700 underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-8 space-y-3 rounded border border-slate-200 p-4">
        <h2 className="text-sm font-medium">Write a post</h2>

        <label className="block text-sm font-medium text-slate-700">
          Title
          <input name="title" required className={field} />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Excerpt
          <input name="excerpt" className={field} />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Body
          <textarea name="body" rows={6} className={field} />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input name="publish" type="checkbox" />
          Publish immediately
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Create post'}
        </button>
      </form>
    </div>
  );
}
