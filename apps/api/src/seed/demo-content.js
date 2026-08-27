'use strict';

/**
 * Creates a worked example of the platform: courses with lessons, a quiz, an
 * enrolment part-way through, and a blog post in each state.
 *
 * Why this exists: a correct application that contains nothing demonstrates
 * nothing. Deployed against an empty database the app signs you in perfectly and
 * then shows "No courses have been published yet" - so progress tracking, quiz
 * grading and the student roster, which is where the interesting work is, are
 * all invisible. This makes them visible the moment the app is deployed.
 *
 * ---------------------------------------------------------------------------
 * IT SEEDS ONCE, AND ONLY INTO AN EMPTY PLATFORM
 * ---------------------------------------------------------------------------
 * The other seeders reconcile - they run every boot and put things back. This
 * one deliberately does not. It checks whether ANY course exists and stops if
 * one does.
 *
 * The difference matters. Roles are infrastructure: if somebody deletes one, the
 * application is broken and restoring it is correct. Demo content is not - it is
 * a starting point. If an evaluator deletes a course to see deletion work, or
 * edits a lesson, resurrecting it on the next restart would be the application
 * fighting the person using it. So this fills an empty platform and then gets
 * out of the way permanently.
 *
 * SEED_DEMO_CONTENT=false skips it entirely.
 */

