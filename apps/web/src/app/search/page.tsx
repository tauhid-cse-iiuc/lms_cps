import Link from 'next/link';
import { apiGet, type Course, type BlogPost, type Lesson } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { PageShell, PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { SearchBox } from '@/components/search-box';

export const metadata = { title: 'Search' };

type LessonHit = Lesson & { course?: { documentId: string; title: string } | null };

/**
 * Search across everything the caller is allowed to see.
 *
 * The important word is "allowed". This fires three requests and does no
 * filtering of its own, because each endpoint is already scoped by the backend:
 *
 *   courses     public - the catalogue is a shop window
 *   blog-posts  public, and drafts are pinned out for anyone without write access
 *   lessons     scoped to courses the caller is enrolled in, or owns
 *
 * So a signed-out visitor searching for a phrase that appears only inside a
 * lesson gets nothing back for it, and that is correct rather than a gap. The
 * alternative - searching everything server-side and then hiding results - would
 * leak the existence of material through the result count alone.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? '').trim();
  const user = await getCurrentUser();

  if (!term) {
    return (
      <PageShell>
        <PageHeader
          title="Search"
          description="Courses, lessons and posts — whatever you have access to."
        />
        <div className="mt-8">
          <SearchBox initial="" autoFocus />
        </div>
        <div className="mt-8">
          <EmptyState
            title="Type to search"
            description="Try a topic, a course title, or a phrase from a lesson you are enrolled in."
          />
        </div>
      </PageShell>
    );
  }

  const enc = encodeURIComponent(term);

  const [coursesRes, postsRes, lessonsRes] = await Promise.all([
    apiGet<{ data: Course[] }>(
      `/api/courses?populate=owner` +
        `&filters[$or][0][title][$containsi]=${enc}` +
        `&filters[$or][1][description][$containsi]=${enc}`
    ),
    apiGet<{ data: BlogPost[] }>(
      `/api/blog-posts?populate=author` +
        `&filters[$or][0][title][$containsi]=${enc}` +
        `&filters[$or][1][excerpt][$containsi]=${enc}` +
        `&filters[$or][2][body][$containsi]=${enc}`
    ),
    // Only worth asking when signed in: lessons are refused outright to
    // anonymous callers, so this would always be an empty 403.
    user
      ? apiGet<{ data: LessonHit[] }>(
          `/api/lessons?populate=course` +
            `&filters[$or][0][title][$containsi]=${enc}` +
            `&filters[$or][1][content][$containsi]=${enc}`
        )
      : Promise.resolve({ ok: false as const, status: 401, error: 'not signed in' }),
  ]);

  const courses = coursesRes.ok ? coursesRes.data.data : [];
  const posts = postsRes.ok ? postsRes.data.data : [];
  const lessons = lessonsRes.ok ? lessonsRes.data.data : [];
  const total = courses.length + posts.length + lessons.length;

  return (
    <PageShell>
      <PageHeader
        title="Search"
        description={
          total === 0
            ? `Nothing found for “${term}”`
            : `${total} result${total === 1 ? '' : 's'} for “${term}”`
        }
      />

      <div className="mt-8">
        <SearchBox initial={term} />
      </div>

      {total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No matches"
            description={
              user
                ? 'Try a shorter or more general term.'
                : 'Try a shorter term — and note that lesson content is only searchable once you are signed in and enrolled.'
            }
          />
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <ResultGroup heading="Courses" count={courses.length}>
            {courses.map((course) => (
              <ResultRow
                key={course.documentId}
                href={`/courses/${course.documentId}`}
                title={course.title}
                meta={course.owner?.username ? `by ${course.owner.username}` : undefined}
                snippet={course.description}
                tone="neutral"
                label="Course"
              />
            ))}
          </ResultGroup>

          <ResultGroup heading="Lessons" count={lessons.length}>
            {lessons.map((lesson) => (
              <ResultRow
                key={lesson.documentId}
                href={
                  lesson.course
                    ? `/learn/${lesson.course.documentId}/${lesson.documentId}`
                    : '/dashboard/learning'
                }
                title={lesson.title}
                meta={lesson.course?.title}
                snippet={lesson.content}
                tone="success"
                label="Lesson"
              />
            ))}
          </ResultGroup>

          <ResultGroup heading="Blog" count={posts.length}>
            {posts.map((post) => (
              <ResultRow
                key={post.documentId}
                href={`/blog/${post.documentId}`}
                title={post.title}
                meta={post.author?.username ? `by ${post.author.username}` : undefined}
                snippet={post.excerpt ?? post.body}
                tone="warn"
                label="Post"
              />
            ))}
          </ResultGroup>
        </div>
      )}
    </PageShell>
  );
}

function ResultGroup({
  heading,
  count,
  children,
}: {
  heading: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <section>
      <h2 className="text-small font-semibold text-ink-500">
        {heading}
        <span className="ml-2 font-normal text-ink-400">{count}</span>
      </h2>
      <ul className="mt-3 space-y-2.5">{children}</ul>
    </section>
  );
}

function ResultRow({
  href,
  title,
  meta,
  snippet,
  tone,
  label,
}: {
  href: string;
  title: string;
  meta?: string | null;
  snippet?: string | null;
  tone: 'neutral' | 'success' | 'warn';
  label: string;
}) {
  return (
    <li>
      <Link href={href} className="group block">
        <Card interactive className="p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone={tone}>{label}</Badge>
            {meta && <span className="text-micro text-ink-400">{meta}</span>}
          </div>
          <p className="mt-2 font-semibold leading-snug transition-colors group-hover:text-brand-700">
            {title}
          </p>
          {snippet && (
            <p className="mt-1.5 line-clamp-2 text-small leading-relaxed text-ink-500">
              {snippet}
            </p>
          )}
        </Card>
      </Link>
    </li>
  );
}
