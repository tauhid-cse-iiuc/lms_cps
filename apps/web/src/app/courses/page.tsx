import Link from 'next/link';
import { apiGet, type Course } from '@/lib/api';
import { PageShell, PageHeader, Card, EmptyState, ErrorNote, Button } from '@/components/ui';
import { CourseSearch } from '@/components/course-search';

export const metadata = { title: 'Courses' };

/**
 * The public catalogue.
 *
 * Readable signed out on purpose: the Public role holds course.find and
 * course.findOne and nothing else, so a visitor can see WHAT exists without
 * getting the lessons. This page is the reason that permission exists.
 *
 * Search runs on the SERVER, through the query string. Filtering an
 * already-fetched array in the browser would be less code and would only ever
 * search the first page of results - and it would stop working entirely the
 * moment the catalogue outgrew one page.
 */
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? '').trim();

  // $containsi is case-insensitive. Searching title OR description means a
  // course is findable by what it is about, not only by what it is called.
  const filter = term
    ? `&filters[$or][0][title][$containsi]=${encodeURIComponent(term)}` +
      `&filters[$or][1][description][$containsi]=${encodeURIComponent(term)}`
    : '';

  const res = await apiGet<{ data: Course[] }>(
    `/api/courses?populate=owner&sort=createdAt:desc${filter}`
  );
  const courses = res.ok ? res.data.data : [];

  return (
    <PageShell width="wide">
      <PageHeader
        title="Courses"
        description={
          term
            ? `${courses.length} result${courses.length === 1 ? '' : 's'} for “${term}”`
            : `${courses.length} course${courses.length === 1 ? '' : 's'} available`
        }
        action={<CourseSearch initial={term} />}
      />

      {!res.ok && (
        <div className="mt-6">
          <ErrorNote>{res.error}</ErrorNote>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={term ? 'Nothing matched that search' : 'No courses yet'}
            description={
              term
                ? 'Try a shorter or more general term.'
                : 'Courses will appear here once an instructor publishes one.'
            }
            action={term ? <Button href="/courses" variant="secondary">Clear search</Button> : undefined}
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <li
              key={course.documentId}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
            >
              <Link href={`/courses/${course.documentId}`} className="block h-full">
                <Card interactive className="flex h-full flex-col overflow-hidden">
                  <CourseCover url={course.coverImageUrl} title={course.title} />

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-medium leading-snug">{course.title}</h2>
                    {course.description && (
                      <p className="mt-2 line-clamp-3 flex-1 text-small text-ink-500">
                        {course.description}
                      </p>
                    )}
                    {course.owner?.username && (
                      <p className="mt-4 text-micro text-ink-400">
                        {course.owner.username}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

/**
 * Cover image, or a generated stand-in.
 *
 * `coverImageUrl` is a plain URL rather than an upload, because Railway's
 * filesystem is wiped on every redeploy and an uploaded file would vanish. Most
 * courses will not have one, so the fallback has to look deliberate rather than
 * broken: a tinted panel derived from the title, which is stable per course.
 */
function CourseCover({ url, title }: { url?: string | null; title: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary external
      // host; next/image would need every domain allow-listed in advance.
      <img
        src={url}
        alt=""
        loading="lazy"
        className="aspect-[16/9] w-full object-cover"
      />
    );
  }

  // Deterministic hue from the title, so a course keeps the same colour.
  const hue = [...title].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360, 7);

  return (
    <div
      aria-hidden
      className="grid aspect-[16/9] w-full place-items-center"
      style={{
        background: `linear-gradient(135deg, oklch(0.93 0.05 ${hue}), oklch(0.86 0.08 ${(hue + 40) % 360}))`,
      }}
    >
      <span className="text-display font-semibold text-white/70">
        {title.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}
