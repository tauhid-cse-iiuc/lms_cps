import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet, type Course } from '@/lib/api';
import { Hero } from '@/components/hero';
import { Card } from '@/components/ui';

/**
 * The landing page.
 *
 * It shows real courses rather than placeholder marketing, because the
 * catalogue is public - the Public role holds course.find - so there is nothing
 * to hide and an empty-looking home page would undersell a working application.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const res = await apiGet<{ data: Course[] }>('/api/courses?populate=owner');
  const courses = res.ok ? res.data.data.slice(0, 3) : [];

  return (
    <>
      <Hero signedIn={Boolean(user)}>
        {courses.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-small font-medium text-ink-500">
                Available now
              </h2>
              <Link
                href="/courses"
                className="text-small text-ink-500 transition-colors hover:text-ink-900"
              >
                All courses &rarr;
              </Link>
            </div>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course, i) => (
                <li
                  key={course.documentId}
                  className="animate-rise"
                  style={{ animationDelay: `${0.4 + i * 0.08}s` }}
                >
                  <Link href={`/courses/${course.documentId}`} className="block h-full">
                    <Card interactive className="h-full p-5">
                      <h3 className="font-medium leading-snug">{course.title}</h3>
                      {course.description && (
                        <p className="mt-2 line-clamp-3 text-small text-ink-500">
                          {course.description}
                        </p>
                      )}
                      {course.owner?.username && (
                        <p className="mt-3 text-micro text-ink-400">
                          {course.owner.username}
                        </p>
                      )}
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Hero>

      <section className="border-t border-ink-200 bg-ink-50/60">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:grid-cols-3 sm:px-6">
          {[
            {
              title: 'Enforced on the server',
              body: 'Four roles, a permission matrix, ownership policies and controller-level scoping. Hiding a button is a courtesy, not a control.',
            },
            {
              title: 'Progress that stays true',
              body: 'Counted from completions on every read, never stored — so adding a lesson moves everyone’s figure instead of silently invalidating it.',
            },
            {
              title: 'Quizzes marked server-side',
              body: 'The answer key never reaches the browser, and no endpoint accepts a score from a client.',
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-small font-semibold">{item.title}</h3>
              <p className="mt-2 text-small leading-relaxed text-ink-600">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
