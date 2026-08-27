'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createQuizAction, deleteQuizAction, type QuestionInput } from '@/app/actions/manage';
import type { Quiz } from '@/lib/api';

const field =
  'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900';

const blankQuestion = (): QuestionInput => ({
  text: '',
  options: ['', ''],
  correctIndex: 0,
});

/**
 * Quiz authoring.
 *
 * The instructor marks the correct option here, and that answer key is stored on
 * the server and stripped from every student-facing read. It is visible on this
 * page because whoever can edit the quiz can obviously see its answers.
 */
export function QuizManager({ courseId, quizzes }: { courseId: string; quizzes: Quiz[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionInput[]>([blankQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (index: number, patch: Partial<QuestionInput>) =>
    setQuestions((current) =>
      current.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );

  return (
    <div className="mt-4">
      {error && (
        <p role="alert" className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {quizzes.length === 0 ? (
        <p className="text-sm text-slate-600">No quizzes yet.</p>
      ) : (
        <ul className="space-y-2">
          {quizzes.map((quiz) => (
            <li
              key={quiz.documentId}
              className="flex items-baseline justify-between gap-4 rounded border border-slate-200 p-3 text-sm"
            >
              <span>
                {quiz.title}
                <span className="ml-2 text-slate-500">
                  ({quiz.questions?.length ?? 0} questions)
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteQuizAction(quiz.documentId, courseId);
                    if (!res.ok) setError(res.error);
                    else router.refresh();
                  })
                }
                className="shrink-0 text-red-700 underline disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 space-y-4 rounded border border-slate-200 p-4">
        <h3 className="text-sm font-medium">Create a quiz</h3>

        <label className="block text-sm font-medium text-slate-700">
          Quiz title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
          />
        </label>

        {questions.map((question, qi) => (
          <fieldset key={qi} className="rounded border border-slate-200 p-3">
            <legend className="px-1 text-xs font-medium text-slate-600">
              Question {qi + 1}
            </legend>

            <label className="block text-sm font-medium text-slate-700">
              Text
              <input
                value={question.text}
                onChange={(e) => update(qi, { text: e.target.value })}
                className={field}
              />
            </label>

            <p className="mt-3 text-xs font-medium text-slate-600">
              Options — select the correct one
            </p>
            {question.options.map((option, oi) => (
              <div key={oi} className="mt-2 flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={question.correctIndex === oi}
                  onChange={() => update(qi, { correctIndex: oi })}
                  aria-label={`Mark option ${oi + 1} correct`}
                />
                <input
                  value={option}
                  onChange={(e) =>
                    update(qi, {
                      options: question.options.map((o, i) => (i === oi ? e.target.value : o)),
                    })
                  }
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
            ))}

            <div className="mt-2 flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => update(qi, { options: [...question.options, ''] })}
                className="underline"
              >
                Add option
              </button>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setQuestions((c) => c.filter((_, i) => i !== qi))}
                  className="text-red-700 underline"
                >
                  Remove question
                </button>
              )}
            </div>
          </fieldset>
        ))}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setQuestions((c) => [...c, blankQuestion()])}
            className="text-sm underline"
          >
            Add question
          </button>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await createQuizAction({ courseId, title, questions });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setTitle('');
              setQuestions([blankQuestion()]);
              router.refresh();
            })
          }
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Create quiz'}
        </button>
      </div>
    </div>
  );
}
