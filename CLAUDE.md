# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Local development:**
```bash
npm install             # Install root workspace deps
npm run dev --workspace=api    # API server on port 4000
npm run dev --workspace=site   # Landing page on port 3000
npm run dev --workspace=app    # Dashboard on port 3001
```

## Architecture

Three workspaces in monorepo:

- **api/** - Express server with SQLite, JWT auth
  - `POST /api/auth/login` - Get JWT token (demo: admin/admin)
  - ESPs auto-register on first reading POST to `/api/readings`
  - Energy endpoints require `Authorization: Bearer <token>` header
- **site/** - Minimal Next.js placeholder
- **app/** - **beepBoop EM** PWA dashboard
  - shadcn/ui components for UI
  - Auth context for JWT management
  - Install button for PWA
  - Consumes protected API endpoints

Database: `users` (id, username, password, role) + `devices` (id, name, room, type, status, powerRating) + `readings` (telemetry).