import { PageShell, PageHeader, Card } from '@/components/ui';

export const metadata = { title: 'Privacy Policy' };

/**
 * Privacy Policy.
 *
 * Every claim on this page is checkable against the code rather than borrowed
 * from a template - the cookie names are the ones in `lib/auth.ts`, the stored
 * fields are the columns the backend actually has, and the third parties listed
 * are the three this deployment genuinely talks to. A privacy policy that
 * describes tracking the application does not do, or omits data it does keep,
 * is worse than none: it teaches the reader that the page is decoration.
 */
export default function PrivacyPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Privacy Policy"
        description="What is stored, why, and who else can see it."
      />

      <p className="mt-6 text-small text-ink-500">Last updated 28 August 2026.</p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lead font-semibold tracking-tight">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-small leading-relaxed text-ink-600">
                  {paragraph}
                </p>
              ))}
            </div>
            {section.items && (
              <ul className="mt-3 space-y-2">
                {section.items.map(([term, detail]) => (
                  <li key={term} className="text-small leading-relaxed text-ink-600">
                    <span className="font-medium text-ink-900">{term}</span>
                    {' — '}
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <Card className="mt-10 p-5">
        <p className="text-small leading-relaxed text-ink-600">
          To see, correct or delete what is held about you, ask whoever
          administers the deployment you are using. An administrator can remove
          an account and the rows attached to it.
        </p>
      </Card>
    </PageShell>
  );
}

const SECTIONS: Array<{
  heading: string;
  paragraphs: string[];
  items?: Array<[string, string]>;
}> = [
  {
    heading: 'What is stored',
    paragraphs: [
      'Only what the platform needs to work. There is no analytics script, no advertising network and no third-party tracker on any page.',
    ],
    items: [
      ['Username and email', 'so an account can be identified and signed in.'],
      [
        'A password hash',
        'never the password itself. Accounts created through Google have no password at all.',
      ],
      [
        'Your role',
        'Student, Instructor, Content Manager or Admin, which decides what you can reach.',
      ],
      [
        'Enrolments and completed lessons',
        'so progress can be counted and a course can be resumed where you left it.',
      ],
      [
        'Quiz attempts and their scores',
        'kept as marked, including when the attempt was started and submitted.',
      ],
    ],
  },
  {
    heading: 'Cookies',
    paragraphs: [
      'Two, both strictly necessary, both set by this application on its own domain: lms_access holds a short-lived session token, and lms_refresh renews it so you are not signed out every few minutes.',
      'Both are httpOnly, which means the browser will not let any script read them - including a script injected into a page. Neither is used to track you between visits or across sites, and there are no other cookies to consent to or refuse.',
    ],
  },
  {
    heading: 'Who else sees it',
    paragraphs: [
      'Three services are involved in running the platform, and each sees only what its job requires:',
    ],
    items: [
      [
        'The hosting providers',
        'Vercel serves the site and Railway runs the backend and its database, so both necessarily handle the data stored here.',
      ],
      [
        'Google',
        'only if you choose Google sign-in. Google confirms the address is yours; the platform receives your email address and name, and never your Google password.',
      ],
      [
        'Instructors and administrators',
        'an instructor can see who is enrolled in their own courses and how those students are progressing. An administrator can see the user list and assign roles.',
      ],
    ],
  },
  {
    heading: 'What is not done',
    paragraphs: [
      'Your data is not sold, rented or shared with anyone beyond the services above. There is no profiling, no advertising, and no email sent to you other than what an action of yours triggers.',
    ],
  },
  {
    heading: 'How long it is kept',
    paragraphs: [
      'Account data and progress are kept while the account exists. Removing the account removes them. Because this is a project deployment rather than a commercial service, the database may also be reset wholesale - treat nothing stored here as permanent.',
    ],
  },
];
