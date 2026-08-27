'use server';

/**
 * Submitting a quiz.
 *
 * Note what is sent: the chosen option indexes, and nothing else. No score. The
 * backend holds the answer key and works the score out itself - see the long
 * comment on the quiz controller's `submit` handler. A client that could send a
 * score would send a perfect one.
 */
import { apiPost } from '@/lib/api';

export type GradedResult = {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  results: Array<{ question: string; chosen: number; correct: boolean }>;
};

export async function submitQuizAction(quizId: string, answers: number[]) {
  const res = await apiPost<{ data: GradedResult }>(`/api/quizzes/${quizId}/submit`, {
    answers,
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  return { ok: true as const, result: res.data.data };
}
