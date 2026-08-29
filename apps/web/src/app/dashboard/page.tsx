import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, displayName, type RoleType } from '@/lib/auth';
import {
  apiGet,
  type Enrollment,
  type Course,
  type Progress,
  type AttemptSummary,
} from '@/lib/api';
import { PageShell, Card, Badge, Button } from '@/components/ui';
import { ProgressBar } from '@/components/progress-bar';

export const metadata = { title: 'Dashboard' };

type Stat = { value: string; label: string; tone: string };

/**
 * Rendered on the server, so the role is decided before any HTML is produced.
 *
 * The middleware has already turned away anyone without a session, but this
 * checks again rather than trusting it. Middleware decides which page to render;
 * it is not an authorisation boundary, and a page that assumes a caller exists
 * because something upstream said so is one refactor away from leaking.
 *
 * Every figure below is about THIS person - their enrolments, their courses,
 * their results. Platform-wide counts belong to the admin panel, where managing
 * the platform is the job; on a personal dashboard they are just trivia about a
 * database.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const role = user.role.type as RoleType;
  const theme = THEMES[role];

  const stats: Stat[] = [];
  let cta: { href: string; label: string; note: string } | null = null;
  let resume: { href: string; course: string; lesson: string; percentage: number } | null =
    null;

  /**
   * Learner figures, for the one role that is a learner.
   *
   * Staff used to be included here on the reasoning that an instructor might
   * want to work through a course as a student sees it. The brief's permission
   * matrix says otherwise - enrolling and taking quizzes are Student-only - and
   * the backend now enforces exactly that, so asking for these as an Admin
   * would be asking for a 403 and rendering zeroes.
   */
  if (role === 'student') {
    const [enrolRes, attemptRes] = await Promise.all([
      apiGet<{ data: Enrollment[] }>('/api/my/enrollments'),
      apiGet<{ data: AttemptSummary[] }>('/api/my/quiz-attempts'),
    ]);

    const enrolments = enrolRes.ok ? enrolRes.data.data : [];
    const attempts = attemptRes.ok ? attemptRes.data.data : [];

    const progresses = await Promise.all(
      enrolments.map(async (e) => {
        const id = e.course?.documentId;
        if (!id) return null;
        const p = await apiGet<{ data: Progress }>(`/api/courses/${id}/progress`);
        return p.ok ? { enrolment: e, progress: p.data.data } : null;
      })
    );

    const live = progresses.filter(Boolean) as Array<{
      enrolment: Enrollment;
      progress: Progress;
    }>;

    const completedLessons = live.reduce((n, x) => n + x.progress.completedLessons, 0);
    const finished = live.filter((x) => x.progress.percentage === 100).length;

    stats.push(
      { value: String(enrolments.length), label: 'courses enrolled', tone: 'text-teal-600' },
      { value: String(completedLessons), label: 'lessons completed', tone: 'text-brand-600' },
      { value: String(finished), label: 'courses finished', tone: 'text-violet-600' },
      { value: String(attempts.length), label: 'quizzes taken', tone: 'text-amber-600' }
    );

    // The single most useful thing on the page: the next lesson to open.
    const inProgress = live
      .filter((x) => x.progress.percentage < 100)
      .sort((a, b) => b.progress.percentage - a.progress.percentage)[0];

    if (inProgress) {
      const next = inProgress.progress.lessons.find((l) => !l.completed);
      const courseId = inProgress.enrolment.course?.documentId;
      if (next && courseId) {
        resume = {
          href: `/learn/${courseId}/${next.documentId}`,
          course: inProgress.enrolment.course?.title ?? 'your course',
          lesson: next.title,
          percentage: inProgress.progress.percentage,
        };
      }
    }
  }

  if (role === 'instructor' || role === 'content-manager') {
    const res = await apiGet<{ data: Course[] }>('/api/my/courses');
    const owned = res.ok ? res.data.data : [];
    const students = owned.reduce((n, c) => n + (c.studentCount ?? 0), 0);
    const lessons = owned.reduce((n, c) => n + (c.lessonCount ?? 0), 0);

    stats.unshift(
      { value: String(owned.length), label: 'courses you own', tone: 'text-brand-600' },
      { value: String(lessons), label: 'lessons published', tone: 'text-violet-600' },
      { value: String(students), label: 'students enrolled', tone: 'text-teal-600' }
    );

    cta =
      owned.length === 0
        ? {
            href: '/manage/courses',
            label: 'Create your first course',
            note: 'You will be recorded as its owner automatically.',
          }
        : {
            href: '/manage/courses',
            label: 'Manage your courses',
            note: 'Add lessons, write a quiz, or check how your students are doing.',
          };
  }

  if (role === 'admin') {
    cta = {
      href: '/dashboard/admin',
      label: 'Open the admin panel',
      note: 'Assign roles and review platform activity.',
    };
  }

  if (role === 'student' && !resume) {
    cta = {
      href: '/courses',
      label: 'Find a course',
      note: 'Browse the catalogue and enrol — it takes one click.',
    };
  }

  const panel = PANELS[role];

  return (
    <>
      {/* A tinted band behind the greeting, one hue per role, so the page tells
          you who you are before you read a word of it. */}
      <div className="relative isolate overflow-hidden border-b border-ink-200">
        <div aria-hidden className={`absolute inset-0 -z-20 ${theme.wash}`} />
        <div aria-hidden className="bg-dots absolute inset-0 -z-10 opacity-50" />

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="animate-rise">
            <p className="text-small text-ink-500">Welcome back</p>
            <h1 className="mt-1 text-display font-semibold tracking-tight">
              {displayName(user)}
            </h1>
            <div className="mt-2">
              <Badge tone={theme.badge}>{user.role.name}</Badge>
            </div>
          </div>

          {stats.length > 0 && (
            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.slice(0, 4).map((stat, i) => (
                <div
                  key={stat.label}
                  className="animate-pop rounded-xl border border-ink-200 bg-white/80 px-4 py-4 shadow-soft backdrop-blur"
                  style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                >
                  <dt className="text-micro text-ink-500">{stat.label}</dt>
                  <dd
                    className={`mt-1 text-title font-semibold tabular-nums ${stat.tone}`}
                  >
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <PageShell width="wide">
        {/* Resume beats everything else on the page for a learner mid-course. */}
        {resume && (
          <Card className="animate-rise overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-5 p-6">
              <div className="min-w-0 flex-1">
                <p className="text-micro font-semibold uppercase tracking-wide text-brand-600">
                  Continue learning
                </p>
                <p className="mt-1.5 truncate text-lead font-semibold">
                  {resume.lesson}
                </p>
                <p className="mt-0.5 truncate text-small text-ink-500">
                  {resume.course}
                </p>
                <div className="mt-4 max-w-sm">
                  <ProgressBar percentage={resume.percentage} size="compact" label="Course progress" />
                </div>
              </div>
              <Button href={resume.href} className="shrink-0">
                Resume &rarr;
              </Button>
            </div>
          </Card>
        )}

        {cta && (
          <Card className={`animate-rise p-6 ${resume ? 'mt-5' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">{cta.label}</p>
                <p className="mt-1 text-small text-ink-500">{cta.note}</p>
              </div>
              <Button href={cta.href} variant="secondary" className="shrink-0">
                Go
              </Button>
            </div>
          </Card>
        )}

        <section className="mt-10">
          <h2 className="text-title font-semibold tracking-tight">
            {panel.heading}
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {panel.links.map(([href, label, description, tint], i) => (
              <li
                key={href}
                className="animate-rise"
                style={{ animationDelay: `${0.06 * i}s` }}
              >
                <Link href={href} className="group block h-full">
                  <Card interactive className="h-full p-5">
                    <div className="flex items-start gap-3.5">
                      <span
                        aria-hidden
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tint}`}
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
                          <path
                            d="M4 10h12M11 5l5 5-5 5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium transition-colors group-hover:text-brand-700">
                          {label}
                        </p>
                        <p className="mt-1 text-small leading-relaxed text-ink-500">
                          {description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </PageShell>
    </>
  );
}

/** One hue per role, used for the band and the badge. */
const THEMES: Record<
  RoleType,
  { wash: string; badge: 'neutral' | 'success' | 'warn' | 'violet' }
> = {
  admin: {
    wash: 'bg-gradient-to-br from-violet-100 via-white to-brand-50',
    badge: 'violet',
  },
  'content-manager': {
    wash: 'bg-gradient-to-br from-amber-100 via-white to-brand-50',
    badge: 'warn',
  },
  instructor: {
    wash: 'bg-gradient-to-br from-brand-100 via-white to-teal-50',
    badge: 'neutral',
  },
  student: {
    wash: 'bg-gradient-to-br from-teal-100 via-white to-brand-50',
    badge: 'success',
  },
};

/**
 * What each role sees. A plain lookup: the set of roles is fixed by the backend
 * permission matrix and will not grow at runtime, so anything more dynamic would
 * add indirection without adding flexibility.
 */
const PANELS: Record<
  RoleType,
  { heading: string; links: Array<[string, string, string, string]> }
> = {
  admin: {
    heading: 'Platform administration',
    links: [
      ['/dashboard/admin', 'Users and roles', 'Assign roles, with the last-admin guard.', 'bg-violet-50 text-violet-600'],
      ['/manage/courses', 'Manage courses', 'Create and edit any course on the platform.', 'bg-brand-50 text-brand-600'],
      ['/manage/blog', 'Manage the blog', 'Write posts and control what is published.', 'bg-amber-50 text-amber-600'],
      ['/courses', 'The catalogue', 'Every course on the platform.', 'bg-teal-50 text-teal-600'],
    ],
  },
  'content-manager': {
    heading: 'Content management',
    links: [
      ['/manage/courses', 'Courses and lessons', 'Create and edit any course, not only your own.', 'bg-brand-50 text-brand-600'],
      ['/manage/blog', 'Blog posts', 'Write, publish and unpublish.', 'bg-amber-50 text-amber-600'],
      ['/courses', 'The catalogue', 'Every course on the platform.', 'bg-teal-50 text-teal-600'],
    ],
  },
  instructor: {
    heading: 'Your teaching',
    links: [
      ['/manage/courses', 'Create and edit courses', 'Your own courses, their lessons and quizzes.', 'bg-brand-50 text-brand-600'],
      ['/courses', 'The catalogue', 'Every course on the platform.', 'bg-teal-50 text-teal-600'],
    ],
  },
  student: {
    heading: 'Your learning',
    links: [
      ['/dashboard/learning', 'My courses', 'Everything you are enrolled in, with progress.', 'bg-teal-50 text-teal-600'],
      ['/dashboard/results', 'Quiz results', 'Every attempt, kept as it was marked.', 'bg-amber-50 text-amber-600'],
      ['/courses', 'Find something new', 'Browse the full catalogue.', 'bg-brand-50 text-brand-600'],
      ['/blog', 'Read the blog', 'Notes and updates from the team.', 'bg-violet-50 text-violet-600'],
    ],
  },
};
