'use strict';

/**
 * Layer 1 of authorization: which role may reach which endpoint at all.
 *
 * A Users & Permissions "permission" is just a row pairing a role with an action
 * string, where the action string is `<content-type-uid>.<controller-method>`.
 * If the row exists the role can call that endpoint; if it does not, Strapi
 * answers 403 before any of our code runs.
 *
 * This layer is deliberately COARSE. It answers "may an Instructor call
 * PUT /api/courses/:id at all?" - not "is this Instructor allowed to edit THIS
 * course?". Ownership is a property of a row, not of a route, so it cannot be
 * expressed here. That is what the policies in src/policies (layer 2) and the
 * controller overrides (layer 3) are for.
 *
 * Two rules constrain what may appear below:
 *
 *  1. Every action must correspond to a real controller method. On every boot
 *     the users-permissions plugin compares the permission table against the
 *     methods it can actually find and DELETES any row it cannot match
 *     (syncPermissions, users-permissions.js:199). A typo here does not raise
 *     an error - the permission is silently dropped, and the endpoint 403s.
 *     So custom endpoints get added to this file only once their controller
 *     method and route exist.
 *
 *  2. Granting an action to a role is granting it for EVERY row of that type.
 *     Whenever the intended rule is narrower than that, the entry below carries
 *     a note naming the policy that narrows it. An entry without a narrowing
 *     note is genuinely unrestricted.
 */

// Content-type UIDs. Strapi builds these as `api::<api-name>.<content-type-name>`.
const COURSE = 'api::course.course';
const LESSON = 'api::lesson.lesson';
const ENROLLMENT = 'api::enrollment.enrollment';
const COMPLETION = 'api::lesson-completion.lesson-completion';
const QUIZ = 'api::quiz.quiz';
const ATTEMPT = 'api::quiz-attempt.quiz-attempt';
const BLOG = 'api::blog-post.blog-post';

// The content types this file is responsible for. Used to work out which
// permission rows the seed owns and may therefore revoke - see roles.js.
const MANAGED_CONTENT_TYPES = [COURSE, LESSON, ENROLLMENT, COMPLETION, QUIZ, ATTEMPT, BLOG];

// The five methods a Strapi factory controller generates.
const READ = ['find', 'findOne'];
const WRITE = ['create', 'update', 'delete'];
const CRUD = [...READ, ...WRITE];

/** Expands a content type and a list of methods into action strings. */
const on = (uid, methods) => methods.map((method) => `${uid}.${method}`);

// Endpoints belonging to the users-permissions plugin itself, which the Admin
// role needs in order to manage users. `destroy` rather than `delete` - that is
// the method name the plugin uses.
const USER_READ = [
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  'plugin::users-permissions.user.count',
];
const USER_WRITE = [
  'plugin::users-permissions.user.update',
  'plugin::users-permissions.user.destroy',
];
// Endpoints every signed-in user needs, whatever their role.
//
// Strapi puts these on its built-in Authenticated role, and a Users & Permissions
// user holds exactly ONE role - there is no inheritance from Authenticated. So a
// user who holds Admin, Content Manager, Instructor or Student does not get them,
// and every one of the four roles has to be granted them explicitly.
//
// user.me is the one that matters. This application's JWT carries no role claim
// (its payload is userId, sessionId, type), so the only way the frontend can
// learn who is calling is GET /api/users/me?populate=role. Without this grant
// that request answers 403 for every real user, getCurrentUser() cannot resolve
// a role, and no role-dependent screen can render - while the seed logs look
// perfectly correct, because the roles and their content-type permissions are.
const SESSION = [
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.auth.logout',
  'plugin::users-permissions.auth.changePassword',
  // Needed so a user can discover their OWN role. Strapi sanitises the /users/me
  // response against the caller's own abilities, and strips any relation pointing at
  // a content type the caller cannot read. Without it, ?populate=role answers 200
  // with the role field silently ABSENT - worse than the 403 it replaces, because
  // the request looks like it succeeded.
  //
  // It has to be .find, not .findOne: granting only findOne was tested and the field
  // was still stripped, because the sanitiser asks whether the caller may read the
  // collection, not one document of it. The cost is that any signed-in user can call
  // GET /api/users-permissions/roles, which returns names, types and user counts -
  // no permissions, and the same four roles this project's README documents publicly.
  // Creating and deleting roles stays ungranted, so the permission model itself
  // cannot be edited through the API.
  'plugin::users-permissions.role.find',
];

