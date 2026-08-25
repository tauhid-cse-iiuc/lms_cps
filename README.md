# LMS — Learning Management System

A learning management system with four roles (Admin, Content Manager, Instructor, Student),
course and lesson management, enrollment, progress tracking, auto-graded quizzes, and a blog.

| Layer | Tech | Live URL |
|---|---|---|
| Frontend | Next.js (App Router, TypeScript) | _pending_ |
| Backend / CMS | Strapi 5 | _pending_ |

---

## Repository layout

```
.
├── apps/
│   ├── api/    # Strapi 5 backend - database, API, and all authorization rules
│   └── web/    # Next.js frontend - the user interface
└── README.md
```

A single repository holding both applications, so the whole project has one commit history.

---

## Running locally

**Requirements:** Node.js 20 or newer, npm.

### Backend (Strapi)

```bash
cd apps/api
npm install
npm run develop
```

Runs on `http://localhost:1337`. The admin panel is at `http://localhost:1337/admin`.

Uses SQLite locally (no database server to install). Production uses PostgreSQL.

### Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

Runs on `http://localhost:3000`.

### Environment variables

Each app ships a `.env.example`. Copy it and fill in the values:

```bash
cp .env.example .env
```

---

## Demo accounts

_To be added once the seed script is in place._

---

## Features

_Checklist to be completed as features land._

---

## Architecture notes

See [ARCHITECTURE.md](ARCHITECTURE.md) _(pending)_ for the data model, the three-layer
authorization design, and the reasoning behind the main technical decisions.
