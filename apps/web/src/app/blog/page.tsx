import Link from 'next/link';
import { apiGet, type BlogPost } from '@/lib/api';
import { PageShell, PageHeader, Card, EmptyState } from '@/components/ui';

export const metadata = { title: 'Blog' };

/**
 * The public blog.
 *
 * Readable with no account at all. Drafts are not merely hidden here - the
 * backend pins `status=published` for anyone without write access, so a visitor
 * appending ?status=draft receives published posts anyway.
 */
export default async function BlogPage() {
  const res = await apiGet<{ data: BlogPost[] }>(
    '/api/blog-posts?populate=author&sort=publishedAt:desc'
  );
  const posts = res.ok ? res.data.data : [];
  const [lead, ...rest] = posts;

  return (
    <PageShell>
      <PageHeader
        title="Blog"
        description={`${posts.length} post${posts.length === 1 ? '' : 's'}`}
      />

      {posts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing published yet"
            description="Posts appear here once a content manager publishes one."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {/* The most recent post gets more room. A uniform list makes every
              post look equally stale; this gives the page a focal point. */}
          <Link href={`/blog/${lead.documentId}`} className="block animate-rise">
            <Card interactive className="p-6 sm:p-8">
              <PostMeta post={lead} />
              <h2 className="mt-2 text-title font-semibold leading-snug">
                {lead.title}
              </h2>
              {lead.excerpt && (
                <p className="mt-3 text-body leading-relaxed text-ink-600">
                  {lead.excerpt}
                </p>
              )}
              <p className="mt-4 text-small font-medium text-brand-600">
                Read post &rarr;
              </p>
            </Card>
          </Link>

          {rest.map((post, i) => (
            <Link
              key={post.documentId}
              href={`/blog/${post.documentId}`}
              className="block animate-rise"
              style={{ animationDelay: `${0.06 * (i + 1)}s` }}
            >
              <Card interactive className="p-5">
                <PostMeta post={post} />
                <h2 className="mt-1.5 font-medium leading-snug">{post.title}</h2>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-2 text-small text-ink-500">
                    {post.excerpt}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function PostMeta({ post }: { post: BlogPost }) {
  const parts = [
    post.authorName ?? post.author?.username
      ? `by ${post.authorName ?? post.author?.username}`
      : null,
    post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return <p className="text-micro text-ink-400">{parts.join(' · ')}</p>;
}
