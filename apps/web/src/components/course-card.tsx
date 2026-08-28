import Link from 'next/link';
import type { Course } from '@/lib/api';

/**
 * A course in a list.
 *
 * Extracted because the home page and the catalogue were drifting apart - two
 * copies of the same card that had already stopped matching. One component means
 * a change to how a course looks happens once.
 */
export function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/courses/${course.documentId}`} className="group block h-full">
      <article className="ring-gradient flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft transition-all duration-200 hover:-translate-y-1.5 hover:shadow-lift">
        <CourseCover url={course.coverImageUrl} title={course.title} />

        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-lead font-semibold leading-snug transition-colors group-hover:text-brand-700">
            {course.title}
          </h3>

          {course.description && (
            <p className="mt-2 line-clamp-3 flex-1 text-small leading-relaxed text-ink-500">
              {course.description}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
            {course.owner?.username ? (
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.6rem] font-semibold text-white"
                  style={{ background: hueFor(course.owner.username) }}
                >
                  {course.owner.username.slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate text-micro text-ink-500">
                  {course.owner.username}
                </span>
              </span>
            ) : (
              <span />
            )}

            {typeof course.lessonCount === 'number' && (
              <span className="shrink-0 text-micro text-ink-400">
                {course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

/** Stable colour from a string, so a person or course keeps the same one. */
function hueFor(seed: string) {
  const h = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360, 11);
  return `oklch(0.62 0.14 ${h})`;
}

/**
 * Cover image, or a generated stand-in.
 *
 * `coverImageUrl` is a plain URL rather than an upload, because Railway's
 * filesystem is wiped on every redeploy and an uploaded file would vanish. Most
 * courses will not have one, so the fallback has to look deliberate rather than
 * broken: a two-tone field derived from the title, stable per course, with the
 * initial set large enough to read as a device rather than a mistake.
 */
function CourseCover({ url, title }: { url?: string | null; title: string }) {
  if (url) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary
            external host; next/image would need each domain allow-listed. */}
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      </div>
    );
  }

  const hue = [...title].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360, 7);

  return (
    <div
      aria-hidden
      className="relative grid aspect-[16/10] place-items-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, oklch(0.66 0.17 ${hue}), oklch(0.5 0.19 ${(hue + 55) % 360}))`,
      }}
    >
      {/* A blurred highlight, so the panel has a light source rather than being
          a flat ramp. */}
      <span
        className="absolute -left-10 -top-14 h-44 w-44 rounded-full opacity-50 blur-2xl"
        style={{ background: `oklch(0.85 0.14 ${(hue + 120) % 360})` }}
      />
      <span
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />
      <span className="relative text-mega font-semibold leading-none text-white/90 drop-shadow-sm transition-transform duration-500 group-hover:scale-110">
        {title.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}
