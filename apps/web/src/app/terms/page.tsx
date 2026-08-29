import { PageShell, PageHeader, Card } from '@/components/ui';

export const metadata = { title: 'Terms of Service' };

/**
 * Terms of Service.
 *
 * Written to describe what this platform actually does, in the plainest words
 * that stay accurate. The temptation with a page like this is to paste the
 * boilerplate every site carries - arbitration clauses, limitation-of-liability
 * paragraphs, a governing jurisdiction - which would read as more serious and
 * be less true: this is a project-round submission, not a company, and terms
 * that describe a company that does not exist are not terms at all.
 *
 * A static server component. Nothing here is personalised, so nothing here
 * needs to reach the client as JavaScript.
 */
export default function TermsPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Terms of Service"
        description="What this platform is, and what using it means."
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
          </section>
        ))}
      </div>

      <Card className="mt-10 p-5">
        <p className="text-small leading-relaxed text-ink-600">
          Questions about these terms, or a request to have an account removed,
          go to whoever administers the deployment you are using. There is no
          support desk behind this page.
        </p>
      </Card>
    </PageShell>
  );
}

const SECTIONS: Array<{ heading: string; paragraphs: string[] }> = [
  {
    heading: 'What this is',
    paragraphs: [
      'This is a learning management platform built as a portfolio and assessment project. It hosts courses, lessons and quizzes, and it records the progress of the people taking them.',
      'It is offered as-is, with no guarantee that it will keep running, keep your data, or behave the same way tomorrow. Do not use it as the system of record for anything that matters.',
    ],
  },
  {
    heading: 'Your account',
    paragraphs: [
      'You need an account to enrol in a course, complete a lesson or take a quiz. You are responsible for the password on it, and for what is done through it while it is signed in.',
      'Every new account is created as a Student. Instructor, Content Manager and Admin roles are assigned by an administrator; there is no request you can send at sign-up that gives you one.',
      'An account may be suspended or removed if it is used to attack the platform, to reach content it was not granted, or to impersonate somebody else.',
    ],
  },
  {
    heading: 'Course content',
    paragraphs: [
      'Courses, lessons, quizzes and blog posts belong to whoever wrote them. You may read the material you are enrolled in and use it to learn. You may not republish it, sell it, or feed it into a service that redistributes it.',
      'If you write content here as an Instructor or Content Manager, you keep what you wrote, and you confirm you have the right to publish it.',
    ],
  },
  {
    heading: 'Quizzes and results',
    paragraphs: [
      'Quizzes are marked by the server, and a submitted attempt is kept as it was marked. Attempts are not editable after the fact - not by you, and not by an instructor - because a result that can be rewritten is not a result.',
      'Trying to extract answer keys, replay a timed attempt, or submit an attempt you did not start is a misuse of the platform rather than a clever trick, and it is grounds for removing the account.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'These terms can change as the platform does. The date above says when this version was written. Continuing to use the platform after a change means the current version applies.',
    ],
  },
];
