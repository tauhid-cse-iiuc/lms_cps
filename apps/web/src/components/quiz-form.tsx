'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { submitQuizAction, type GradedResult } from '@/app/actions/quiz';

type Question = { text: string; options: string[] };

export function QuizForm({
  quizId,
  questions,
}: {
  quizId: string;
  questions: Question[];
}) {
  // -1 means "not answered yet", which is distinct from 0 - the first option is
  // a real choice and must not be what an untouched question submits.
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<GradedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unanswered = answers.filter((a) => a < 0).length;

  if (result) {
    return (
      <section className="mt-8">
        <div className="rounded border border-slate-200 p-6 text-center">
          <p className="text-3xl font-semibold">
            {result.score} / {result.total}
          </p>
          <p className="mt-1 text-sm text-slate-600">{result.percentage}%</p>
        </div>

        <ul className="mt-6 space-y-2">
          {result.results.map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded border border-slate-200 px-4 py-3 text-sm"
            >
              <span aria-hidden>{r.correct ? '✓' : '✗'}</span>
              <span className="flex-1">{r.question}</span>
              <span className="sr-only">{r.correct ? 'Correct' : 'Incorrect'}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm">
          <Link href="/dashboard/results" className="underline">
            See all your results
          </Link>
        </p>
      </section>
    );
  }

  return (
    <form
      className="mt-8 space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await submitQuizAction(quizId, answers);
          if (!res.ok) setError(res.error);
          else setResult(res.result);
        });
      }}
    >
      {questions.map((question, qi) => (
        <fieldset key={qi} className="rounded border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium">
            {qi + 1}. {question.text}
          </legend>
          <div className="mt-2 space-y-2">
            {question.options.map((option, oi) => (
              <label key={oi} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`q${qi}`}
                  checked={answers[qi] === oi}
                  onChange={() =>
                    setAnswers((current) => {
                      const next = [...current];
                      next[qi] = oi;
                      return next;
                    })
                  }
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || unanswered > 0}
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending
          ? 'Marking…'
          : unanswered > 0
            ? `${unanswered} question${unanswered === 1 ? '' : 's'} left`
            : 'Submit answers'}
      </button>
    </form>
  );
}
