# LMS — Learning Management System

A learning management system with four roles — Admin, Content Manager, Instructor and Student —
covering course and lesson management, enrollment, progress tracking, auto-graded quizzes and a
blog with draft/published states.

| Layer | Tech | Live URL |
|---|---|---|
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind) | https://lms-cps-eta.vercel.app |
| Backend / CMS | Strapi 5 (PostgreSQL) | https://lmscps-production.up.railway.app |

Backend admin panel: https://lmscps-production.up.railway.app/admin

---

## Status

This table reflects what is actually working, not what is planned. Every row marked complete is
covered by assertions run against a live server - 29 for the API's authorization and features, 16
for the admin panel, and 34 through the running web app.

**Foundation**

| | |
|---|---|
| ✅ | Both apps deployed and talking to each other (Vercel ↔ Railway, CORS verified) |
| ✅ | Data model — 7 content types + the quiz-question component |
| ✅ | Role bootstrap — the four roles, their permissions, and demo users |

**Core features**

| | |
|---|---|
| ✅ | Authentication and role-based access, enforced server-side |
| ✅ | Course management (create, edit, delete) |
| ✅ | Course enrollment — browse, enroll, "My Courses" |
| ✅ | Lesson viewing in sequence |

**Differentiator features**

| | |
|---|---|
| ✅ | Progress tracking — mark complete, percentage per student per course |
| ✅ | Quizzes with automatic grading and stored results |
| ✅ | Admin dashboard — user list, role assignment, platform statistics |
| ✅ | Blog with draft/published states |

---

## Roles and permissions

| Action | Admin | Content Manager | Instructor | Student |
|---|:---:|:---:|:---:|:---:|
| Manage users and assign roles | ✅ | ❌ | ❌ | ❌ |
| Create / edit / delete any course | ✅ | ✅ | Own only | ❌ |
| Add / edit / delete lessons | ✅ | ✅ | Own courses | ❌ |
| Create quizzes | ✅ | ✅ | Own courses | ❌ |
| View student progress | ✅ | ✅ | Own courses | Own only |
| Write / manage blog posts | ✅ | ✅ | ❌ | ❌ |
| Enroll in a course | ❌ | ❌ | ❌ | ✅ |
| Take quizzes | ❌ | ❌ | ❌ | ✅ |

Where "own" appears, ownership is checked against the authenticated user on the **server**, not by
hiding buttons in the UI. Blog posts follow the same rule: a Content Manager manages the posts they
authored, an Admin manages every post including other people's.

---

## Demo accounts

One account per role, created by the bootstrap seed so the same logins exist in every environment -
including a freshly deployed one.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@lms.test` | `Demo1234!` |
| Content Manager | `manager@lms.test` | `Demo1234!` |
| Instructor | `instructor@lms.test` | `Demo1234!` |
| Student | `student@lms.test` | `Demo1234!` |

These are shared demo accounts and the passwords are published deliberately. `SEED_DEMO_PASSWORD`
overrides the default; `SEED_DEMO_USERS=false` skips creating them entirely, which is what a real
deployment would set.

The `.test` domain is reserved by RFC 2606, so these addresses can never collide with a real
mailbox.

---

## Running locally

**Requirements:** Node.js 24 (pinned in `apps/api/package.json` so local and deployed runtimes
match), and npm.

### Backend — Strapi

```bash
cd apps/api
cp .env.example .env
npm install
npm run develop
```

Serves `http://localhost:1337`, admin panel at `http://localhost:1337/admin`.

`.env` needs six secrets filled in. Generate each with:

```bash
openssl rand -base64 32
```

Locally the database is SQLite in `apps/api/.tmp/data.db` — nothing to install. Production uses
PostgreSQL. `apps/api/config/database.js` handles both, selected by `DATABASE_CLIENT`, so the
difference is configuration rather than code.

### Frontend — Next.js

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Serves `http://localhost:3000`.

### Environment variables

Both apps ship a documented `.env.example`. The ones worth explaining:

| Variable | App | Purpose |
|---|---|---|
| `DATABASE_CLIENT` | api | `sqlite` locally, `postgres` in production |
| `DATABASE_URL` | api | Postgres connection string (production only) |
| `PUBLIC_URL` | api | Full public URL **including `https://`** — see the note below |
| `IS_PROXIED` | api | `true` behind Railway's HTTPS edge, so Strapi emits `https://` links and `Secure` cookies |
| `CORS_ORIGINS` | api | Comma-separated list of browser origins allowed to call the API |
| `STRAPI_URL` | web | Backend address for **server-side** calls; never sent to the browser |
| `NEXT_PUBLIC_STRAPI_URL` | web | Backend address for **browser** calls. Anything prefixed `NEXT_PUBLIC_` is inlined into the JavaScript bundle and is therefore public — never put a secret behind it |

`PUBLIC_URL` must include its scheme. Strapi decides how to interpret the value by testing whether
it starts with `http`; without a scheme it treats the value as a URL *path*, prepends a slash, and
stamps it onto every admin-panel asset URL, producing a blank admin page with no error message.
`apps/api/config/server.js` validates this at startup and fails with a named error rather than
letting it through.

---

## Architecture notes

This section records the design and the reasoning behind it. The Status table above is the
authoritative list of what is built — where the two differ, the Status table is right.

### Strapi has two unrelated role systems

