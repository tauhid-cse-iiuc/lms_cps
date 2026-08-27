# Architecture

The reasoning behind the structure. `README.md` says what this is and how to run
it; this says why it is shaped the way it is, and what each decision cost.

Everything below was verified against a running server rather than assumed —
where a claim is surprising, the way it was checked is stated.

---

## 1. Shape

```
lms_cps/
├── apps/api    Strapi 5.52 (JavaScript)  →  Railway + managed Postgres
└── apps/web    Next.js 16 (App Router)   →  Vercel
```

Two applications, two deployments, one repository. The frontend never talks to
the database and the backend never renders a page.

The browser talks **only** to Next.js. Next.js talks to Strapi server-to-server.
That single fact drives most of the auth design in §3 — a token can live in a
cookie the browser cannot read, because the browser never needs to read it.

```
browser ──httpOnly cookie──▶ Next.js ──Bearer token──▶ Strapi ──▶ Postgres
```

---

## 2. Data model

Seven content types and one component.

| Type | Notes |
|---|---|
| `course` | `owner` → user. Not `instructor`: a Content Manager creates courses too, and calling that person the instructor would make the schema lie. |
| `lesson` | `order` is a **required integer**. Sequencing by `id` or `createdAt` breaks the moment a lesson is inserted between two others — which is exactly when an instructor is most likely to do it. |
| `enrollment` | `student`, `course`, `enrolledAt`, plus a uniqueness key (§5). |
| `lesson-completion` | `student`, `lesson`, **`course`**, `completedAt`, plus a uniqueness key. |
| `quiz` | `questions` is a repeatable `quiz.question` component. |
| `quiz-attempt` | `answers`, `score`, `total` — all stored (§4). |
| `blog-post` | The only type with Draft & Publish enabled (§6). |
| `quiz.question` | `text`, `options` (json), **`correctIndex`** — the answer key. |

**`course` is denormalised onto `lesson-completion`.** It is reachable through
the lesson, so storing it again is duplication — chosen deliberately. Strapi
keeps every relation in a separate link table, so counting a student's
completions within a course would otherwise mean joining completions to lessons
to courses on every progress bar. With the course recorded directly it is one
indexed count. The copy cannot drift, because a lesson never moves between
courses in this application.

**Images and video are plain URL strings, not Strapi media uploads.** Railway's
filesystem is ephemeral: an uploaded file disappears on the next redeploy, taking
every reference with it. The brief permits a URL.

---

## 3. Authentication

### The token carries no role

Measured, not assumed — the access token's payload is:

```json
{ "userId": "4", "sessionId": "ca2bfa58…", "type": "access", "iat": …, "exp": … }
```

