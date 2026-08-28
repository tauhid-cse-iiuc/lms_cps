import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { apiGet, type Course } from '@/lib/api';
import { Hero } from '@/components/hero';
import { CourseCard } from '@/components/course-card';

/**
 * The landing page.
 *
 * It describes what the platform DOES and shows real courses. What it
 * deliberately does not show is platform statistics - how many users exist, how
 * many roles are configured, how many rows are in any table. Those are facts
 * about the database rather than about the reader: they answer a question nobody
 * arriving here is asking, and on a new platform they read as an admission
 * rather than a boast.
 *
 * Courses are the exception, and only because they are the product. They are
 * public by design - the Public role holds course.find - so showing them is not
 * exposing anything.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  const coursesRes = await apiGet<{ data: Course[] }>('/api/courses?populate=owner');
  const courses = coursesRes.ok ? coursesRes.data.data : [];

  return (
    <>
      <Hero signedIn={Boolean(user)} highlights={HIGHLIGHTS}>
        {courses.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-title font-semibold tracking-tight">
                Start with one of these
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

      {/* How it works, in the order a student actually meets it. */}
      <section className="relative overflow-hidden border-y border-ink-200 bg-white/70 backdrop-blur-sm">
        <div aria-hidden className="bg-dots absolute inset-0 opacity-70" />

        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-display font-semibold tracking-tight">
            Everything a course needs, and nothing it does not.
          </h2>
          <p className="mt-3 max-w-xl text-lead text-ink-600">
            Enrol, work through lessons in order, prove it with a quiz. Your
            progress follows you.
          </p>

          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <span
                  aria-hidden
                  className="text-mega font-semibold leading-none text-ink-200"
                >
                  {i + 1}
                </span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-600">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Feature detail. A bento grid rather than equal columns, because these
          are not equally important and pretending otherwise helps nobody. */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <h2 className="max-w-2xl text-display font-semibold tracking-tight">
          Made for four kinds of people.
        </h2>
        <p className="mt-3 max-w-xl text-lead text-ink-600">
          What you can do depends on who you are, and that is decided by the
          server rather than by which buttons happen to be on screen.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <article className="group relative isolate overflow-hidden rounded-2xl bg-night-900 p-8 text-white shadow-lift lg:col-span-2">
            <div
              aria-hidden
              className="bg-aurora-night animate-hue absolute inset-0 -z-10 opacity-80"
            />
            <span
              aria-hidden
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10 backdrop-blur"
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
              Access you can rely on
            </h3>
            <p className="mt-3 max-w-md leading-relaxed text-white/70">
              Students reach the courses they are enrolled in. Instructors manage
              their own and can see how their students are doing. Content
              managers look after all content; administrators manage people.
              Every one of those lines is enforced by the API, so what you see is
              genuinely what you are allowed to have.
            </p>

            <ul className="mt-8 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
              {ROLE_NOTES.map((note) => (
                <li key={note.role} className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.dot}`}
                  />
                  <span>
                    <span className="block text-small font-semibold">
                      {note.role}
                    </span>
                    <span className="block text-micro text-white/50">
                      {note.can}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
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
      </section>

      {/* Closing call to action. */}
      <section className="border-t border-ink-200 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-display font-semibold tracking-tight">
            {user ? 'Pick up where you left off' : 'Start learning today'}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-lead text-ink-600">
            {user
              ? 'Your courses, your progress and your results are waiting on your dashboard.'
              : 'Create an account and enrol in a course in under a minute. New accounts start as students.'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={user ? '/dashboard' : '/register'}
              className="btn-gradient rounded-xl px-6 py-3 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.98]"
            >
              {user ? 'Go to your dashboard' : 'Create an account'}
            </Link>
            <Link
              href="/courses"
              className="rounded-xl border border-ink-300 bg-white px-6 py-3 text-small font-semibold shadow-soft transition-all hover:border-ink-400 hover:shadow-lift active:scale-[0.98]"
            >
              Browse the catalogue
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** Capability statements for the hero. Never counts of rows. */
const HIGHLIGHTS = [
  {
    title: 'Learn in order',
    body: 'Lessons run in a sequence the instructor sets, with previous and next always to hand.',
  },
  {
    title: 'Progress that follows you',
    body: 'Mark a lesson done and your percentage updates everywhere you see that course.',
  },
  {
    title: 'Quizzes marked instantly',
    body: 'Submit and get your score straight back, kept exactly as it was marked.',
  },
];

const STEPS = [
  {
    title: 'Find a course',
    body: 'Browse the catalogue or search by topic. Anyone can look, signed in or not.',
  },
  {
    title: 'Enrol',
    body: 'One click. Enrolling twice is harmless — you end up enrolled once either way.',
  },
  {
    title: 'Work through it',
    body: 'Lessons in sequence, each one marked complete when you are done with it.',
  },
  {
    title: 'Prove it',
    body: 'Take the quiz. Your result is stored and stays viewable later.',
  },
];

const ROLE_NOTES = [
  { role: 'Student', can: 'Enrol, learn, take quizzes', dot: 'bg-teal-500' },
  { role: 'Instructor', can: 'Own courses, see their students', dot: 'bg-brand-500' },
  { role: 'Content Manager', can: 'All course content and the blog', dot: 'bg-amber-500' },
  { role: 'Admin', can: 'People and roles', dot: 'bg-violet-500' },
];

const SIDE_TILES = [
  {
    title: 'Your progress, always current',
    body: 'Worked out from what you have actually completed each time you look — so if a course gains a lesson, your figure moves with it instead of quietly going stale.',
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
    title: 'Quizzes you cannot peek at',
    body: 'Answers are held and checked on the server. Nothing in the page you receive contains them, so there is nothing to find.',
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
