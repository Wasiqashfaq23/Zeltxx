# Collaborator Project

## Intro
Collaborator Project is a full-stack project management platform built for teams to manage projects, invite collaborators, track contributions, and monitor progress in one place.

## Problem Statement
Teams often struggle to keep track of who is contributing, what work is in progress, and how a project is evolving. Manual updates and scattered communication make collaboration slower and less transparent.

## Solution
This application brings project management, contribution tracking, role-based access, and progress visibility into a single system. It allows admins and collaborators to create projects, assign work, log contribution activity, and view project insights through a simple web interface.

## Tech Used
- MongoDB
- Express
- React
- Node.js
- Socket.IO
- JWT and cookies
- Passport for Google authentication
- Vite and Tailwind

## Routes
### Auth
- GET /api/auth/google
- GET /api/auth/google/callback
- POST /api/auth/logout
- GET /api/auth/me

### Projects
- POST /api/projects
- GET /api/projects
- GET /api/projects/:id
- PATCH /api/projects/:id
- DELETE /api/projects/:id
- POST /api/projects/:id/invite
- DELETE /api/projects/:id/remove/:userId

### Contributions
- POST /api/contributions
- GET /api/contributions/:projectId
- GET /api/contributions/:projectId/summary

### Snapshots
- GET /api/snapshots/:projectId
- GET /api/snapshots/:projectId/range

## What It Solves
- Centralizes project and team activity
- Improves visibility into contribution history
- Supports role-based collaboration and access control
- Helps teams monitor project progress more effectively
