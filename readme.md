# Zeltxx — Real-Time Developer Collaboration & Gamified Productivity Platform

Zeltxx is a modern, full-stack real-time collaboration and project management SaaS platform built for engineering teams. It combines live presence, interactive Kanban task boards, real-time instant messaging, collaborative scratchpad notes, GitHub webhook automation, gamified contribution scoring, and rich analytics.

---

## ✨ Features

### ⚡ Real-Time Collaboration (Socket.IO)
- **Live Room Presence**: Tracks online members per project room with live green status badges (*"3 Online Now"*) and online member rings.
- **Live Typing Feedback**: Displays *"User is typing..."* banners when teammates write chat messages or notes.
- **Interactive Kanban Task Board**: 3-column task board (`To Do`, `In Progress`, `Completed`) synchronized live across clients. Completing a task auto-logs contribution points!
- **Task Detail View & Subtasks**: Subtask checklists (`[x] Frontend API`, `[ ] Unit tests`) and task-specific comment threads.
- **Live Project Discussion**: Real-time team chat room with timestamped message bubbles and avatars.
- **Collaborative Live Scratchpad**: Real-time co-editing notes editor with debounced auto-save (*"Saved live"*).
- **Interactive Emoji Reactions**: Real-time reactions (👍, ❤️, 🚀, 🔥, 👏) on activity feed items.

### 📊 Analytics & Data Exports
- **30-Day Contribution Heatmap**: GitHub-style activity grid visualizing team contribution intensity.
- **Gamified Scoring**: Tracks Commits (4 pts), Code Reviews (3 pts), Task Completion (2 pts), File Uploads (2 pts), and Comments (1 pt).
- **Personal & Team Dashboards**: Score cards, 14-day area charts, contribution breakdown donuts, and team leaderboards.
- **1-Click Data Exports**: Export personal statistics, team leaderboards to CSV, and full project summaries to Markdown (`.md`).

### 🛠️ Developer Tools & Governance
- **GitHub Webhook Simulator**: Rest API (`POST /api/webhooks/github/:projectId`) and in-app developer simulator to trigger automated GitHub commit/PR events.
- **Project Schedule & Deadlines**: Timeline view categorizing tasks into `Overdue`, `Due Today`, `Upcoming`, and `Unscheduled`.
- **Docs & Resources Hub**: Central repository for GitHub/GitLab repositories, documentation links, and Figma design specs.
- **Light & Dark Mode**: Theme switcher with persistent preferences and dark mode styling.
- **Role-Based Access Control**: Server-side authorization ensuring only project admins can edit projects, manage members, or delete resources.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Lucide Icons, Recharts, Radix UI Primitives, Socket.IO Client.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.IO Server, JWT & Cookies, Passport Google OAuth.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance (local or Atlas)

### 2. Environment Setup

#### Backend (`Backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/zeltxx
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### Frontend (`Frontend/.env`)
```env
VITE_API_URL=http://localhost:5000
```

### 3. Running Locally

#### Start Backend:
```bash
cd Backend
npm install
npm run dev
```

#### Start Frontend:
```bash
cd Frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🛰️ API Routes Overview

### Auth
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth Callback
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/profile` - Update display name, bio, & status text
- `POST /api/auth/logout` - Logout session

### Projects & Members
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project (Admin)
- `PATCH /api/projects/:id/notes` - Update collaborative shared notes
- `DELETE /api/projects/:id` - Delete project (Admin)
- `POST /api/projects/:id/invite` - Invite member by email (Admin)
- `DELETE /api/projects/:id/remove/:userId` - Remove member (Admin)

### Tasks
- `GET /api/tasks/project/:projectId` - Get project tasks
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

### Webhooks
- `POST /api/webhooks/github/:projectId` - Process GitHub push/PR webhook event

---

## 📜 License
MIT License. Built for developer productivity and seamless team collaboration.
