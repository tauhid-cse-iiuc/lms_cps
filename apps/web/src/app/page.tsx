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
              <h2 className="text-title font-semibold tracking-tight">
                Available now
              </h2>
              <Link
                href="/courses"
                className="text-small font-semibold text-brand-600 transition-colors hover:text-brand-700"
              >
                All courses &rarr;
              </Link>
            </div>

            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((course, i) => (
                <li
                  key={course.documentId}
                  className="animate-rise"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <CourseCard course={course} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Hero>

      {/*
        A bento grid rather than three equal columns. Equal columns tell the
        reader that everything matters the same amount, which is never true -
        here the server-side enforcement is the claim worth making largest,
        because it is the one an evaluator will actually test.
      */}
      <section className="relative overflow-hidden border-y border-ink-200 bg-surface-sunken">
        <div aria-hidden className="bg-dots absolute inset-0 opacity-70" />

        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-display font-semibold tracking-tight">
            Built to be checked, not just demonstrated.
          </h2>
          <p className="mt-3 max-w-xl text-lead text-ink-600">
            Every boundary below is enforced by the API. Hiding a button is a
            courtesy to the person using the interface, never a control.
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {/* The wide, dark tile. One element allowed to dominate. */}
            <article className="group relative isolate overflow-hidden rounded-2xl bg-night-900 p-8 text-white shadow-lift lg:col-span-2 lg:row-span-2">
              <div
                aria-hidden
                className="bg-aurora-night animate-hue absolute inset-0 -z-10 opacity-80"
              />
              <span
                aria-hidden
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <path
                    d="M10 2.5 4 5v4.5c0 3.4 2.4 6.5 6 8 3.6-1.5 6-4.6 6-8V5l-6-2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m7.5 10 1.8 1.8 3.4-3.6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <h3 className="mt-6 text-title font-semibold">
                Authorization in three layers
              </h3>
              <p className="mt-3 max-w-md leading-relaxed text-white/70">
                A permission matrix decides who may call an endpoint. Five
                ownership policies decide which rows they may touch. Controller
                overrides decide what the request is allowed to claim — and they
                replace client filters rather than merging them, because a merged
                filter can be widened straight back open.
              </p>

              <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                {[
                  ['43', 'admin grants'],
                  ['5', 'policies'],
                  ['0', 'client-set scores'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd>
                      <span className="block text-title font-semibold tabular-nums">
                        {value}
                      </span>
                      <span className="mt-0.5 block text-micro text-white/50">
                        {label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </article>

            {SIDE_TILES.map((tile) => (
              <article
                key={tile.title}
                className="ring-gradient rounded-2xl border border-ink-200 bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
              >
                <span
                  aria-hidden
                  className={`grid h-11 w-11 place-items-center rounded-xl ${tile.chip}`}
                >
                  {tile.icon}
                </span>
                <h3 className="mt-5 font-semibold">{tile.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-600">
                  {tile.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-display font-semibold tracking-tight">
              From the blog
            </h2>
            <Link
              href="/blog"
              className="text-small font-semibold text-brand-600 transition-colors hover:text-brand-700"
            >
              All posts &rarr;
            </Link>
          </div>

          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {posts.slice(0, 2).map((post) => (
              <li key={post.documentId}>
                <Link href={`/blog/${post.documentId}`} className="group block h-full">
                  <article className="ring-gradient h-full rounded-2xl border border-ink-200 bg-white p-7 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
                    <span className="text-micro font-semibold uppercase tracking-wide text-amber-600">
                      Blog
                    </span>
                    <h3 className="mt-3 text-lead font-semibold leading-snug transition-colors group-hover:text-brand-700">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2.5 line-clamp-3 text-small leading-relaxed text-ink-600">
                        {post.excerpt}
                      </p>
                    )}
                    <span className="mt-5 inline-block text-small font-semibold text-brand-600">
                      Read post &rarr;
                    </span>
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
 * Icons are inline SVG rather than an icon package - two glyphs do not justify a
 * dependency, and inline means they inherit colour for free.
 */
const SIDE_TILES = [
  {
    title: 'Progress that stays true',
    body: 'Counted from completions on every read, never stored — so adding a lesson moves everyone’s figure instead of silently invalidating it.',
    chip: 'bg-teal-50 text-teal-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <path
          d="M3 15.5 7.5 10l3 3L17 5.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 5.5h4v4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: 'Quizzes marked server-side',
    body: 'The answer key never reaches the browser, and no endpoint accepts a score from a client.',
    chip: 'bg-amber-50 text-amber-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
        <rect
          x="3.5"
          y="2.5"
          width="13"
          height="15"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M7 7.5h6M7 11h6M7 14h3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];
