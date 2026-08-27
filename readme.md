# 🚀 Zeltxx — Real-Time Developer Collaboration & Gamified Productivity Platform

**Zeltxx** is a production-ready, full-stack real-time collaboration and project management SaaS platform engineered for modern software development teams. It combines live presence tracking, interactive Kanban task boards, real-time instant messaging, collaborative scratchpad notes, direct GitHub REST API commit syncing, GitHub webhook automation, Gmail SMTP email notifications, gamified contribution scoring, and high-contrast dark-mode analytics.

---

## 🌟 Comprehensive System Overview

Zeltxx solves developer workflow fragmentation by bringing task tracking, real-time communication, GitHub activity syncing, and team gamification into a single, unified workspace.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ZELTXX SaaS PLATFORM                                         │
├───────────────────────────────────┬───────────────────────────────────┬─────────────────────────┤
│    COLLABORATIVE WORKSPACE        │       ADMINISTRATION & SETUP      │   GAMIFIED ANALYTICS    │
│  - Interactive Kanban Task Board  │  - Project Details & Metadata     │  - 30-Day Heatmap Grid  │
│  - Real-Time Team Chat (Socket)   │  - Gmail SMTP Member Invites      │  - Velocity Area Chart  │
│  - Live Scratchpad Co-Editor      │  - Member Role Authorization      │  - Category Donut Chart │
│  - GitHub Commit REST API Sync    │  - Project Cascade Deletion       │  - Team Leaderboard     │
│  - Activity Feed & Reactions      │  - Resource Links & Spec Hub      │  - CSV / Markdown Export│
└───────────────────────────────────┴───────────────────────────────────┴─────────────────────────┘
```

---

## ✨ Key Platform Modules

### 🐙 1. GitHub Integration & Commit Automation
- **Direct GitHub REST API Commit Sync**: Connect any public or private repository (`owner/repo` or full GitHub URL). Zeltxx queries the official GitHub REST API (`POST /api/github/sync/:projectId`) to fetch live commits (SHAs, commit messages, author names, and GitHub commit URLs), auto-logging score points onto your team leaderboard.
- **GitHub Personal Access Token (PAT)**: Input an optional PAT to sync private repositories or bypass GitHub's unauthenticated 60 req/hr rate limit.
- **GitHub Webhook Payload Listener & Simulator**: Server endpoint (`POST /api/webhooks/github/:projectId`) and in-app developer simulator to trigger automated GitHub push/PR event logging.

### ⚡ 2. Real-Time WebSocket Engine (Socket.IO)
- **Live Room Presence**: Tracks online members per project room with live status indicators (*"3 Online Now"*) and online member rings.
- **Live Typing Feedback**: Displays *"User is typing..."* banners when teammates write chat messages or edit shared notes.
- **Interactive Kanban Task Board**: 3-column task board (`To Do`, `In Progress`, `Done`) synchronized live across clients. Completing a task auto-logs contribution points (+2 pts).
- **Task Detail View & Subtasks**: Subtask checklists (`[x] Frontend API`, `[ ] Unit tests`) and task-specific comment threads.
- **Live Project Discussion**: Real-time team chat room with timestamped message bubbles and user avatars.
- **Collaborative Live Scratchpad**: Real-time co-editing notes editor with debounced auto-save (*"Saved live"*).
- **Interactive Emoji Reactions**: Real-time reactions (👍, ❤️, 🚀, 🔥, 👏) on activity feed items.

### 📧 3. Gmail SMTP Email Dispatcher (Nodemailer)
- **Email Invitations**: Automatically sends formatted HTML invitation emails (`wasiqashfaq123@gmail.com`) when admins invite members to project workspaces.
- **Console Simulation Fallback**: Gracefully logs formatted terminal dispatches when SMTP app passwords are not provided in local dev environments.

### 📊 4. Gamified Scoring Engine & Analytics
- **30-Day Contribution Heatmap**: GitHub-style activity grid visualizing team contribution intensity.
- **Gamified Scoring Engine**: Tracks Commits (4 pts), Code Reviews (3 pts), Task Completion (2 pts), File Uploads (2 pts), and Comments (1 pt).
- **Personal & Team Dashboards**: Score cards, 14-day area charts, contribution breakdown donuts, and team leaderboards.
- **1-Click Data Exports**: Export personal statistics, team leaderboards to CSV, and full project summaries to Markdown (`.md`).

### 🎨 5. Modern Permanent Dark Theme UI/UX
- **Design System**: Sleek `#090d16` deep dark slate background, `#0f172a` cards, `#1e293b` borders, and high-contrast text (`#f8fafc`).
- **Official Zeltxx Logo**: Vector SVG brand icon featuring corner focus brackets with a center `#4ade80` green cross.
- **Navigation Usability**: Dual-action project cards allowing seamless switching between **Open Workspace** (Kanban & Chat) and **Admin Settings** (Invites & Roles).

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, TailwindCSS 4, Lucide Icons, Recharts, Base UI / Radix UI Primitives, Socket.IO Client.
- **Backend**: Node.js, Express 5, MongoDB (Mongoose 9), Socket.IO 4, Nodemailer 6, Passport.js (Google OAuth 2.0), JWT.