const COURSES = [
  {
    ownerEmail: 'instructor@lms.test',
    title: 'Introduction to Web Accessibility',
    slug: 'introduction-to-web-accessibility',
    description:
      'What accessibility actually means in practice, and how to build interfaces that work for people using screen readers, keyboards and magnification.',
    lessons: [
      {
        title: 'Why accessibility is not a feature',
        order: 1,
        content:
          'Accessibility is often treated as something added near the end of a project, which is the main reason it so often goes missing.\n\nIt is more useful to think of it as a property of a decision rather than a task on a list. Choosing a button element instead of a styled div is an accessibility decision. So is deciding that a colour alone will signal an error.\n\nThe practical consequence: the cheapest time to get this right is while you are choosing, not afterwards.',
      },
      {
        title: 'Semantic HTML does most of the work',
        order: 2,
        content:
          'A screen reader announces a <button> as a button, tells the user it can be pressed, and lets them reach it with the Tab key. None of that is true of a <div> with a click handler, no matter how it is styled.\n\nBefore reaching for an ARIA attribute, check whether an existing element already carries the meaning. Native elements come with keyboard behaviour, focus handling and announcements you would otherwise have to rebuild - and rebuild correctly.',
      },
      {
        title: 'Keyboard navigation',
        order: 3,
        content:
          'Try using your interface without a mouse. Tab moves forward, Shift+Tab moves back, Enter and Space activate.\n\nTwo failures are common. The first is an element you can reach but cannot see, because there is no visible focus outline - removing the default outline without replacing it is a genuine barrier, not a styling preference. The second is a focus trap: a dialog you can Tab into but never out of.',
      },
      {
        title: 'Colour and contrast',
        order: 4,
        content:
          'Colour is fine as a signal. Colour ALONE is not, because roughly one in twelve men has some form of colour vision deficiency, and because a screen reader conveys no colour at all.\n\nPair it with something else: an icon, a label, a change in shape. For text, aim for a contrast ratio of at least 4.5:1 against its background - large text can go to 3:1.',
      },
      {
        title: 'Testing what you have built',
        order: 5,
        content:
          'Automated tools catch perhaps a third of real problems. They are worth running, and they are not a pass mark.\n\nThe two checks that find the most for the least effort: navigate the whole flow with the keyboard only, and then listen to it with a screen reader. Both will surprise you the first several times.',
      },
    ],
    quiz: {
      title: 'Accessibility checkpoint',
      questions: [
        {
          text: 'Why is a <button> usually better than a <div> with a click handler?',
          options: [
            'It is shorter to type',
            'It comes with keyboard behaviour and is announced as a button',
            'It renders faster',
            'There is no real difference',
          ],
          correctIndex: 1,
        },
        {
          text: 'What is the minimum contrast ratio recommended for normal body text?',
          options: ['2:1', '3:1', '4.5:1', '10:1'],
          correctIndex: 2,
        },
        {
          text: 'Removing the default focus outline without replacing it...',
          options: [
            'is a harmless styling choice',
            'only affects mouse users',
            'makes keyboard navigation much harder to follow',
            'improves accessibility',
          ],
          correctIndex: 2,
        },
        {
          text: 'How much of real accessibility trouble do automated tools typically catch?',
          options: ['Almost all of it', 'About a third', 'None', 'Exactly half'],
          correctIndex: 1,
        },
      ],
    },
  },
  {
    ownerEmail: 'manager@lms.test',
    title: 'SQL Fundamentals',
    slug: 'sql-fundamentals',
    description:
      'Querying relational data with confidence: selecting, filtering, joining and grouping, and knowing which of those the database is actually good at.',
    lessons: [
      {
        title: 'SELECT and WHERE',
        order: 1,
        content:
          'A query describes the result you want, not the steps to produce it. The database decides how to get there.\n\nThat is worth internalising early, because it explains why two queries that look similar can perform very differently, and why the fix is usually to give the planner better information rather than to rewrite the logic.',
      },
      {
        title: 'JOIN, and what it costs',
        order: 2,
        content:
          'A join matches rows from two tables on a condition. An INNER JOIN keeps only rows with a match on both sides; a LEFT JOIN keeps every row from the left, filling in nulls where there is no match.\n\nThe common bug is a LEFT JOIN whose right-hand table is then filtered in the WHERE clause, which quietly turns it back into an inner join.',
      },
      {
        title: 'GROUP BY and aggregates',
        order: 3,
        content:
          'COUNT, SUM and AVG collapse many rows into one. GROUP BY says which rows collapse together.\n\nWHERE filters rows before grouping; HAVING filters groups after. Mixing them up gives answers that look plausible and are wrong, which is the worst kind of wrong.',
      },
      {
        title: 'Indexes',
        order: 4,
        content:
          'An index is a shortcut the database maintains so it does not have to read every row. It makes reads faster and writes slower, because every write has to update it too.\n\nIndex the columns you filter and join on. Do not index everything: an unused index is pure cost.',
      },
    ],
    quiz: {
      title: 'SQL checkpoint',
      questions: [
        {
          text: 'What is the difference between WHERE and HAVING?',
          options: [
            'They are interchangeable',
            'WHERE filters rows before grouping, HAVING filters groups after',
            'HAVING is faster',
            'WHERE only works on numbers',
          ],
          correctIndex: 1,
        },
        {
          text: 'Filtering a LEFT JOIN table in the WHERE clause usually...',
          options: [
            'has no effect',
            'turns it into an inner join',
            'causes a syntax error',
            'duplicates rows',
          ],
          correctIndex: 1,
        },
        {
          text: 'What does adding an index trade away?',
          options: [
            'Nothing',
            'Read speed',
            'Write speed and storage',
            'Query correctness',
          ],
          correctIndex: 2,
        },
      ],
    },
  },
];

const BLOG_POSTS = [
  {
    authorEmail: 'manager@lms.test',
    title: 'Welcome to the platform',
    slug: 'welcome-to-the-platform',
    excerpt: 'What you can do here, and who can do what.',
    body: 'This platform hosts courses made of ordered lessons, with quizzes that mark themselves.\n\nStudents enrol, work through lessons in sequence, and can see how far through each course they are. Instructors create courses and can see how their own students are progressing. Content managers look after all course content and this blog. Administrators additionally manage people and roles.\n\nEvery one of those boundaries is enforced on the server. Hiding a button is a courtesy to the person using the interface, not a security measure.',
    published: true,
  },
  {
    authorEmail: 'manager@lms.test',
    title: 'Coming soon: certificates',
    slug: 'coming-soon-certificates',
    excerpt: 'A draft post, left unpublished on purpose.',
    body: 'This post exists to demonstrate the draft state. It is visible to administrators and content managers in the management view, and to nobody else - a signed-out visitor asking for drafts explicitly still receives only published posts, because the backend pins the status rather than trusting the query string.',
    published: false,
  },
];

