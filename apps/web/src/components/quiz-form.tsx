'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { submitQuizAction, type GradedResult } from '@/app/actions/quiz';

type Question = { text: string; options: string[] };

/**
 * Taking a quiz.
 *
 * One question at a time. A long scroll of radio groups makes it easy to skip
 * one by accident and then be told the submission is incomplete without being
 * shown where - stepping through means the form can simply not advance.
 *
 * Note what is sent on submit: the chosen indexes, and nothing else. No score.
 * The answer key never came down here to compare against.
 */
export function QuizForm({
  quizId,
  questions,
}: {
  quizId: string;
  questions: Question[];
}) {
  // -1 means "not answered", which is distinct from 0 - the first option is a
  // real choice and must not be what an untouched question submits.
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<GradedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = questions.length;
  const answered = answers.filter((a) => a >= 0).length;
  const current = questions[step];
  const isLast = step === total - 1;

  if (result) return <QuizResult result={result} />;

  return (
    <div className="mt-8">
      {/* Step indicator. Segments rather than a bar, because the count is small
          and discrete - and each one shows whether it has been answered. */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === step
                  ? 'bg-ink-900'
                  : answers[i] >= 0
                    ? 'bg-brand-400'
                    : 'bg-ink-200'
              }`}
            />
          ))}
        </div>
        <span className="shrink-0 text-micro tabular-nums text-ink-500">
          {step + 1} / {total}
        </span>
      </div>

      {/* initial={false}: the first question paints immediately rather than
          starting at opacity 0 and waiting for JavaScript to reveal it. Later
          steps still animate. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.fieldset
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 rounded-card border border-ink-200 p-5 sm:p-6"
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
                    onChange={() =>
                      setAnswers((c) => {
                        const next = [...c];
                        next[step] = oi;
                        return next;
                      })
                    }
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                      selected ? 'border-brand-500' : 'border-ink-300'
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="quiz-dot"
                        className="h-2.5 w-2.5 rounded-full bg-brand-500"
                      />
                    )}
                  </span>
                  {option}
                </label>
              );
            })}
          </div>
        </motion.fieldset>
      </AnimatePresence>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/25 bg-danger/5 px-4 py-3 text-small text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg px-4 py-2 text-small font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:invisible"
        >
          &larr; Back
        </button>

        {isLast ? (
          <button
            type="button"
            disabled={pending || answered < total}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await submitQuizAction(quizId, answers);
                if (!res.ok) setError(res.error);
                else setResult(res.result);
              })
            }
            className="rounded-lg bg-ink-900 px-5 py-2 text-small font-medium text-white transition-all hover:bg-ink-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? 'Marking…'
              : answered < total
                ? `${total - answered} unanswered`
                : 'Submit answers'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            disabled={answers[step] < 0}
            className="rounded-lg bg-ink-900 px-5 py-2 text-small font-medium text-white transition-all hover:bg-ink-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next &rarr;
          </button>
        )}
      </div>
    </div>
  );
}

/** The marked result. Score first, then which questions were right. */
function QuizResult({ result }: { result: GradedResult }) {
  const good = result.percentage >= 60;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8"
      aria-live="polite"
    >
      <div className="rounded-card border border-ink-200 px-6 py-10 text-center">
        <motion.p
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className={`text-hero font-semibold tabular-nums ${
            good ? 'text-success' : 'text-ink-900'
          }`}
        >
          {result.score}
          <span className="text-ink-300">/{result.total}</span>
        </motion.p>
        <p className="mt-1 text-small text-ink-500">{result.percentage}%</p>
      </div>

      <ul className="mt-6 space-y-2">
        {result.results.map((r, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.06, duration: 0.25 }}
            className="flex items-start gap-3 rounded-lg border border-ink-200 px-4 py-3 text-small"
          >
            <span
              aria-hidden
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-micro text-white ${
                r.correct ? 'bg-success' : 'bg-danger'
              }`}
            >
              {r.correct ? '✓' : '✗'}
            </span>
            <span className="flex-1">{r.question}</span>
            <span className="sr-only">{r.correct ? 'Correct' : 'Incorrect'}</span>
          </motion.li>
        ))}
      </ul>

      <p className="mt-6 text-small">
        <Link href="/dashboard/results" className="font-medium underline">
          See all your results
        </Link>
      </p>
    </motion.section>
  );
}
