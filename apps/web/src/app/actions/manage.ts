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

/** The bounds a time limit has to sit inside, shared by create and update. */
const MIN_TIME_LIMIT = 30;
const MAX_TIME_LIMIT = 3 * 60 * 60;

/**
 * Everything create and update both have to check.
 *
 * One function rather than two copies, because the two paths must agree: a quiz
 * that could be created would otherwise be rejected on edit, or worse, the
 * reverse - an edit slipping through a rule that create enforces.
 */
function validateQuiz(input: {
  title: string;
  questions: QuestionInput[];
  timeLimitSeconds?: number;
}) {
  if (!input.title.trim()) return 'A title is required.';
  if (input.questions.length === 0) return 'Add at least one question.';

  if (input.timeLimitSeconds !== undefined) {
    if (!Number.isFinite(input.timeLimitSeconds)) return 'Enter a time limit in minutes.';
    if (input.timeLimitSeconds < MIN_TIME_LIMIT) {
      return 'A time limit of less than 30 seconds is not usable.';
    }
    if (input.timeLimitSeconds > MAX_TIME_LIMIT) {
      return 'Keep the time limit under three hours.';
    }
  }

  for (const [i, q] of input.questions.entries()) {
    if (!q.text.trim()) return `Question ${i + 1} needs some text.`;

    const options = q.options.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) return `Question ${i + 1} needs at least two options.`;

    if (q.correctIndex < 0 || q.correctIndex >= options.length) {
      return `Question ${i + 1} needs one of its options marked correct.`;
    }
  }

  return null;
}

/** The shape Strapi wants, from the shape the form holds. */
const quizPayload = (input: {
  title: string;
  questions: QuestionInput[];
  timeLimitSeconds?: number;
}) => ({
  title: input.title.trim(),
  ...(input.timeLimitSeconds === undefined
    ? {}
    : { timeLimitSeconds: input.timeLimitSeconds }),
  questions: input.questions.map((q) => ({
    text: q.text.trim(),
    options: q.options.map((o) => o.trim()).filter(Boolean),
    correctIndex: q.correctIndex,
  })),
});

export async function createQuizAction(input: {
  courseId: string;
  title: string;
  questions: QuestionInput[];
  timeLimitSeconds?: number;
}) {
  const problem = validateQuiz(input);
  if (problem) return { ok: false as const, error: problem };

  const res = await apiPost(`/api/quizzes`, {
    data: { ...quizPayload(input), course: input.courseId },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  revalidatePath(`/manage/courses/${input.courseId}`);
  revalidatePath(`/courses/${input.courseId}`);

  return { ok: true as const };
}

/**
 * Edit an existing quiz: its title, its time limit and its questions.
 *
 * `questions` is a component list, so Strapi replaces the whole array rather
 * than merging it - which is why the form always sends every question, not just
 * the changed one.
 *
 * Ownership is not checked here. It is checked by the can-manage-course-children
 * policy on the route, which walks from the quiz to its parent course and
 * compares the owner against the token. A check in this action would be a
 * second, weaker copy of that.
 */
export async function updateQuizAction(input: {
  documentId: string;
  courseId: string;
  title: string;
  questions: QuestionInput[];
  timeLimitSeconds?: number;
}) {
  const problem = validateQuiz(input);
  if (problem) return { ok: false as const, error: problem };

  const res = await apiPut(`/api/quizzes/${input.documentId}`, {
    data: quizPayload(input),
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
    },
  });

  if (!res.ok) return { ok: false as const, error: res.error };

  // A create always produces a draft. Publishing is a second, explicit step.
  if (input.publish) {
    const published = await apiPost(
      `/api/blog-posts/${res.data.data.documentId}/publish`,
      {}
    );
    if (!published.ok) return { ok: false as const, error: published.error };
  }

  revalidatePath('/blog');
  revalidatePath('/manage/blog');

  return { ok: true as const, documentId: res.data.data.documentId };
}

export async function setBlogPostPublishedAction(documentId: string, publish: boolean) {
  // Named endpoints, not a publishedAt field. In Strapi 5 every entry has a
  // draft and a published version, and writing publishedAt into the data is
  // silently overwritten - the post keeps a date that says it is live while
  // staying invisible to the public.
  const res = await apiPost(
    `/api/blog-posts/${documentId}/${publish ? 'publish' : 'unpublish'}`,
    {}
  );

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