/** Looks a user up by email, so content can be attributed to the demo accounts. */
const userByEmail = async (strapi, email) =>
  strapi.db.query('plugin::users-permissions.user').findOne({ where: { email } });

module.exports = async (strapi) => {
  if (process.env.SEED_DEMO_CONTENT === 'false') {
    strapi.log.info('[seed] SEED_DEMO_CONTENT=false, skipping demo content');
    return { created: 0 };
  }

  // The one-shot check. See the note at the top of this file: this seeder fills
  // an empty platform and then never interferes again.
  const existingCourses = await strapi.db.query('api::course.course').count();
  if (existingCourses > 0) {
    return { created: 0 };
  }

  strapi.log.info('[seed] empty platform - creating demo content');

  const createdCourses = [];

  for (const definition of COURSES) {
    const owner = await userByEmail(strapi, definition.ownerEmail);
    if (!owner) {
      strapi.log.warn(
        `[seed] no user ${definition.ownerEmail}; skipping course "${definition.title}"`
      );
      continue;
    }

    const course = await strapi.documents('api::course.course').create({
      data: {
        title: definition.title,
        slug: definition.slug,
        description: definition.description,
        owner: owner.id,
      },
    });

    const lessons = [];
    for (const lesson of definition.lessons) {
      lessons.push(
        await strapi.documents('api::lesson.lesson').create({
          data: {
            title: lesson.title,
            order: lesson.order,
            content: lesson.content,
            course: course.id,
          },
        })
      );
    }

    if (definition.quiz) {
      await strapi.documents('api::quiz.quiz').create({
        data: {
          title: definition.quiz.title,
          course: course.id,
          questions: definition.quiz.questions,
        },
      });
    }

    createdCourses.push({ course, lessons });
    strapi.log.info(
      `[seed] created course "${definition.title}" with ${lessons.length} lesson(s)`
    );
  }

  // Put the demo student part-way through the first course, so the progress bar
  // shows a real number rather than 0% - the calculation is more convincing when
  // it is visibly not just counting to zero.
  const student = await userByEmail(strapi, 'student@lms.test');
  const first = createdCourses[0];

  if (student && first) {
    await strapi.documents('api::enrollment.enrollment').create({
      data: {
        student: student.id,
        course: first.course.id,
        enrolledAt: new Date(),
        enrollmentKey: `${student.id}:${first.course.id}`,
      },
    });

    const completeUpTo = 2;
    for (const lesson of first.lessons.slice(0, completeUpTo)) {
      await strapi.documents('api::lesson-completion.lesson-completion').create({
        data: {
          student: student.id,
          lesson: lesson.id,
          course: first.course.id,
          completedAt: new Date(),
          completionKey: `${student.id}:${lesson.id}`,
        },
      });
    }

    strapi.log.info(
      `[seed] enrolled student@lms.test in "${first.course.title}" (${completeUpTo}/${first.lessons.length} complete)`
    );
  }

  for (const post of BLOG_POSTS) {
    const author = await userByEmail(strapi, post.authorEmail);
    if (!author) continue;

    const created = await strapi.documents('api::blog-post.blog-post').create({
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        author: author.id,
      },
    });

    // Publishing is an ACTION, not a field.
    //
    // Setting publishedAt in the data above looks like it should work and does
    // not: in Strapi 5 every entry has a draft version and a published version,
    // create() writes the draft, and the value is simply overwritten. The post
    // then stays invisible to the public with nothing to explain why - the
    // record exists, the date is set, and the catalogue is still empty.
    if (post.published) {
      await strapi.documents('api::blog-post.blog-post').publish({
        documentId: created.documentId,
      });
    }
  }

  strapi.log.info(`[seed] created ${BLOG_POSTS.length} blog post(s)`);

  return { created: createdCourses.length };
};
