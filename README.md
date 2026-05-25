# Stones

Stones is an offline-first productivity workspace that combines notes, tasks, daily planning, reminders, and lightweight analytics. It is built to stay useful without a server: the browser stores workspace data in IndexedDB, while the optional backend provides a foundation for future sync features.

## Features

- Workspace pages organized into editable sections
- Block editor with notes, tasks, checklists, code blocks, links, and image blocks
- Block reordering via directional controls
- Task priorities, due dates, subtasks, dependencies, recurring tasks, schedules, and reminders
- Daily dashboard to focus on today's tasks
- Calendar view for dated tasks
- Notes-to-tasks conversion, including selected text conversion and linked source notes

- Command palette with slash-style commands and page/task search
- Workspace graph for page links and task backlinks
- Insights dashboard with completion rate, streaks, heatmap, backup/import, Markdown export, and PDF print export
- Undo stack and recently deleted recovery
- PWA manifest and service worker for installable/offline-friendly usage
- Light and dark mode

## Tech Stack

- Frontend: React, Vite, JavaScript, Tailwind CSS, Zustand
- Local database: IndexedDB through Dexie

- Icons: `lucide-react`
- Backend: Node.js, Express, Zod, Helmet, CORS, Morgan, rate limiting


## Project Structure

```text
stones/
  backend/   Express API for health checks and future sync
  frontend/  React app and PWA assets
```

## Setup

Install dependencies separately for the frontend and backend:

```bash
cd frontend
npm install

cd ../backend
npm install
cp .env.example .env
```


## Run Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. The frontend expects the backend at `http://localhost:4000` by default.

## Production Checks

```bash
cd frontend
npm run build

cd ../backend
npm run check
```

## Data Model

The browser stores all workspace data in IndexedDB:

- `workspaces`: top-level workspace records
- `sections`: sidebar grouping for pages
- `pages`: workspace pages
- `blocks`: all note/task/checklist/code/link/image content

Task data is stored as specialized blocks with metadata for completion, priority, due dates, recurrence, scheduling, reminders, and completion timestamps.

## Backend API

- `GET /api/health`: service health check

