import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LMS',
  description:
    'A learning management system with role-based access, course enrolment, progress tracking and auto-graded quizzes.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
