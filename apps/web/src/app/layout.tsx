import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getCurrentUser } from '@/lib/auth';
import { SiteHeader } from '@/components/site-header';

/**
 * next/font downloads and self-hosts the font at build time, so there is no
 * request to a third party at runtime and no flash of unstyled text. The
 * variable form means one file covers every weight used here.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: { default: 'LMS', template: '%s — LMS' },
  description:
    'A learning management system with role-based access, course enrolment, progress tracking and auto-graded quizzes.',
};

/**
 * The user is resolved HERE, once per request, and handed to the header.
 *
 * getCurrentUser is wrapped in React's cache, so a page that also needs the user
 * does not cause a second call. Resolving it on the server means the header
 * never renders a signed-out state and then corrects itself.
 */
export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-ink-900 antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>

        <SiteHeader
          user={user ? { username: user.username, role: user.role } : null}
        />

        <div id="main" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
