# TaskFlow

A minimal but real task management app. Users can register, log in, create projects, add tasks, and assign tasks to themselves or others.

> The original assignment brief is preserved in [`ASSIGNMENT.md`](./ASSIGNMENT.md).

---

## 1. Overview

**What it is:** a full-stack task management product with authentication, projects, and tasks.

**Stack:**

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn-style components + React Router |
| Backend | Node.js + Express (the assignment allowed a non-Go backend if noted — Node was chosen) |
| Database | PostgreSQL 16 |
| Migrations | [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate) (up + down per file) |
| Auth | JWT (`jsonwebtoken`), bcrypt cost 12 |
| Logging | `pino` + `pino-http` (structured) |
| Infra | Docker Compose (Postgres + API + frontend), multi-stage Dockerfiles |

---

## 2. Architecture Decisions

**Why Node + Postgres instead of MERN?**
The assignment requires Postgres with real migrations and lists "no migrations" as an automatic disqualifier. MongoDB is schemaless and doesn't fit that model, so the stack is effectively **PERN** — MERN with Postgres. Still JS everywhere, but compliant.

**Monorepo layout.**
```
/backend             Express API, migrations, seed
/frontend            React + Vite + shadcn-style UI
/docker-compose.yml  Orchestrates postgres + api + frontend
/.env.example        All required env vars
```

**Backend structure.** Classic layered Express: `routes → controllers → db pool`. Validation lives in `src/validators/` as small pure functions; errors flow through a typed `HttpError` and a single error-handler middleware that produces the response shapes the assignment specifies (`400` validation body, `401`, `403`, `404`). Access control lives in the controllers — every handler reads the project/task and checks `owner_id` / `created_by` / `assignee_id` against `req.user.id`.

**Data model.** The schema matches the brief exactly — `uuid` primary keys (`gen_random_uuid()`), enum types for `status` and `priority`, foreign keys with `ON DELETE CASCADE` from project → tasks so deleting a project removes its tasks (as the brief requires). I added a `created_by` FK on `tasks` because the brief's delete rule is "project owner **or task creator** only", which is not derivable from the listed columns alone. Indexes on `tasks.project_id`, `tasks.assignee_id`, and `tasks.status` support the filters.

**Frontend structure.** Routes are split into pages (`/src/pages`), shadcn-style primitives in `/src/components/ui`, and app-level components (`Navbar`, `ProtectedRoute`, `TaskDialog`). State is intentionally local — the app has one screen (project detail) that owns non-trivial state, so introducing Redux / React Query felt like overkill. Auth is kept in a small Context backed by `localStorage`.

**Optimistic task status updates.** When the user changes a task status in the list, we update the UI immediately and roll back on error. Full task edits go through the modal and are not optimistic — they're rare and involve multiple fields.

**What I intentionally left out.**
- All "bonus" features (pagination, stats endpoint, drag-and-drop, dark mode, WebSockets) — per scope.
- Automated tests — per scope. Requirements are covered manually; I'd add `supertest` integration tests first if extending.
- A refresh-token flow. Tokens are 24h, as required.
- A rich `<Select>` component. Native `<select>` is used for speed and accessibility parity; it still renders cleanly with shadcn styling.

---

## 3. Running Locally

Requires only **Docker** (Docker Desktop or Docker Engine + Compose v2).

```bash
git clone <your-repo-url> taskflow
cd taskflow
cp .env.example .env
docker compose up --build
```

When all three containers are healthy:

- Frontend: <http://localhost:3000>
- API:      <http://localhost:4000>
- Postgres: `localhost:5432` (credentials from `.env`)

To stop:
```bash
docker compose down
```

To wipe the database volume:
```bash
docker compose down -v
```

---

## 4. Running Migrations

Migrations and the seed script **run automatically** every time the API container starts (`backend/docker-entrypoint.sh` waits for Postgres, then runs `node-pg-migrate up` and the seed script before booting the server). You do not need to run anything by hand.

If you want to run them manually against a running stack:

