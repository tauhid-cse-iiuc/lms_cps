'use server';

/**
 * Server Actions for creating and editing content.
 *
 * None of these check who is calling. That is not an oversight: the backend
 * refuses a request from the wrong person regardless, through the permission
 * matrix and the ownership policies. Repeating the check here would give two
 * places for the rule to live and two places for it to drift, and the one that
 * actually protects the data is the one in Strapi - a Server Action is a
 * convenience for the UI, not a security boundary.
 *
 * What they DO carefully avoid is sending an identity field. `owner`, `author`
 * and `student` are derived from the token on the server side, so nothing here
 * ever names them.
 */
import { revalidatePath } from 'next/cache';
import { apiPost, apiPut, apiDelete } from '@/lib/api';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/* ----------------------------- courses ----------------------------- */

export async function createCourseAction(input: {
  title: string;
  description: string;
  coverImageUrl: string;
}) {
  if (!input.title.trim()) {
    return { ok: false as const, error: 'A title is required.' };
  }

  const res = await apiPost<{ data: { documentId: string } }>('/api/courses', {
    data: {
      title: input.title.trim(),
      // A slug the user did not have to think about. Suffixed with a short
      // timestamp because two courses may legitimately share a title, and the
      // field is unique.
      slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
      description: input.description.trim() || undefined,
      coverImageUrl: input.coverImageUrl.trim() || undefined,
    },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath('/courses');
  revalidatePath('/manage/courses');

  return { ok: true as const, documentId: res.data.data.documentId };
}

export async function updateCourseAction(
  documentId: string,
  input: { title: string; description: string; coverImageUrl: string }
) {
  const res = await apiPut(`/api/courses/${documentId}`, {
    data: {
      title: input.title.trim(),
      description: input.description.trim() || null,
      coverImageUrl: input.coverImageUrl.trim() || null,
    },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath('/courses');
  revalidatePath(`/courses/${documentId}`);
  revalidatePath(`/manage/courses/${documentId}`);

  return { ok: true as const };
}

export async function deleteCourseAction(documentId: string) {
  const res = await apiDelete(`/api/courses/${documentId}`);
  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath('/courses');
  revalidatePath('/manage/courses');

  return { ok: true as const };
}

/* ----------------------------- lessons ----------------------------- */

export async function createLessonAction(input: {
  courseId: string;
  title: string;
  content: string;
  videoUrl: string;
  order: number;
}) {
  if (!input.title.trim()) {
    return { ok: false as const, error: 'A title is required.' };
  }

  const res = await apiPost(`/api/lessons`, {
    data: {
      title: input.title.trim(),
      content: input.content.trim() || undefined,
      videoUrl: input.videoUrl.trim() || undefined,
      order: input.order,
      course: input.courseId,
    },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath(`/manage/courses/${input.courseId}`);
  revalidatePath(`/courses/${input.courseId}`);

  return { ok: true as const };
}

export async function updateLessonAction(
  documentId: string,
  courseId: string,
  input: { title: string; content: string; videoUrl: string; order: number }
) {
  const res = await apiPut(`/api/lessons/${documentId}`, {
    data: {
      title: input.title.trim(),
      content: input.content.trim() || null,
      videoUrl: input.videoUrl.trim() || null,
      order: input.order,
    },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath(`/manage/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);

  return { ok: true as const };
}

export async function deleteLessonAction(documentId: string, courseId: string) {
  const res = await apiDelete(`/api/lessons/${documentId}`);
  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath(`/manage/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);

  return { ok: true as const };
}

/* ------------------------------ quizzes ----------------------------- */

export type QuestionInput = { text: string; options: string[]; correctIndex: number };

export async function createQuizAction(input: {
  courseId: string;
  title: string;
  questions: QuestionInput[];
}) {
  if (!input.title.trim()) return { ok: false as const, error: 'A title is required.' };
  if (input.questions.length === 0) {
    return { ok: false as const, error: 'Add at least one question.' };
  }

  for (const [i, q] of input.questions.entries()) {
    if (!q.text.trim()) {
      return { ok: false as const, error: `Question ${i + 1} needs some text.` };
    }
    const options = q.options.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) {
      return { ok: false as const, error: `Question ${i + 1} needs at least two options.` };
    }
    if (q.correctIndex < 0 || q.correctIndex >= options.length) {
      return {
        ok: false as const,
        error: `Question ${i + 1} needs one of its options marked correct.`,
      };
    }
  }

  const res = await apiPost(`/api/quizzes`, {
    data: {
      title: input.title.trim(),
      course: input.courseId,
      questions: input.questions.map((q) => ({
        text: q.text.trim(),
        options: q.options.map((o) => o.trim()).filter(Boolean),
        correctIndex: q.correctIndex,
      })),
    },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath(`/manage/courses/${input.courseId}`);
  revalidatePath(`/courses/${input.courseId}`);

  return { ok: true as const };
}

export async function deleteQuizAction(documentId: string, courseId: string) {
  const res = await apiDelete(`/api/quizzes/${documentId}`);
  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath(`/manage/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);

  return { ok: true as const };
}

/* ------------------------------- admin ------------------------------ */

export async function setUserRoleAction(userDocumentId: string, role: string) {
  const res = await apiPut<{ data: { changed: boolean } }>(
    `/api/admin/users/${userDocumentId}/role`,
    { role }
  );

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath('/dashboard/admin');

  return { ok: true as const, changed: res.data.data.changed };
}

/* -------------------------------- blog ------------------------------ */

export async function createBlogPostAction(input: {
  title: string;
  excerpt: string;
  body: string;
  publish: boolean;
}) {
  if (!input.title.trim()) return { ok: false as const, error: 'A title is required.' };

  const res = await apiPost<{ data: { documentId: string } }>('/api/blog-posts', {
    data: {
      title: input.title.trim(),
      slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
      excerpt: input.excerpt.trim() || undefined,
      body: input.body.trim() || undefined,
      // Draft & Publish is native to Strapi. Setting publishedAt is what makes a
      // post public; leaving it null keeps it a draft, which the backend hides
      // from anyone without write access.
      publishedAt: input.publish ? new Date().toISOString() : null,
    },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath('/blog');
  revalidatePath('/manage/blog');

  return { ok: true as const, documentId: res.data.data.documentId };
}

export async function setBlogPostPublishedAction(documentId: string, publish: boolean) {
  const res = await apiPut(`/api/blog-posts/${documentId}`, {
    data: { publishedAt: publish ? new Date().toISOString() : null },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath('/blog');
  revalidatePath('/manage/blog');

  return { ok: true as const };
}

export async function deleteBlogPostAction(documentId: string) {
  const res = await apiDelete(`/api/blog-posts/${documentId}`);
  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath('/blog');
  revalidatePath('/manage/blog');

  return { ok: true as const };
}
