import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet, type Course, type BlogPost } from '@/lib/api';
import { Hero } from '@/components/hero';
import { CourseCard } from '@/components/course-card';

/**
 * The landing page.
 *
 * It shows real courses and real counts rather than placeholder marketing,
 * because the catalogue is public - the Public role holds course.find - so there
 * is nothing to hide, and an empty-looking home page would undersell a working
 * application.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  const [coursesRes, blogRes] = await Promise.all([
    apiGet<{ data: Course[] }>('/api/courses?populate=owner'),
    apiGet<{ data: BlogPost[] }>('/api/blog-posts?sort=publishedAt:desc'),
  ]);

  const courses = coursesRes.ok ? coursesRes.data.data : [];
  const posts = blogRes.ok ? blogRes.data.data : [];

  // Counted from what is actually there. A hard-coded "10,000 learners" on an
  // application with four demo accounts is the fastest way to lose a reader's
  // trust in everything else on the page.
  const lessonTotal = courses.reduce((n, c) => n + (c.lessonCount ?? 0), 0);

  const stats = [
    { value: String(courses.length), label: courses.length === 1 ? 'course' : 'courses' },
    { value: '4', label: 'roles' },
    { value: String(posts.length), label: posts.length === 1 ? 'post' : 'posts' },
  ];

  return (
    <>
      <Hero signedIn={Boolean(user)} stats={stats}>
        {courses.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-small font-semibold text-ink-500">
                Available now
              </h2>
              <Link
                href="/courses"
                className="text-small font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                All courses &rarr;
              </Link>
            </div>

            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((course, i) => (
                <li
                  key={course.documentId}
                  className="animate-rise"
                  style={{ animationDelay: `${0.42 + i * 0.08}s` }}
                >
                  <CourseCard course={course} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Hero>

      {/* A sunken band. Alternating surface depth is what stops a long page
          reading as one undifferentiated sheet. */}
      <section className="relative border-y border-ink-200 bg-surface-sunken">
        <div aria-hidden className="bg-dots absolute inset-0 opacity-50" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-title font-semibold tracking-tight">
            Built to be checked, not just demonstrated
          </h2>
          <p className="mt-2 max-w-xl text-small text-ink-600">
            Every boundary below is enforced by the API. Hiding a button in the
            interface is a courtesy to the person using it, never a control.
          </p>

          <ul className="mt-8 grid gap-5 sm:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <li
                key={feature.title}
                className="animate-rise rounded-card border border-ink-200 bg-white p-5 shadow-soft"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span
                  aria-hidden
                  className={`grid h-9 w-9 place-items-center rounded-lg ${feature.chip}`}
                >
                  {feature.icon}
                </span>
                <h3 className="mt-4 text-small font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-small leading-relaxed text-ink-600">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-title font-semibold tracking-tight">
              From the blog
            </h2>
            <Link
              href="/blog"
              className="text-small font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              All posts &rarr;
            </Link>
          </div>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {posts.slice(0, 2).map((post) => (
              <li key={post.documentId}>
                <Link href={`/blog/${post.documentId}`} className="block h-full">
                  <article className="ring-gradient h-full rounded-card border border-ink-200 bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                    <h3 className="font-medium leading-snug">{post.title}</h3>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-small text-ink-500">
                        {post.excerpt}
                      </p>
                    )}
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/**
 * Each icon is inline SVG rather than an icon font or package - three glyphs do
 * not justify a dependency, and inline means they inherit colour for free.
 */
const FEATURES = [
  {
    title: 'Enforced on the server',
    body: 'A permission matrix, five ownership policies, and controller-level scoping that replaces client filters rather than merging them.',
    chip: 'bg-brand-50 text-brand-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
        <path
          d="M10 2.5 4 5v4.5c0 3.4 2.4 6.5 6 8 3.6-1.5 6-4.6 6-8V5l-6-2.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="m7.5 10 1.8 1.8 3.4-3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Progress that stays true',
    body: 'Counted from completions on every read, never stored - so adding a lesson moves everyone’s figure instead of silently invalidating it.',
    chip: 'bg-teal-50 text-teal-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
        <path d="M3 15.5 7.5 10l3 3L17 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 5.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Quizzes marked server-side',
    body: 'The answer key never reaches the browser, and no endpoint accepts a score from a client.',
    chip: 'bg-amber-50 text-amber-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
        <rect x="3.5" y="2.5" width="13" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7.5h6M7 11h6M7 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];
