import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet, type BlogPost } from '@/lib/api';

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await apiGet<{ data: BlogPost }>(`/api/blog-posts/${id}?populate=author`);
  if (!res.ok || !res.data?.data) notFound();

  const post = res.data.data;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/blog" className="text-sm text-slate-600 underline">
        &larr; Blog
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{post.title}</h1>
      <p className="mt-1 text-xs text-slate-500">
        {post.author?.username ? `by ${post.author.username}` : null}
        {post.publishedAt
          ? ` · ${new Date(post.publishedAt).toLocaleDateString()}`
          : ' · draft'}
      </p>

      {post.excerpt && <p className="mt-4 text-slate-700">{post.excerpt}</p>}
      {post.body && (
        <div className="mt-6 whitespace-pre-wrap text-slate-800">{post.body}</div>
      )}
    </main>
  );
}
