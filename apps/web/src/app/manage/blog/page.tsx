import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiGet, type BlogPost } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { BlogManager } from '@/components/blog-manager';

export const metadata = { title: 'Manage blog — LMS' };

/**
 * Blog authoring, for Admins and Content Managers.
 *
 * `status=draft` here asks Strapi for the draft version of every post, which is
 * how an unpublished post becomes visible to the people who may edit it. The
 * backend allows that parameter only for those roles - for anyone else the
 * status is pinned to published regardless of what the query string says.
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

  const res = await apiGet<{ data: BlogPost[] }>(
    '/api/blog-posts?status=draft&populate=author&sort=createdAt:desc'
  );
  const posts = res.ok ? res.data.data : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Blog posts</h1>
        <Link href="/blog" className="text-sm underline">
          View public blog
        </Link>
      </header>

      {!res.ok && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {res.error}
        </p>
      )}

      <BlogManager posts={posts} />
    </main>
  );
}
