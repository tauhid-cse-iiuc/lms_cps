'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { RoleType } from '@/lib/auth';
import { displayName } from '@/lib/display-name';

type MenuUser = {
  username: string;
  name?: string | null;
  email?: string;
  role: { type: RoleType; name: string };
};

/**
 * The account menu behind the avatar.
 *
 * Replaces a bare "Sign out" button. Sign out was taking the most prominent
 * slot in the header while being the one thing a signed-in person almost never
 * wants; putting it at the bottom of a menu costs one click and stops it being
 * the easiest control to hit by accident.
 *
 * Closing behaviour is the part worth getting right: click outside, Escape, and
 * any navigation all dismiss it. A menu that survives a route change reads as
 * the link having failed.
 */
export function UserMenu({ user }: { user: MenuUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        // Return focus to the trigger, or the keyboard user is stranded at the
        // top of the document with no idea where they are.
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const links: Array<[string, string]> = [['/dashboard', 'Dashboard']];

  if (user.role.type === 'student') {
    links.push(['/dashboard/learning', 'My learning'], ['/dashboard/results', 'My results']);
  }
  if (['instructor', 'content-manager', 'admin'].includes(user.role.type)) {
    links.push(['/manage/courses', 'Manage courses']);
  }
  if (['content-manager', 'admin'].includes(user.role.type)) {
    links.push(['/manage/blog', 'Manage blog']);
  }
  if (user.role.type === 'admin') {
    links.push(['/dashboard/admin', 'Administration']);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-menu"
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-ink-100"
      >
        <Avatar name={displayName(user)} />
        <span className="hidden text-small font-medium text-ink-700 sm:inline">
          {displayName(user)}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className={`h-3.5 w-3.5 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="m6 8 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">Account menu</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="user-menu"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-ink-100 p-4">
              <Avatar name={displayName(user)} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-small font-semibold">
                  {displayName(user)}
                </p>
                {user.email && (
                  <p className="truncate text-micro text-ink-500">{user.email}</p>
                )}
                <p className="mt-1 text-micro font-medium text-brand-600">
                  {user.role.name}
                </p>
              </div>
            </div>

            <ul className="p-1.5">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    role="menuitem"
                    className="block rounded-lg px-3 py-2 text-small text-ink-700 transition-colors hover:bg-ink-100"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="border-t border-ink-100 p-1.5">
              <Link
                href="/account"
                role="menuitem"
                className="block rounded-lg px-3 py-2 text-small text-ink-700 transition-colors hover:bg-ink-100"
              >
                Account settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                disabled={busy}
                className="block w-full rounded-lg px-3 py-2 text-left text-small text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
              >
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Initials on a colour derived from the name, so it is stable per person. */
export function Avatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'md' | 'lg';
}) {
  const hue = [...name].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360, 11);

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${
        size === 'lg' ? 'h-10 w-10 text-small' : 'h-8 w-8 text-micro'
      }`}
      style={{
        background: `linear-gradient(135deg, oklch(0.66 0.16 ${hue}), oklch(0.5 0.18 ${(hue + 50) % 360}))`,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
