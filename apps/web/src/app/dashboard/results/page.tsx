import { redirect } from 'next/navigation';
import { apiGet, type AttemptSummary } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { PageShell, PageHeader, Card, EmptyState, ErrorNote, Button } from '@/components/ui';

export const metadata = { title: 'My results' };

/**
 * Quiz results, stored and viewable later - which the brief asks for explicitly.
 *
 * The score shown is the one recorded at the time of the attempt, not a fresh
 * grading. If an instructor corrects a wrong answer key next week, this page
 * keeps reporting what the student actually scored against the quiz as it stood,
 * which is the honest thing for a historical record to do.
 */
export default async function ResultsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  /**
   * Learning pages are for the role that learns. Enrolling and taking quizzes
   * are Student-only in the permission matrix, so for anyone else these
   * endpoints answer 403 and the page could only ever render an empty state
   * that looks like a bug. Sending them to their own dashboard says what is
   * actually true: this is not their screen.
   */
  if (user.role.type !== 'student') redirect('/dashboard');

  const res = await apiGet<{ data: AttemptSummary[] }>('/api/my/quiz-attempts');
  const attempts = res.ok ? res.data.data : [];

  const best =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage)) : null;

  return (
    <PageShell>
      <PageHeader
        title="My results"
        description={
          attempts.length === 0
            ? undefined
            : `${attempts.length} attempt${attempts.length === 1 ? '' : 's'}${
                best !== null ? ` · best ${best}%` : ''
              }`
        }
      />

      {!res.ok && (
        <div className="mt-6">
          <ErrorNote>{res.error}</ErrorNote>
        </div>
      )}

      {attempts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No quiz attempts yet"
            description="Results are kept exactly as they were marked, so you can come back to them later."
            action={<Button href="/dashboard/learning">Go to your courses</Button>}
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {attempts.map((attempt, i) => (
            <li
              key={attempt.documentId}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
            >
              <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {attempt.quiz?.title ?? 'Quiz'}
                  </p>
                  <p className="mt-0.5 truncate text-micro text-ink-500">
                    {attempt.course?.title ? `${attempt.course.title} · ` : ''}
                    {attempt.submittedAt
                      ? new Date(attempt.submittedAt).toLocaleString()
                      : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <ScoreRing percentage={attempt.percentage} />
                  <p className="text-small tabular-nums text-ink-600">
                    {attempt.score}
                    <span className="text-ink-300">/{attempt.total}</span>
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {attempts.length > 0 && (
        <p className="mt-6 text-micro text-ink-400">
          Scores are stored as marked. Editing a quiz later does not rewrite
          results already recorded against it.
        </p>
      )}
    </PageShell>
  );
}

/**
 * A small dial. Pure SVG, no JavaScript - a server component, so this costs the
 * client nothing to render.
 */
function ScoreRing({ percentage }: { percentage: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dash = (safe / 100) * circumference;
  const good = safe >= 60;

  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90" role="img" aria-label={`${safe}%`}>
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="var(--color-ink-100)"
        strokeWidth="4"
      />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke={good ? 'var(--color-success)' : 'var(--color-danger)'}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
      />
    </svg>
  );
}
