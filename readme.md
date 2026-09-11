# Zeltxx

**Real-time developer collaboration and gamified productivity platform.**

> [Live Demo](https://zeltxx.vercel.app)

---

## Overview

Zeltxx is a full-stack SaaS platform that unifies task tracking, team communication, GitHub activity syncing, and contribution gamification into a single workspace. It combines an interactive Kanban board, live chat, collaborative notes, GitHub REST API commit syncing, webhook automation, and analytics-driven scoring — all backed by a production-hardened Node.js API and real-time Socket.IO engine.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, React Router 7, Tailwind CSS 4, Recharts, Socket.IO Client, Axios, shadcn/ui |
| **Backend** | Node.js, Express 5, Mongoose 9, Socket.IO 4, Passport.js (Google OAuth 2.0), Nodemailer, node-cron |
| **Database** | MongoDB |
| **Storage** | Cloudinary (production), local filesystem (dev) |
| **Auth** | Google OAuth 2.0, JWT (httpOnly cookies, 3-day expiry) |
| **Deployment** | Render (backend), Vercel (frontend), Nginx reverse proxy, PM2 |
| **Tooling** | pnpm, ESLint, Prettier, OxLint |

---

## Features

### Kanban Task Board & Sprint Planning

- Three-column drag-and-drop board: **To Do**, **In Progress**, **Done**
- Sprint management with name, goal, and date range
- Sprint burndown chart (ideal vs. remaining line)
- Task priorities (low / medium / high), assignees, due dates
- Subtask checklists, task comments with emoji reactions
- Blocked-by dependency tracking (prevents completing blocked tasks)
- Recurring tasks (daily, weekly, monthly) with automatic next-occurrence spawning
- Time tracking per task (start/stop timer, manual entries, per-member history)
- File attachments (Cloudinary-backed, MIME-validated, 10 MB cap)
- Due-date reminders (hourly cron job notifies assignees within 24 hours)

### Real-Time Collaboration

- **Live presence** — online member indicators per project room
- **Team chat** — timestamped messages with typing indicators
- **Collaborative notes** — real-time co-editing scratchpad with debounced auto-save
- **Live task board** — task create/update/delete events broadcast across all clients
- **@mentions** — notifies mentioned users in task comments and project notes
- **Live notifications** — invite, due-date, and mention alerts pushed via Socket.IO

### GitHub Integration

- **REST API commit sync** — fetches live commits (SHA, author, message, URL) from any public or private repo via GitHub REST API
- **Personal Access Token** support for private repos and higher rate limits
- **Webhook receiver** — processes `push`, `pull_request`, `issues`, and `pull_request_review` events
- **HMAC-SHA256 verification** — `crypto.timingSafeEqual` on `X-Hub-Signature-256`; fails closed
- **Per-project event toggles** — admins enable/disable specific webhook event categories
- **In-app webhook simulator** — constructs realistic GitHub payloads, computes HMAC signatures in-browser, and posts test events
- **Idempotent sync** — existing SHAs are re-attributed; duplicates are skipped
- **Committer resolution** — matches GitHub authors to platform users by email/name (exact match only; no regex from untrusted input)

### Analytics & Gamification

- **Weighted scoring engine:**

| Contribution Type | Points |
|---|---|
| PR Merged | 6 |
| Commit | 4 |
| Issues Closed | 4 |
| Review | 3 |
| Task Completed | 2 |
| PR Opened | 2 |
| Issues Opened | 2 |
| File Upload | 2 |
| Comment | 1 |

- **30-day contribution heatmap** — GitHub-style activity grid
- **Velocity area chart** — 14-day daily activity trend per user
- **Contribution type donut chart** — breakdown by category
- **Team leaderboard** — ranked by score with month / week / all-time filters
- **Streak tracking** — current and longest contribution streaks
- **Workspace-wide leaderboard** — aggregated across all projects
- **1-click CSV export** — contributions with CSV-injection protection (`=`, `+`, `-`, `@` prefix sanitization)
- **Markdown summary export** — full project report
- **Daily anti-abuse caps** — per-type, per-user, per-project, per-day limits (e.g. commits: 500/day)

### Authentication & Security

- **Google OAuth 2.0** — stateless, `httpOnly` JWT cookie (3-day expiry, `SameSite=None`, `Secure`)
- **OAuth CSRF protection** — random state param with timing-safe verification at callback
- **Role-based access control** — `admin` and `collaborator` roles per project; last-admin guard
- **Origin-based CSRF guard** — applied to all unsafe methods under `/api`; allowlisted origins only
- **Route-level rate limiting** — sliding-window per IP: auth 40/min, webhooks 600/min, GitHub sync 30/min, contribution writes 30/min
- **Security headers** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geolocation off), `Cross-Origin-Resource-Policy: same-origin`, HSTS in production
- **Input validation** — URL scheme allowlisting (`http/https` only), body size limits (100 KB default, 1 MB webhooks), regex escaping in search
- **Error handling** — internal errors never leak to clients; mapped to generic messages in production
- **File upload hardening** — MIME allowlist, magic-byte verification, Cloudinary-required in production (fail closed)

### Automation

