import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type BlogPost } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { BlogManager } from '@/components/blog-manager';

export const metadata = { title: 'Manage blog — LMS' };

/**
 * Blog authoring, for Admins and Content Managers.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FETCHES TWICE
 * ---------------------------------------------------------------------------
 * `?status=draft` returns the DRAFT version of every document - including
 * documents that also have a published version. On those draft versions
 * `publishedAt` is null, always. So the obvious check, "publishedAt is set
 * therefore it is live", reports every post as a draft and the Publish button
 * never turns into Unpublish.
 *
 * The reliable question is not "does this row have a date" but "does a published
 * version of this document exist" - so the published list is fetched too, and
 * membership of it is what decides the label. Two small requests, and a badge
 * that tells the truth.
 */
export default async function ManageBlogPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!['admin', 'content-manager'].includes(user.role.type)) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Not available for your role</h1>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          Back to your dashboard
        </Link>
      </main>
    );
  }

  const [allRes, liveRes] = await Promise.all([
    apiGet<{ data: BlogPost[] }>(
      '/api/blog-posts?status=draft&populate=author&sort=createdAt:desc'
    ),
    apiGet<{ data: BlogPost[] }>('/api/blog-posts?fields[0]=title'),
  ]);

  const all = allRes.ok ? allRes.data.data : [];
  const liveIds = new Set(
    (liveRes.ok ? liveRes.data.data : []).map((p) => p.documentId)
  );

  const posts = all.map((post) => ({
    ...post,
    isPublished: liveIds.has(post.documentId),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Blog posts</h1>
        <Link href="/blog" className="text-sm underline">
          View public blog
        </Link>
      </header>

      {!allRes.ok && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {allRes.error}
        </p>
      )}

      <BlogManager posts={posts} />
    </main>
  );
}