const ROLES = [
  {
    type: 'admin',
    name: 'Admin',
    description:
      'Full platform control, including user management and role assignment. This is an application role, not a Strapi admin-panel role - an Admin has no access to /admin.',
    permissions: [
      ...SESSION,
      ...USER_READ,
      ...USER_WRITE,
      ...on(COURSE, CRUD),
      ...on(LESSON, CRUD),
      ...on(QUIZ, CRUD),
      // Admin manages every blog post, including other people's. Same actions
      // as a Content Manager; the difference lives in the owns-blog-post policy.
      ...on(BLOG, CRUD),
      // Read-only on the student-generated records. An Admin needs to see
      // enrollments, completions and results to run the dashboard, but nothing
      // in the brief calls for editing somebody's progress by hand, so the
      // write surface stays closed.
      ...on(ENROLLMENT, READ),
      ...on(COMPLETION, READ),
      ...on(ATTEMPT, READ),
    ],
  },

  {
    type: 'content-manager',
    name: 'Content Manager',
    description: 'Creates and manages all course content and blog posts, but cannot manage users.',
    permissions: [
      ...SESSION,
      // Any course, not just their own - that is what separates a Content
      // Manager from an Instructor.
      ...on(COURSE, CRUD),
      ...on(LESSON, CRUD),
      ...on(QUIZ, CRUD),
      // Narrowed by owns-blog-post: a Content Manager manages the posts they
      // wrote. Only an Admin manages everyone's.
      ...on(BLOG, CRUD),
      ...on(ENROLLMENT, READ),
      ...on(COMPLETION, READ),
      ...on(ATTEMPT, READ),
    ],
  },

  {
    type: 'instructor',
    name: 'Instructor',
    description: 'Creates and manages their own courses, lessons and quizzes, and sees the progress of students enrolled in them.',
    permissions: [
      ...SESSION,
      // Narrowed by is-owner-or-manager: writes are rejected unless
      // course.owner is the authenticated user.
      ...on(COURSE, CRUD),
      // Narrowed by can-manage-course-children: a lesson or quiz is writable
      // only if its parent course is owned by the caller. The check has to walk
      // to the parent, because a lesson has no owner of its own.
      ...on(LESSON, CRUD),
      ...on(QUIZ, CRUD),
      // Narrowed by controller read scoping to courses this instructor owns.
      ...on(ENROLLMENT, READ),
      ...on(COMPLETION, READ),
      ...on(ATTEMPT, READ),
      // Instructors read the blog like anyone else but do not write it.
      ...on(BLOG, READ),
    ],
  },

  {
    type: 'student',
    name: 'Student',
    description: 'Enrolls in courses, works through lessons, tracks progress and takes quizzes.',
    permissions: [
      ...SESSION,
      ...on(COURSE, READ),
      // Narrowed by is-enrolled: lesson content is not readable just because
      // the course is listed publicly.
      ...on(LESSON, READ),

      // Enrolling. `create` derives the student from the token rather than the
      // request body, so a student cannot enrol somebody else. Reads are scoped
      // to their own rows by forcing the filter in the controller.
      ...on(ENROLLMENT, ['find', 'findOne', 'create']),

      // Marking lessons complete. `delete` is granted so completion can be
      // toggled back off; the policy restricts it to the student's own rows.
      ...on(COMPLETION, ['find', 'findOne', 'create', 'delete']),

      // Quizzes are readable, with correctIndex stripped in the controller.
      ...on(QUIZ, READ),

      // Reading their own results.
      //
      // NOTE the absence of `create` here, which is not an oversight. Granting
      // quiz-attempt.create would let a student POST their own score straight
      // to the API and mark themselves 10/10. Attempts are created only by the
      // server, inside POST /api/quizzes/:id/submit, which grades the answers
      // itself. That endpoint's action is added to this list once it exists.
      ...on(ATTEMPT, READ),

      ...on(BLOG, READ),
    ],
  },

  {
    // Unauthenticated visitors. Strapi creates this role itself; the seed only
    // adds the two things that are meant to be readable without logging in.
    type: 'public',
    name: 'Public',
    description: 'Unauthenticated visitors. Can browse the course catalogue and read published blog posts.',
    permissions: [
      // The catalogue is a shop window: title, description, cover image. Lesson
      // content is deliberately not here, so a visitor can see what exists
      // without getting the material for free.
      ...on(COURSE, READ),
      // Draft & Publish means Strapi returns only published posts by default.
      // "By default" is doing a lot of work in that sentence - a caller can ask
      // for drafts with ?status=draft - so the controller pins the status for
      // unauthenticated callers rather than trusting the query string.
      ...on(BLOG, READ),
    ],
  },

  {
    // Strapi's built-in fallback role. Every user of this application holds one
    // of the four roles above, so nobody should ever have this one. It is listed
    // here with an empty permission set on purpose: if a user does somehow end
    // up as plain Authenticated, they get no access to anything rather than
    // inheriting whatever happened to be enabled. Fail closed.
    type: 'authenticated',
    name: 'Authenticated',
    description: 'Unused fallback. Application users hold Admin, Content Manager, Instructor or Student.',
    permissions: [],
  },
];

/** The role new self-registered users receive. Anyone signing up is a Student. */
const DEFAULT_ROLE_TYPE = 'student';

module.exports = {
  ROLES,
  MANAGED_CONTENT_TYPES,
  DEFAULT_ROLE_TYPE,
};