- **Daily snapshot cron** — aggregates contributions into historical records at midnight
- **Weekly digest email** — Monday 9 AM per-user summary of the past 7 days across all projects (HTML + plain text)
- **Due-date reminder cron** — hourly; notifies task assignees of upcoming deadlines
- **Recurring task backfill** — daily 2 AM safety net to spawn any missed recurring task occurrences
- **Gmail SMTP dispatcher** — formatted HTML invitation and digest emails; console simulator fallback in dev

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React 19)                       │
│  Vite 8 · Tailwind 4 · Recharts · Socket.IO Client · Axios    │
└──────────────┬──────────────────────────────┬───────────────────┘
               │  REST (Axios)                │  WebSocket (Socket.IO)
               ▼                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API SERVER (Express 5)                        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Auth     │  │ Projects │  │ Tasks    │  │ Contributions  │  │
│  │ OAuth    │  │ RBAC     │  │ Sprints  │  │ Scoring Engine │  │
│  │ JWT      │  │ Invites  │  │ Subtasks │  │ Heatmap Data   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Chat     │  │ GitHub   │  │ Webhooks │  │ Cron Jobs      │  │
│  │ Presence │  │ REST API │  │ HMAC-256 │  │ Snapshots      │  │
│  │ Typing   │  │ PAT Auth │  │ Signing  │  │ Digest/Remind  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│                                                                  │
│  Security: CSRF · Rate Limits · Security Headers · Input Valid   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────┐
              │     MongoDB 9       │
              │  (Mongoose ODM)     │
              └─────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 22+ (see `Backend/.nvmrc`)
- pnpm 11+
- MongoDB instance (local or Atlas)
- Google Cloud Console project (OAuth 2.0 credentials)

### Backend Setup

```bash
cd Backend
cp .env.example .env      # Fill in your values
pnpm install
pnpm dev                   # Starts on port 5001
```

### Frontend Setup

```bash
cd Frontend
cp .env.example .env       # Set VITE_API_URL
pnpm install
pnpm dev                   # Starts on port 5173
```

### Database Commands

```bash
cd Backend
pnpm run seed              # Populate demo tasks, metrics, and chat
pnpm run clear             # Wipe dummy records and reset
pnpm run repair:commits    # Fix stale commit user attributions
```

### Environment Variables

**Backend (`Backend/.env`)**

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5001) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Random string for JWT signing |
| `CLIENT_URL` | Frontend origin for OAuth redirects |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `CORS_ORIGINS` | Comma-separated allowed browser origins |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` (SSL) |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Google App Password |
| `CLOUDINARY_*` | Cloud credentials for file uploads |

**Frontend (`Frontend/.env`)**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

---

## API Overview

| Group | Endpoints |
|---|---|
| **Auth** | `GET /api/auth/google`, `GET /api/auth/me`, `PATCH /api/auth/profile`, `POST /api/auth/logout` |
| **Projects** | CRUD, invite, remove member, notes, activity, webhook secret, webhook events |
| **Tasks** | CRUD, subtasks, comments, reactions, time tracking, attachments, sprint linking |
| **Sprints** | CRUD, burndown chart |
| **Contributions** | Log, list, summary, streaks, leaderboard, CSV export, reactions |
| **GitHub** | `POST /api/github/sync/:projectId` |
| **Webhooks** | `POST /api/webhooks/github/:projectId` |
| **Chat** | History, send message |
| **Resources** | CRUD, categorized links |
| **Search** | Global search across projects, tasks, notes, resources |
| **Notifications** | List, mark read, respond to invites |
| **Snapshots** | Daily snapshots, date-range queries |

---

## Deployment

- **Backend:** Render (free tier) via `render.yaml` Blueprint — auto-deploys on push to `main`
- **Frontend:** Vercel — auto-deploys on push to `main`
- **Reverse proxy:** Nginx configs provided in `deploy/` for API and app routing
- **Process manager:** PM2 (single-instance fork mode for Socket.IO in-memory state)
- **Health checks:** `/health/live` (liveness, always 200), `/health` (readiness, 503 if DB down)

---

## Project Highlights

- Built a **production-ready full-stack SaaS platform** from scratch using React 19, Node.js/Express 5, MongoDB, and Socket.IO
- Implemented **real-time bidirectional communication** for live chat, typing indicators, presence tracking, task board sync, and collaborative notes via Socket.IO with JWT-authenticated connections
- Designed a **weighted gamification engine** (9 contribution types, daily anti-abuse caps, streak tracking, heatmap visualization) powering team leaderboards and personal analytics
- Integrated **GitHub REST API** for live commit syncing with idempotent bulk writes, committer-to-user resolution, and HMAC-SHA256 webhook verification with `crypto.timingSafeEqual`
- Secured all endpoints with **Google OAuth 2.0**, JWT httpOnly cookies, CSRF origin guards, role-based access control, route-level rate limiting, security headers, and input validation
- Built **4 background automation jobs** (daily snapshots, weekly digest emails, due-date reminders, recurring task backfill) using node-cron and Nodemailer
- Implemented **Cloudinary-based file uploads** with MIME allowlisting, magic-byte verification, and production-fail-closed behavior
- Deployed across **Render + Vercel** with a Render Blueprint for zero-config deployment, Nginx reverse proxy configs, and PM2 process management

---

**MIT License**