Strapi ships **admin panel roles** (Super Admin, Editor, Author) that govern the `/admin` control
panel, and **Users & Permissions roles** that govern the REST API. They are separate tables and
separate concepts.

This application's four roles are Users & Permissions roles. The app-level "Admin" is *not* a
Strapi Super Admin — an application administrator manages users through this app's own dashboard
and has no access to the Strapi control panel.

### Roles are created by code, not by hand

Users & Permissions roles and their permission sets live in the **database**, not in the codebase.
A fresh deployment against a fresh database therefore starts with only `Public` and `Authenticated`
— no application roles at all, and every login fails.

So the four roles, their permissions and one demo user each are created by an **idempotent
bootstrap script** in `apps/api/src/index.js`, which runs on every startup and creates only what is
missing. This is what makes the deployment reproducible instead of depending on someone having
clicked the right checkboxes in a UI once.

### Authorization is three layers, because one is not enough

1. **Route permissions** decide which role may reach an endpoint at all. Coarse and per-route.
2. **Policies** handle record-level rules that route permissions cannot express — "own courses
   only" is a property of a *row*, not of a route.
3. **Controller overrides** handle read scoping and response sanitisation, which is where the
   leaks actually are:
   - **Forced filters.** Query filters arrive from the client and are trusted by default. A student
     requesting `GET /api/enrollments?filters[student][id]=42` must not receive someone else's
     records, so `find` discards client-supplied filters and forces the student to the
     authenticated user's id.
   - **Ownership from the token.** `owner` and `student` are always derived from the verified JWT
     and never read from the request body. Identity is not something a client gets to assert.
   - **Answer-key sanitisation.** `correctIndex` is stripped from every question on student-facing
     reads. Without this the quiz is defeated by opening the browser's network tab, no matter how
     the interface behaves.

### Sessions live in an httpOnly cookie

Login goes through Next.js Route Handlers that proxy to Strapi and store the JWT in an **httpOnly,
`Secure`, `SameSite=Lax` cookie**.

The common alternative — keeping the token in `localStorage` — is readable by any cross-site
scripting bug, and is invisible to Server Components and middleware, which makes genuine
server-rendered route protection impossible.

### The role is fetched, never read from the token

A Strapi Users & Permissions JWT carries only `id`, `iat` and `exp`. There is no role claim, so
middleware cannot read a role from the token. A server-side helper fetches
`/api/users/me?populate=role` instead, cached per request.

That turns out to be the more correct design anyway: because the role is read fresh rather than
baked into a token, an administrator changing someone's role takes effect on that user's **next
request**, instead of whenever their existing token happens to expire.

### Data model

| Type | Notes |
|---|---|
| `course` | `owner` relation is the authorization anchor. Named `owner` rather than `instructor` because a Content Manager can create courses too |
| `lesson` | `order` is an explicit required integer. Sequence must never depend on `id` or creation time, both of which break when a lesson is inserted in the middle |
| `enrollment` | Logically unique per (student, course) |
| `lesson-completion` | Unique per (student, lesson). `course` is denormalised so progress is one indexed count rather than a join through lessons |
| `quiz` | Questions are a repeatable component; `options` is a JSON array so sanitising the answer key stays a flat operation |
| `quiz-attempt` | `score` and `total` are stored as facts at submission time and never recomputed — editing a quiz later must not rewrite historical results |
| `blog-post` | Uses Strapi's native Draft & Publish rather than a hand-rolled status field, so "only published posts are public" comes from the platform instead of from application code that could be forgotten |

### Images and video are URLs, not uploads

`coverImageUrl` and `videoUrl` are plain string fields. Railway's filesystem is **ephemeral**, so
uploaded files would be deleted on every redeploy. The same reasoning is why production runs
PostgreSQL rather than SQLite: a database in a file on that disk would lose every user, course and
progress record each time the service restarted.

---

## Deployment

| | |
|---|---|
| **Frontend** | Vercel, Root Directory `apps/web`, with `STRAPI_URL` and `NEXT_PUBLIC_STRAPI_URL` |
| **Backend** | Railway, Root Directory `apps/api`, with a managed PostgreSQL service |

Both hosts support a per-service root directory, which is what lets a single repository deploy to
two platforms.

On Railway, `DATABASE_URL` is set to `${{Postgres.DATABASE_URL}}` — a reference to the Postgres
service rather than a copied string, so it keeps working if the credentials rotate. Strapi's first
boot against an empty database takes a couple of minutes while it creates its tables, and returns
502 until it is ready even though the platform reports the container as running.

`https://lms-cps-eta.vercel.app/health` is a small diagnostic page that checks the frontend can
reach the backend, separately from the server and from the browser. Those two paths fail for
different reasons — only the browser one is subject to CORS — so testing them together would hide
which is broken.

---

## Repository layout

```
.
├── apps/
│   ├── api/                  Strapi 5 — database, API, authorization
│   │   ├── config/           server, database, CORS and middleware configuration
│   │   └── src/
│   │       ├── api/          content types, controllers, routes, services
│   │       ├── components/   the reusable quiz-question component
│   │       └── index.js      bootstrap — roles, permissions and demo users
│   └── web/                  Next.js 16 — user interface
│       └── src/
│           ├── app/          routes (App Router)
│           └── lib/          Strapi client and shared helpers
└── README.md
```

One repository holding both applications, so the project has a single commit history.
