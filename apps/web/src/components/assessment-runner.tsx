'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  startAssessmentAction,
  submitQuizAction,
  type GradedResult,
  type StartedAssessment,
} from '@/app/actions/quiz';

type Question = { text: string; options: string[] };
type Stage = 'briefing' | 'running' | 'submitting' | 'done';

/**
 * A timed, full-screen assessment.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS ACTUALLY GUARANTEES, AND WHAT IT DOES NOT
 * ---------------------------------------------------------------------------
 * The TIME LIMIT is real. It is enforced by the server against a signed token,
 * so pausing the countdown, editing it in DevTools or reloading the page buys
 * nothing - the backend refuses a submission that arrives too late whatever the
 * browser believes.
 *
 * The ANTI-CHEAT measures are deterrents, and it is worth being honest that they
 * are not more than that. Full-screen, tab-switch detection and blur detection
 * all run in JavaScript on the candidate's own machine. Someone determined can
 * disable scripting, or simply read the answers on a second device that this
 * page cannot see. What these measures do is make casual cheating obvious and
 * effortful rather than free - which is most of the value, but it is not proof
 * of anything.
 *
 * Leaving auto-SUBMITS rather than discarding. Discarding would make walking out
 * the cheapest way to escape a bad score, so the attempt is marked exactly as it
 * stood - unanswered questions count as wrong.
 */