```bash
# Apply all pending migrations
docker compose exec api npm run migrate:up

# Revert the most recent migration
docker compose exec api npm run migrate:down

# Re-seed (idempotent — safe to re-run)
docker compose exec api npm run seed
```

Migration files live in `backend/migrations/`. Each file exports both `up` and `down`.

---

## 5. Test Credentials

The seed script creates a known user so you can log in immediately without registering:

```
Email:    test@example.com
Password: password123
```

This user owns a "Website Redesign" project containing three tasks with different statuses (`in_progress`, `todo`, `done`).

---

## 6. API Reference

**Base URL:** `http://localhost:4000`

All non-auth endpoints require `Authorization: Bearer <token>`. All responses are `application/json`.

### Error shapes

```json
// 400 — validation
{ "error": "validation failed", "fields": { "email": "is required" } }

// 401 — not authenticated
{ "error": "unauthorized" }

// 403 — authenticated but forbidden
{ "error": "forbidden" }

// 404 — not found
{ "error": "not found" }
```

### Auth

**`POST /auth/register`**
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }

// Response 201
{ "token": "<jwt>", "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

**`POST /auth/login`**
```json
// Request
{ "email": "jane@example.com", "password": "secret123" }

// Response 200
{ "token": "<jwt>", "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" } }
```

JWT claims: `user_id`, `email`, `exp = now + 24h`.

### Projects

| Method | Path | Notes |
|---|---|---|
| GET | `/projects` | Projects where the user is owner or has a task assigned |
| POST | `/projects` | Body: `{ name, description? }` |
| GET | `/projects/:id` | Returns project + `tasks[]` |
| PATCH | `/projects/:id` | Owner only. Body: `{ name?, description? }` |
| DELETE | `/projects/:id` | Owner only. Cascades to tasks. `204 No Content` |

### Tasks

| Method | Path | Notes |
|---|---|---|
| GET | `/projects/:id/tasks?status=&assignee=` | Optional filters: `status` in `todo\|in_progress\|done`, `assignee` is a user uuid |
| POST | `/projects/:id/tasks` | Body: `{ title, description?, status?, priority?, assignee_id?, due_date? }` |
| PATCH | `/tasks/:id` | Owner / creator / assignee may edit. All fields optional. |
| DELETE | `/tasks/:id` | Project owner or task creator only. `204 No Content` |

### Helper

| Method | Path | Notes |
|---|---|---|
| GET | `/users` | Returns `{ users: [{ id, name, email }] }` — used for the assignee dropdown |
| GET | `/users/me` | Returns the logged-in user |
| GET | `/health` | `{ "status": "ok" }` (no auth) |

### cURL examples

```bash
# Login
curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'

# With token
TOKEN=...
curl -s http://localhost:4000/projects -H "Authorization: Bearer $TOKEN"
```

---

## 7. What You'd Do With More Time

**Tests.** `supertest` + a disposable Postgres for integration coverage of auth, permissions, and task filter logic. Today, correctness relies on manual testing.

**Richer access model.** Right now, a user sees a project only if they own it or have a task assigned. A proper "project member" concept (with an invite flow) would be the natural next step — along with UI to invite teammates by email.

**Server-driven filtering.** The status/assignee filters on the project detail page are client-side for snappiness on small projects. For large projects they should hit `GET /projects/:id/tasks?status=&assignee=` (the backend already supports it).

**Pagination + sorting** on the projects and tasks lists.

**Replace native `<select>` with a proper shadcn `Select`** (Radix-based) for full keyboard + styling parity.

**Observability.** Request IDs, a `/metrics` endpoint, and structured error tracking. Currently only `pino` access logs.

**Harden the JWT flow.** Shorter access tokens + a refresh-token rotation, stored in an httpOnly cookie. The assignment specifies 24h tokens, so that's what ships.

**Stats endpoint + drag-and-drop Kanban board** (the listed bonuses) — intentionally skipped to keep scope tight.

**CI.** A GitHub Actions workflow that runs `docker compose build`, migrations, and the test suite on every PR.
