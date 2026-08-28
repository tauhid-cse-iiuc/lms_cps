import { apiGet, type Course } from '@/lib/api';
import { PageShell, PageHeader, EmptyState, ErrorNote, Button } from '@/components/ui';
import { CourseCard } from '@/components/course-card';
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
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
