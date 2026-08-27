'use server';

/**
 * Server Actions for enrolling and for marking lessons complete.
 *
 * These run on the server, so the access token never leaves it, and there is no
 * public endpoint here for a client to call with different arguments than the UI
 * intended. The backend enforces the rules regardless - a Server Action is a
 * convenience, not a security boundary.
 */
import { revalidatePath } from 'next/cache';
import { apiPost, apiDelete } from '@/lib/api';

export async function enrollAction(courseDocumentId: string) {
  const res = await apiPost('/api/enrollments', { data: { course: courseDocumentId } });

  if (!res.ok) return { ok: false as const, error: res.error };

  // The catalogue and the course page both show enrolment state.
  revalidatePath('/courses');
  revalidatePath(`/courses/${courseDocumentId}`);
  revalidatePath('/dashboard');

  return { ok: true as const };
}

export async function completeLessonAction(
  lessonDocumentId: string,
  courseDocumentId: string
) {
  const res = await apiPost('/api/lesson-completions', {
    data: { lesson: lessonDocumentId },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath(`/courses/${courseDocumentId}`);
  revalidatePath(`/learn/${courseDocumentId}/${lessonDocumentId}`);

  return { ok: true as const };
}

export async function uncompleteLessonAction(
  completionDocumentId: string,
  courseDocumentId: string,
  lessonDocumentId: string
) {
  const res = await apiDelete(`/api/lesson-completions/${completionDocumentId}`);

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath(`/courses/${courseDocumentId}`);
  revalidatePath(`/learn/${courseDocumentId}/${lessonDocumentId}`);

  return { ok: true as const };
}
