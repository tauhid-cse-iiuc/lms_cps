import Link from 'next/link';
import { apiGet, type BlogPost } from '@/lib/api';

export const metadata = { title: 'Blog — LMS' };

/**
 * The public blog.
 *
 * Readable with no account at all. Drafts are not merely hidden here - the
 * backend pins `status=published` for anyone without write access, so a visitor
 * appending ?status=draft gets published posts anyway.
 */
export default async function BlogPage() {
  const res = await apiGet<{ data: BlogPost[] }>(
    '/api/blog-posts?populate=author&sort=publishedAt:desc'
  );
  const posts = res.ok ? res.data.data : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Blog</h1>
        <Link href="/courses" className="text-sm underline">
          Courses
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600">Nothing published yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {posts.map((post) => (
            <li key={post.documentId}>
              <Link
                href={`/blog/${post.documentId}`}
                className="block rounded border border-slate-200 p-4 hover:border-slate-400"
              >
                <h2 className="font-medium">{post.title}</h2>
                {post.excerpt && (
                  <p className="mt-1 text-sm text-slate-600">{post.excerpt}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {post.author?.username ? `by ${post.author.username}` : null}
                  {post.publishedAt
                    ? ` · ${new Date(post.publishedAt).toLocaleDateString()}`
                    : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