---

## 🚀 Environment Setup & CLI Commands

### 1. Environment Configuration

#### Backend (`Backend/.env`)
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/zeltxx
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# SMTP Mailer Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=wasiqashfaq123@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Zeltxx Platform" <wasiqashfaq123@gmail.com>
```

#### Frontend (`Frontend/.env`)
```env
VITE_API_URL=http://localhost:5001
```

### 2. Useful Terminal Commands

#### Start Backend Dev Server:
```bash
cd Backend
pnpm dev
```

#### Clean Database (Wipes Dummy Records & Sets Up Production Project):
```bash
cd Backend
pnpm run clear
```

#### Seed Local Database (Populates Demo Tasks, Metrics & Chat):
```bash
cd Backend
pnpm run seed
```

#### Start Frontend Dev Server:
```bash
cd Frontend
pnpm dev
```

#### Production Build Verification:
```bash
cd Frontend
pnpm exec vite build
```

---

## 💼 Resume & Technical Highlights

If you are showcasing **Zeltxx** on your resume or portfolio:

- **Built Full-Stack SaaS Architecture**: Engineered **Zeltxx**, a real-time developer productivity SaaS platform using **React 19**, **Node.js/Express 5**, **MongoDB**, and **Socket.io**.
- **Real-Time WebSocket Sync**: Implemented low-latency bidirectional communication for team chat rooms, task updates, and multi-user room presence tracking.
- **Direct GitHub REST API Integration**: Built an API service fetching live GitHub commits (`sha`, author, commit message) with PAT rate-limit bypass support.
- **Weighted Analytics Algorithm**: Designed an automated gamified scoring system calculating developer impact (`commits: 4`, `reviews: 3`, `tasks: 2`, `comments: 1`) with 14-day velocity trends rendered via **Recharts**.
- **OAuth 2.0 & Role-Based Security**: Secured REST APIs with **Passport.js Google OAuth 2.0**, **JWT HTTP-Only cookies**, and RBAC enforcing Admin vs. Collaborator capabilities.

---

## 🛰️ Complete REST API Matrix

### Auth
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update display name, bio, & status text

### Projects & Members
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project metadata (Admin)
- `DELETE /api/projects/:id` - Delete project & cascade delete all associated data (Admin)
- `POST /api/projects/:id/invite` - Invite member by email & send SMTP notification (Admin)

### GitHub Sync & Webhooks
- `POST /api/github/sync/:projectId` - Fetch & sync live commits directly from GitHub REST API
- `POST /api/webhooks/github/:projectId` - Process incoming GitHub push/PR webhook events

### Tasks
- `GET /api/tasks/project/:projectId` - Get project tasks (Members only)
- `POST /api/tasks/project/:projectId` - Create task
- `PUT /api/tasks/:id` - Update task status/details
- `POST /api/tasks/:id/subtasks` - Add subtask
- `PATCH /api/tasks/:id/subtasks/:subtaskId` - Toggle subtask completion
- `POST /api/tasks/:id/comments` - Post task comment
- `DELETE /api/tasks/:id` - Delete task

### Live Chat & Resources
- `GET /api/chats/project/:projectId` - Get chat history
- `POST /api/chats/project/:projectId` - Send live chat message
- `GET /api/resources/project/:projectId` - Get project docs & links
- `POST /api/resources/project/:projectId` - Add resource link
- `DELETE /api/resources/:id` - Delete resource

---

## 📜 License
MIT License. Built for developer productivity and seamless team collaboration.