No role. So the role is **fetched**, via `GET /api/users/me?populate=role`, on
every request that needs it (cached per request with React's `cache`).

That is slower than reading a claim, and better: a demotion takes effect on the
user's next request rather than whenever their token happens to expire.

### Two cookies, because the access token lives ten minutes

`apps/api/config/plugins.js` sets `jwtManagement: 'refresh'`, which switches
Strapi from a 30-day plugin JWT to short access tokens plus a rotating refresh
token.

| | Lifetime |
|---|---|
| Access token | 600 seconds |
| Refresh token | 14 days idle, 30 days absolute — **rotates on every use** |
| Session | 7 days idle, 30 days absolute (raised from Strapi's 2h/1d defaults) |

Both tokens live in httpOnly, Secure, SameSite=Lax cookies set by **this
application on its own domain**. Never `localStorage`: a token JavaScript can
read is a token an XSS can steal, and it would also be invisible to Server
Components and middleware, which is where access control has to be able to see
it.

The access cookie is deliberately given **nine** minutes, not ten. Expiring the
cookie slightly before the token inside it means the browser stops sending a
credential shortly before the backend would start rejecting it, so renewal is
clean rather than racing an expiry.

### Renewal happens in middleware, and rewrites the request

A Server Component can *read* cookies but cannot *set* them, so it cannot persist
a token it renewed. Middleware can do both, which makes it very nearly the only
place this can live.

The subtlety worth knowing: setting a cookie on the **response** tells the
browser about the new token and does nothing for the request currently being
handled — the page about to render still sees the old cookie header and concludes
nobody is signed in. So the incoming request's cookies are rewritten too, and the
amended headers passed down the pipeline. Without that, every renewal costs the
user one spuriously logged-out page.

Refresh tokens rotate, so the replacement is stored as well. Missing it signs the
user out on the request *after* next, which looks random rather than like an
expiry.

A **network failure** during renewal does not clear the cookies. Only an explicit
rejection from the backend does — an outage on our side is not a reason to end
somebody's session.

`sessions.httpOnly` is set to `false`, which reads like the weaker choice and is
not. It makes Strapi return the refresh token in the response body instead of
setting its own cookie. Strapi's cookie would belong to the Railway domain and
would never be sent to the Vercel domain the user is actually on, so it could
only be scraped out of a `Set-Cookie` header — along with the signed `.sig`
companion Koa adds — and re-issued on every refresh. In the body, the route
handler reads one field. The cookie the browser holds is still httpOnly; only our
own server ever sees the raw token.

---

## 4. Authorization — three layers

One layer cannot express the rules, so there are three. Each answers a question
the one above it cannot.

### Layer 1 — the permission matrix: *may this role call this endpoint at all?*

`apps/api/src/seed/permission-matrix.js`, applied on every boot.

A Users & Permissions permission is a row pairing a role with an action string
(`<content-type-uid>.<controller-method>`). If the row exists the role can call
that endpoint; if not, Strapi answers 403 before any of our code runs.

Deliberately coarse. It cannot answer "may this Instructor edit **this** course?",
because ownership is a property of a row and this layer only knows about routes.

Two constraints govern what may appear in it:

1. **Every action must match a real controller method.** On every boot the
   plugin compares the permission table against the methods it can find and
   deletes any row it cannot match. A typo does not raise an error — the
   permission is silently dropped and the endpoint 403s.
2. **Granting an action grants it for every row of that type.** Where the
   intended rule is narrower, the matrix carries a note naming the policy that
   narrows it.

Current counts: Admin 43, Content Manager 35, Instructor 30, Student 25, Public 4
(plus 8 Strapi auth defaults), Authenticated 0.

### Layer 2 — policies: *may this caller touch this row?*

Five, in `apps/api/src/policies/`.

| Policy | Question |
|---|---|
| `is-admin` | Application-role Admin? (**not** a Strapi Super Admin — see §7) |
| `is-owner-or-manager` | Does this caller own this course, or manage all content? |
| `can-manage-course-children` | Does the caller own the lesson's or quiz's **parent course**? |
| `is-enrolled` | Is this student enrolled in the course this lesson belongs to? |
| `owns-blog-post` | Content Managers manage their own posts; Admins manage everyone's. |

`can-manage-course-children` reads the parent from the **stored row** on update,
never from the request body. Reading it from the body would be a hole, not a
shortcut: an instructor could name a course they *do* own while editing a lesson
belonging to one they do not, and the check would pass.

### Layer 3 — controllers: *what is this request allowed to claim?*

**Identity comes from the token, never the body.** `course.owner`,
`blog-post.author`, `enrollment.student` and `lesson-completion.student` are all
overwritten server-side. Overwriting rather than validating means there is no
version of the request — malformed, malicious, or merely confused — that produces
a row belonging to somebody else.

This has a wrinkle worth knowing. The content API validates an incoming body
against what the **caller** may write, and `owner` points at the user content
type, which an Instructor has no write permission on. A body containing `owner`
is therefore rejected with `Invalid key owner` — *even one the server wrote*. So
ownership is applied **after** input sanitisation, through the Document Service,
rather than mixed into the body.

**Reads are scoped by replacing the client's filters, not merging them.** A
permission to call `GET /api/enrollments` is a permission to call it for every
row. Merging a forced filter into the client's would leave the hole open, because
Strapi's filter syntax supports `$or` and a merged filter can be widened straight
back out. So the client's filters are discarded outright:

| Role | Sees |
|---|---|
| Student | their own rows |
| Instructor | rows belonging to courses they own |
| Admin / Content Manager | everything |

Verified directly: a student calling `?filters[student][id]=1` receives only
their own rows.

**The answer key never leaves the server.** `correctIndex` is stripped from every
student-facing quiz read, in the controller. Hiding it in the UI would leave it
one DevTools Network tab away.

---

## 5. Two decisions worth defending

### Progress is counted; quiz scores are stored

These look contradictory and are not.

**Progress** is a statement about the present: "this student has finished 4 of the
6 lessons that exist right now". It must move when the course does. A stored
percentage is a copy of something the completion rows already say, and copies
drift — add a lesson and every stored figure is silently wrong, with nothing in
the system aware of it. So it is counted, from the rows that *are* the truth:

```
percentage = completed lessons in this course / total lessons in this course
```

Guarded at both ends: a course with no lessons reports 0%, not `NaN`; and more
completions than lessons (possible if a lesson is deleted after being completed)
is clamped, so a bar can never read 120%.

**A quiz score** is a fact about a moment: "on Tuesday this student answered these
questions this way and got 7 of 10". If the instructor later corrects a wrong
answer key, that historical result must not silently change. So the score is
written down, with the submitted answers beside it, and never recomputed on read.

The percentage on an attempt is derived from `score` and `total` rather than
stored — both inputs are already recorded, so a third copy would just be a third
thing to keep in step.

### Uniqueness is a scalar key, not a composite index

Enrolling twice, or completing a lesson twice, must be impossible. The obvious
fix — a composite `UNIQUE (student, course)` — **cannot be expressed**, and that
is a property of Strapi rather than a preference.

Strapi keeps each relation in its own link table: `enrollments_student_lnk` holds
`(enrollment_id, user_id)` and `enrollments_course_lnk` holds
`(enrollment_id, course_id)`. The two columns are never in the same table, so no
index can span them. The `_uq` indexes Strapi creates only prevent duplicate
*links for the same enrollment row*, which is a different guarantee entirely.

So each of those types carries a private scalar column — `enrollmentKey`,
`completionKey` — holding `"<userId>:<rowId>"`, marked unique. The database can
enforce that.

Both are defended twice on purpose: a check that handles the ordinary
double-click and returns the existing row, and the unique key for the race the
check cannot see — two requests arriving close enough together that both pass the
check before either has written. Only the database sees both at once.

---

## 6. The blog

Draft and published come from Strapi's **native Draft & Publish**, not a status
field of our own, so "only published posts are public" is enforced by the same
mechanism that does the filtering.

Two things about it are easy to get wrong, and both were:

**Publishing is an action, not a field.** Every entry has a draft version and a
published version. Setting `publishedAt` in the data on create looks like it
should publish and does not — `create()` writes the draft and the value is
overwritten. The post then sits in the database with a date claiming it is live
while the public blog stays empty. Publishing goes through explicit
`POST /api/blog-posts/:id/publish` and `/unpublish` endpoints.

**`?status=draft` returns the draft version of *every* document**, including ones
that are published — and on a draft version `publishedAt` is always null. So the
management view cannot decide "published" from that field; it compares against
the published list instead.

Public reads pin `status=published` in the controller rather than relying on the
default, because a caller can ask for drafts explicitly and "by default" is doing
a lot of work in that sentence.

---

## 7. Bootstrap and seeding

Users & Permissions roles are **rows in the database, not files in the
repository**. Deploying this codebase against an empty database would otherwise
produce an application with only Strapi's built-in Public and Authenticated
roles, no users, and every login failing — with nothing in the source tree to
explain why.

So `apps/api/src/index.js` → `bootstrap()` builds them on every boot, in three
parts:

| File | Behaviour |
|---|---|
| `seed/roles.js` | **Reconciles.** Grants and revokes to match the matrix. |
| `seed/demo-users.js` | **Add-only.** Never resets a password somebody changed. |
| `seed/demo-content.js` | **Once.** Only into a platform with zero courses. |

Those three behaviours are different on purpose. Roles are infrastructure: if one
is deleted the application is broken and restoring it is correct. Demo content is
a starting point — putting a course back after an evaluator deleted it would be
the application fighting the person using it.

The reconcile in `roles.js` revokes only inside a **bounded set** of actions: the
seven content types plus the specific plugin endpoints the matrix hands out.
Strapi's own `auth.register` and `auth.callback` grants on Public fall outside
that boundary and are left alone. Wiping them would lock every user out
permanently — the app would boot cleanly, serve pages, and reject every
credential.

A known limit of that design: removing an action from the matrix *entirely* puts
it outside the boundary, so it is never revoked and stays granted on whatever
roles already had it. Content-type actions are immune (they are prefix-matched);
only plugin actions are affected. Harmless on a fresh database, which is why
production is unaffected.

**Ordering matters and is not accidental.** Plugin lifecycles run before user
lifecycles, so by the time this code runs the plugin has already created Public
and Authenticated and already deleted permissions for actions it cannot match. If
the seed ran first and inserted four roles, the plugin's "is the role table
empty?" check would find a non-empty table and skip — leaving Public without the
permissions that make registration and login work.

Failures here deliberately crash the boot. An application with no roles starts
happily, serves pages, and rejects every login, which looks like a mystery rather
than a missing seed. Refusing to start is the more honest outcome.

### Strapi has two unrelated role systems

The single most common wrong turn on this stack. `admin_users` governs the
`/admin` control panel and is for developers. Users & Permissions `up_roles`
governs the REST API and holds this application's four roles. The application's
"Admin" is **not** a Strapi Super Admin and has no access to `/admin` at all.

---

## 8. Deployment

| Decision | Reverting it causes |
|---|---|
| Postgres in production, never SQLite | Railway's filesystem is ephemeral — every redeploy would wipe all users, courses and progress. |
| `server.proxy` as an **object**, `{ koa: … }` | Strapi reads `server.proxy.koa`. A boolean silently resolves to `undefined`, Koa stops trusting `X-Forwarded-Proto`, and every production login 500s on the Secure refresh cookie — invisible locally, because `NODE_ENV` is not production there and the cookie is not marked Secure. |
| `PUBLIC_URL` must include its scheme | Strapi tests `startsWith('http')`. A scheme-less value is treated as a URL *path* and stamped onto every admin asset, producing a blank admin panel with no error. `config/server.js` throws at boot instead. |
| Secrets differ per environment, rotated rarely | Rotating `JWT_SECRET` logs every user out; rotating `APP_KEYS` breaks admin login. |

Local development uses SQLite for convenience; `config/database.js` handles both
through `DATABASE_CLIENT`, so the difference is configuration only.

---

## 9. Known trade-offs

- **Local SQLite vs production Postgres.** A deliberate dev/prod difference,
  accepted because Docker was unavailable on the development machine.
- **Demo passwords are published** in the README. These are shared demo accounts;
  `SEED_DEMO_PASSWORD` overrides them and `SEED_DEMO_USERS=false` disables them.
- **Session lifespans are wide** (7 days idle) for the assessment window. A real
  product would keep them short and lean on refresh.
- **The seed cannot revoke a plugin action removed from the matrix entirely** —
  see §7.
- **No pagination on the admin user list.** Correct at this scale, and would need
  addressing before real use.
