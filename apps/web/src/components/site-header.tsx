'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { RoleType } from '@/lib/auth';
import { SearchBox } from '@/components/search-box';
import { UserMenu } from '@/components/user-menu';

type NavLink = { href: string; label: string };

/**
 * The header, on every page.
 *
 * It is a client component because it needs the current path to mark the active
 * link and local state for the mobile menu - but the USER is passed in from the
 * server rather than fetched here. That keeps the identity decision on the
 * server, where the token is, and means the header cannot briefly render a
 * signed-out state while it works out who is looking.
 */
export function SiteHeader({
  user,
}: {
  user: { username: string; email?: string; role: { type: RoleType; name: string } } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Close the menu on navigation. Without this the panel stays open over the new
  // page, which reads as the link having failed.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes it, which people expect of anything overlaying the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const links: NavLink[] = [{ href: '/courses', label: 'Courses' }, { href: '/blog', label: 'Blog' }];

  if (user) {
    links.push({ href: '/dashboard', label: 'Dashboard' });

    if (user.role.type === 'student') {
      links.push({ href: '/dashboard/learning', label: 'My learning' });
      links.push({ href: '/dashboard/results', label: 'Results' });
    }
    if (['instructor', 'content-manager', 'admin'].includes(user.role.type)) {
      links.push({ href: '/manage/courses', label: 'Manage' });
    }
    if (['content-manager', 'admin'].includes(user.role.type)) {
      links.push({ href: '/manage/blog', label: 'Blog admin' });
    }
    if (user.role.type === 'admin') {
      links.push({ href: '/dashboard/admin', label: 'Admin' });
    }
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          LMS
        </Link>

        {/* Desktop navigation. Hidden below md, where the menu button takes over. */}
        <nav aria-label="Main" className="hidden flex-1 md:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`relative rounded-md px-3 py-1.5 text-small transition-colors ${
                    isActive(link.href)
                      ? 'text-ink-900'
                      : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {link.label}
                  {/* The active underline is a shared layout element, so it
                      slides between links instead of disappearing and
                      reappearing. layoutId is what ties the two together. */}
                  {isActive(link.href) && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden w-56 lg:block">
          <SearchBox initial="" compact />
        </div>

        <div className="ml-auto flex items-center gap-3 lg:ml-3">
          {user ? (
            <div className="hidden md:block">
              <UserMenu user={user} />
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md bg-ink-900 px-3.5 py-1.5 text-small font-medium text-white transition-transform hover:scale-[1.03] md:inline-block"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-9 w-9 place-items-center rounded-md border border-ink-200 md:hidden"
          >
            {/* Three bars that become a cross. Animating the same elements
                rather than swapping icons keeps the transition continuous. */}
            <span className="relative block h-3.5 w-4">
              <motion.span
                animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-0 h-0.5 w-4 rounded bg-ink-900"
              />
              <motion.span
                animate={open ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-1.5 h-0.5 w-4 rounded bg-ink-900"
              />
              <motion.span
                animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-3 h-0.5 w-4 rounded bg-ink-900"
              />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Main"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-ink-200 md:hidden"
          >
            <div className="px-4 pt-3">
              <SearchBox initial="" compact onNavigate={() => setOpen(false)} />
            </div>

            <ul className="space-y-1 px-4 pb-3 pt-2">
              {links.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.2 }}
                >
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={`block rounded-md px-3 py-2 text-small ${
                      isActive(link.href)
                        ? 'bg-ink-100 font-medium text-ink-900'
                        : 'text-ink-600'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}

              {user && (
                <li>
                  <Link
                    href="/account"
                    className="block rounded-md px-3 py-2 text-small text-ink-600"
                  >
                    Account settings
                  </Link>
                </li>
              )}

              <li className="border-t border-ink-200 pt-2">
                {user ? (
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={busy}
                    className="block w-full rounded-md px-3 py-2 text-left text-small text-ink-600 disabled:opacity-50"
                  >
                    {busy ? 'Signing out…' : `Sign out (${user.username})`}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="block rounded-md bg-ink-900 px-3 py-2 text-center text-small font-medium text-white"
                  >
                    Sign in
                  </Link>
                )}
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
