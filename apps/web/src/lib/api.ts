/**
 * Server-side calls to Strapi, carrying the signed-in user's access token.
 *
 * Everything here runs on the server. The token lives in an httpOnly cookie the
 * browser cannot read, which is the point: the browser asks THIS application for
 * data, and this application asks Strapi. A token that reached the browser could
 * be stolen by any script that got onto the page.
 *
 * Note there is no client-side equivalent. That is deliberate - if a component
 * needs data from Strapi, it either renders on the server or goes through a
 * Route Handler or Server Action here.
 */
import { cookies } from 'next/headers';
import { STRAPI_URL } from './strapi';
import { ACCESS_COOKIE } from './auth';

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`${STRAPI_URL}${path}`, {
      ...init,
      headers,
      // Never cache authorised reads. Two different users must not be able to
      // receive each other's response out of a shared cache.
      cache: 'no-store',
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'Could not reach the API.',
    };
  }

  if (res.status === 204) {
    return { ok: true, data: undefined as T, status: res.status };
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body?.error?.message ?? `Request failed (${res.status}).`,
    };
  }

  return { ok: true, data: body as T, status: res.status };
}

export const apiGet = <T>(path: string) => request<T>(path);

export const apiPost = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPut = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });

/* ------------------------------------------------------------------ */
/* Shapes returned by the backend. Only the fields the UI actually uses. */
/* ------------------------------------------------------------------ */

export type Course = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImageUrl?: string | null;
  owner?: { id: number; username: string } | null;
  lessonCount?: number;
  quizCount?: number;
  studentCount?: number;
};

export type Lesson = {
  id: number;
  documentId: string;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  order: number;
};

export type Quiz = {
  id: number;
  documentId: string;
  title: string;
  questions: Array<{
    id?: number;
    text: string;
    options: string[];
    correctIndex?: number; // present only for the owning instructor and staff
  }>;
};

export type Progress = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  lessons: Array<{
    documentId: string;
    title: string;
    order: number;
    completed: boolean;
  }>;
};

export type Enrollment = {
  documentId: string;
  enrolledAt: string;
  course?: Course & { lessons?: Lesson[] };
};

export type AttemptSummary = {
  documentId: string;
  score: number;
  total: number;
  percentage: number;
  submittedAt: string;
  quiz: { documentId: string; title: string } | null;
  course: { documentId: string; title: string } | null;
};

export type AdminStats = {
  usersByRole: Array<{ role: string; count: number }>;
  totals: {
    users: number;
    courses: number;
    lessons: number;
    enrollments: number;
    quizAttempts: number;
    blogPosts: number;
  };
};

export type AdminUser = {
  documentId: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  role: { type: string; name: string } | null;
};

export type BlogPost = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  publishedAt?: string | null;
  author?: { username: string } | null;
};
