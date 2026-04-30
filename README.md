# Stones

Stones is an offline-first productivity workspace that combines notes, tasks, daily planning, reminders, lightweight analytics, and AI-assisted task extraction. It is built to stay useful without a server: the browser stores workspace data in IndexedDB, while the optional backend protects API keys for AI features.

## Features

- Workspace pages organized into editable sections
- Block editor with notes, tasks, checklists, code blocks, links, and image blocks
- Drag-and-drop block reordering
- Task priorities, due dates, subtasks, dependencies, recurring tasks, schedules, and reminders
- Daily planner with drag-and-drop time blocking
- Calendar view for dated tasks
- Notes-to-tasks conversion, including selected text conversion and linked source notes
- AI task extraction through a backend Gemini proxy with local fallback extraction
- Command palette with slash-style commands and page/task search
- Workspace graph for page links and task backlinks
- Insights dashboard with completion rate, streaks, heatmap, backup/import, Markdown export, and PDF print export
- Undo stack and recently deleted recovery
- PWA manifest and service worker for installable/offline-friendly usage
- Light and dark mode

## Tech Stack

- Frontend: React, Vite, JavaScript, Tailwind CSS, Zustand
- Local database: IndexedDB through Dexie
- Drag and drop: `@dnd-kit`
- Icons: `lucide-react`
- Backend: Node.js, Express, Zod, Helmet, CORS, Morgan, rate limiting
- AI: Google Gemini API through backend, local rule-based fallback

## Project Structure

```text
stones/
  backend/   Express API for health checks and AI extraction
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

The backend works without `GEMINI_API_KEY`; it will use local task extraction. Add a Gemini API key to `backend/.env` to enable model-backed extraction.

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
- `POST /api/ai/extract-tasks`: extracts tasks from note text using Gemini when configured, otherwise local fallback

