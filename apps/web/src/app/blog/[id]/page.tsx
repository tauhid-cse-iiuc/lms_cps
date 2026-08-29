import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet, type BlogPost } from '@/lib/api';
import { PageShell, Badge } from '@/components/ui';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiGet<{ data: BlogPost }>(`/api/blog-posts/${id}`);
  return {
    title: res.ok ? res.data.data.title : 'Post',
    description: res.ok ? (res.data.data.excerpt ?? undefined) : undefined,
  };
}

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
    <PageShell width="narrow">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-small text-ink-500 transition-colors hover:text-ink-900"
      >
        <span aria-hidden>&larr;</span> Blog
      </Link>

      <article className="animate-rise mt-6">
        <div className="flex flex-wrap items-center gap-2 text-micro text-ink-400">
          {(post.authorName ?? post.author?.username) && (
            <span>by {post.authorName ?? post.author?.username}</span>
          )}
          {post.publishedAt ? (
            <>
              <span aria-hidden>·</span>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            </>
          ) : (
            <Badge tone="muted">Draft</Badge>
          )}
        </div>

        <h1 className="mt-3 text-display font-semibold leading-tight tracking-tight">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 text-lead leading-relaxed text-ink-600">
            {post.excerpt}
          </p>
        )}

        {post.body && (
          <div className="mt-8 whitespace-pre-line text-body leading-[1.75] text-ink-700">
            {post.body}
          </div>
        )}
      </article>
    </PageShell>
  );
}
