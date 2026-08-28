import { redirect } from 'next/navigation';
import { apiGet, type BlogPost } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { BlogManager } from '@/components/blog-manager';
import { PageShell, PageHeader, EmptyState, ErrorNote, Button } from '@/components/ui';

export const metadata = { title: 'Manage blog' };

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
      <PageShell width="narrow">
        <div className="pt-12">
          <EmptyState
            title="Not available for your role"
            description="Writing the blog needs the Content Manager or Admin role."
            action={<Button href="/dashboard">Back to your dashboard</Button>}
          />
        </div>
      </PageShell>
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
    <PageShell>
      <PageHeader
        title="Blog posts"
        description={`${posts.length} post${posts.length === 1 ? '' : 's'} · ${liveIds.size} published`}
        action={
          <Button href="/blog" variant="secondary">
            View public blog
          </Button>
        }
      />

      {!allRes.ok && (
        <div className="mt-6">
          <ErrorNote>{allRes.error}</ErrorNote>
        </div>
      )}

      <BlogManager posts={posts} />
    </PageShell>
  );
}
