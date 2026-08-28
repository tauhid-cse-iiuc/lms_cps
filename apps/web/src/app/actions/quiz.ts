'use server';

/**
 * Starting and submitting a timed assessment.
 *
 * The clock lives on the SERVER. `start` returns a signed token recording who
 * began which quiz and when; `submit` sends it back, and the backend refuses to
 * grade anything without a valid, unexpired one. The countdown the candidate
 * watches is drawn from the expiry the server states - it is a courtesy, not the
 * limit, because anything enforced only in the browser is not enforced.
 *
 * Note what submit sends: chosen option indexes and the token. Never a score.
 * The answer key never came down here to compare against.
 */
import { apiPost } from '@/lib/api';

export type StartedAssessment = {
  token: string;
  timeLimitSeconds: number;
  expiresAt: string;
  questionCount: number;
};

export type GradedResult = {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  results: Array<{ question: string; chosen: number; correct: boolean }>;
};

export async function startAssessmentAction(quizId: string) {
  const res = await apiPost<{ data: StartedAssessment }>(
    `/api/quizzes/${quizId}/start`,
    {}
  );

  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const, session: res.data.data };
}

export async function submitQuizAction(
  quizId: string,
  answers: number[],
  token: string
) {
  const res = await apiPost<{ data: GradedResult }>(`/api/quizzes/${quizId}/submit`, {
    answers,
    token,
  });

  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const, result: res.data.data };
}