export function AssessmentRunner({
  quizId,
  quizTitle,
  questions,
}: {
  quizId: string;
  quizTitle: string;
  questions: Question[];
}) {
  const [stage, setStage] = useState<Stage>('briefing');
  const [session, setSession] = useState<StartedAssessment | null>(null);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [step, setStep] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<GradedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [endedBecause, setEndedBecause] = useState<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  // Refs mirror state for use inside event listeners, which capture the values
  // present when they were attached and would otherwise submit a stale answer
  // array the moment the candidate switches away.
  const answersRef = useRef(answers);
  const sessionRef = useRef(session);
  const stageRef = useRef(stage);
  answersRef.current = answers;
  sessionRef.current = session;
  stageRef.current = stage;

  const total = questions.length;
  const answered = answers.filter((a) => a >= 0).length;

  const finish = useCallback(
    async (reason: string | null) => {
      const active = sessionRef.current;
      if (!active || stageRef.current !== 'running') return;

      stageRef.current = 'submitting';
      setStage('submitting');
      setEndedBecause(reason);

      // Leave full screen before showing the result, or the score appears in a
      // context the candidate cannot navigate out of.
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }

      const res = await submitQuizAction(quizId, answersRef.current, active.token);

      if (!res.ok) {
        setError(res.error);
        setStage('done');
        return;
      }

      setResult(res.result);
      setStage('done');
    },
    [quizId]
  );

  /* ---------------------------------------------------------------- */
  /* The countdown                                                     */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (stage !== 'running' || !session) return;

    // Counts down to the absolute instant the server named, not by decrementing
    // a number every second. A decrementing counter drifts, and stops entirely
    // in a background tab where timers are throttled.
    const deadline = new Date(session.expiresAt).getTime();

    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) finish('Time ran out.');
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [stage, session, finish]);

  /* ---------------------------------------------------------------- */
  /* Leaving the assessment                                            */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (stage !== 'running') return;

    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        finish('You switched away from the assessment.');
      }
    };
    const onBlur = () => finish('The assessment window lost focus.');
    const onFullscreenChange = () => {
      // Exiting full screen is treated the same as leaving. Ignored while the
      // submission is already in flight, since finish() exits full screen itself
      // and would otherwise re-trigger this.
      if (!document.fullscreenElement && stageRef.current === 'running') {
        finish('You left full screen.');
      }
    };

    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [stage, finish]);

  async function begin() {
    setError(null);

    const res = await startAssessmentAction(quizId);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    // Full screen must be requested inside the click that started it - browsers
    // refuse the request otherwise. A refusal is not fatal: the assessment still
    // runs and is still timed, it is simply less insulated.
    try {
      await shellRef.current?.requestFullscreen?.();
    } catch {
      /* denied or unsupported - carry on */
    }

    setSession(res.session);
    setStage('running');
  }

  /* ---------------------------------------------------------------- */
  /* Views                                                             */
  /* ---------------------------------------------------------------- */

  if (stage === 'done') {
    return (
      <div className="mt-8">
        {endedBecause && (
          <p className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-small text-amber-600">
            <strong className="font-semibold">Assessment ended.</strong>{' '}
            {endedBecause} Your answers were submitted as they stood.
          </p>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-small text-danger"
          >
            {error}
          </p>
        ) : (
          result && <Result result={result} />
        )}
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={
        stage === 'running'
          ? 'fixed inset-0 z-50 overflow-y-auto bg-canvas px-4 py-8 sm:px-6'
          : 'mt-8'
      }
    >
      <div className={stage === 'running' ? 'mx-auto max-w-2xl' : ''}>
        {stage === 'briefing' && (
          <Briefing
            title={quizTitle}
            questionCount={total}
            onStart={begin}
            error={error}
          />
        )}

        {(stage === 'running' || stage === 'submitting') && session && (
          <>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-soft">
              <div className="min-w-0">
                <p className="truncate text-small font-semibold">{quizTitle}</p>
                <p className="text-micro text-ink-500">
                  {answered} of {total} answered
                </p>
              </div>
              <Clock remaining={remaining} limit={session.timeLimitSeconds} />
            </div>

            {stage === 'submitting' ? (
              <p className="mt-8 text-center text-small text-ink-500">
                Submitting your answers…
              </p>
            ) : (
              <Questions
                questions={questions}
                answers={answers}
                step={step}
                setStep={setStep}
                onChoose={(qi, oi) =>
                  setAnswers((c) => {
                    const next = [...c];
                    next[qi] = oi;
                    return next;
                  })
                }
                onSubmit={() => finish(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Briefing({
  title,
  questionCount,
  onStart,
  error,
}: {
  title: string;
  questionCount: number;
  onStart: () => void;
  error: string | null;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-soft sm:p-8">
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-micro font-semibold text-amber-600">
        <span aria-hidden>⏱</span> Timed assessment
      </span>

      <h2 className="mt-4 text-title font-semibold tracking-tight">
        Before you start
      </h2>
      <p className="mt-2 text-small text-ink-600">
        {title} · {questionCount} question{questionCount === 1 ? '' : 's'}
      </p>

      <ul className="mt-6 space-y-3">
        {[
          ['The clock starts when you press Start', 'It runs on the server, so reloading or closing the page does not pause it.'],
          ['It opens in full screen', 'Leaving full screen ends the assessment.'],
          ['Do not switch tabs or windows', 'Switching away ends the assessment immediately.'],
          ['Ending submits your answers', 'Whatever you have answered is marked as it stands. Unanswered questions count as wrong.'],
        ].map(([heading, body]) => (
          <li key={heading} className="flex gap-3">
            <span
              aria-hidden
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
            />
            <span>
              <span className="block text-small font-semibold">{heading}</span>
              <span className="block text-small text-ink-600">{body}</span>
            </span>
          </li>
        ))}
      </ul>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-canvas p-4">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-small text-ink-700">
          I have read the rules and I am ready to begin.
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-small text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!acknowledged}
          onClick={onStart}
          className="btn-gradient rounded-xl px-6 py-3 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start assessment
        </button>
        <Link
          href="/dashboard/learning"
          className="rounded-xl px-6 py-3 text-small font-semibold text-ink-600 transition-colors hover:bg-ink-100"
        >
          Not yet
        </Link>
      </div>
    </div>
  );
}

/** The countdown. Turns amber then red as the time runs down. */
function Clock({ remaining, limit }: { remaining: number; limit: number }) {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const fraction = limit > 0 ? remaining / limit : 0;

  const tone =
    fraction <= 0.1 ? 'text-danger' : fraction <= 0.25 ? 'text-amber-600' : 'text-ink-900';

  return (
    <p
      className={`shrink-0 text-title font-semibold tabular-nums ${tone}`}
      role="timer"
      aria-live={fraction <= 0.1 ? 'assertive' : 'off'}
    >
      {minutes}:{String(seconds).padStart(2, '0')}
      <span className="sr-only"> remaining</span>
    </p>
  );
}

function Questions({
  questions,
  answers,
  step,
  setStep,
  onChoose,
  onSubmit,
}: {
  questions: Question[];
  answers: number[];
  step: number;
  setStep: (n: number) => void;
  onChoose: (qi: number, oi: number) => void;
  onSubmit: () => void;
}) {
  const total = questions.length;
  const current = questions[step];
  const isLast = step === total - 1;
  const answered = answers.filter((a) => a >= 0).length;

  return (
    <>
      <div className="mt-5 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === step ? 'bg-ink-900' : answers[i] >= 0 ? 'bg-brand-400' : 'bg-ink-200'
              }`}
            />
          ))}
        </div>
        <span className="shrink-0 text-micro tabular-nums text-ink-500">
          {step + 1} / {total}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.fieldset
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 rounded-2xl border border-ink-200 bg-white p-5 shadow-soft sm:p-6"
        >
          <legend className="sr-only">
            Question {step + 1} of {total}
          </legend>
          <p className="text-lead font-medium leading-snug">{current.text}</p>

          <div className="mt-5 space-y-2">
            {current.options.map((option, oi) => {
              const selected = answers[step] === oi;
              return (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-small transition-all ${
                    selected
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q${step}`}
                    checked={selected}
                    onChange={() => onChoose(step, oi)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      selected ? 'border-brand-500' : 'border-ink-300'
                    }`}
                  >
                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
                  </span>
                  {option}
                </label>
              );
            })}
          </div>
        </motion.fieldset>
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-between gap-3 pb-4">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-lg px-4 py-2 text-small font-medium text-ink-600 transition-colors hover:bg-ink-100 disabled:invisible"
        >
          &larr; Back
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            className="btn-gradient rounded-xl px-5 py-2.5 text-small font-semibold text-white shadow-glow transition-transform active:scale-[0.98]"
          >
            {answered < total ? `Submit (${total - answered} blank)` : 'Submit answers'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(Math.min(total - 1, step + 1))}
            className="rounded-xl bg-ink-900 px-5 py-2.5 text-small font-semibold text-white transition-all hover:bg-ink-800 active:scale-[0.98]"
          >
            Next &rarr;
          </button>
        )}
      </div>
    </>
  );
}

function Result({ result }: { result: GradedResult }) {
  const good = result.percentage >= 60;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
    >
      <div className="rounded-2xl border border-ink-200 bg-white px-6 py-10 text-center shadow-soft">
        <p
          className={`text-hero font-semibold tabular-nums ${
            good ? 'text-teal-600' : 'text-ink-900'
          }`}
        >
          {result.score}
          <span className="text-ink-300">/{result.total}</span>
        </p>
        <p className="mt-1 text-small text-ink-500">{result.percentage}%</p>
      </div>

      <ul className="mt-6 space-y-2">
        {result.results.map((r, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 text-small"
          >
            <span
              aria-hidden
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-micro text-white ${
                r.correct ? 'bg-teal-600' : 'bg-danger'
              }`}
            >
              {r.correct ? '✓' : '✗'}
            </span>
            <span className="flex-1">{r.question}</span>
            <span className="sr-only">{r.correct ? 'Correct' : 'Incorrect'}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-small">
        <Link href="/dashboard/results" className="font-semibold underline">
          See all your results
        </Link>
      </p>
    </motion.section>
  );
}
