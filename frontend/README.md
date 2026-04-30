# Stones Frontend

React/Vite JavaScript frontend for the offline-first task and workspace app.

## Current MVP

- Workspace pages stored in IndexedDB
- Sidebar sections for grouping pages
- Note and task blocks
- Checklist, code, link, and image blocks
- Global quick-add with simple priority/date/repeat parsing
- Search across note and task content
- Basic task fields: completion, priority, and due date
- Task filters for open, today, overdue, upcoming, no date, high priority, completed, and all
- Task sorting and grouping by day, week, and month
- Redesigned agenda-style Tasks view
- Calendar view with task dots by priority
- Convert note text into a linked task
- Backend-powered task extraction with review before adding tasks
- Daily planner view
- Daily page creation
- Drag-and-drop block reordering with arrow controls
- Task detail panel with notes, source link context, recurrence, subtasks, and dependencies
- Simple daily and weekly recurring tasks
- Light and dark modes
- Green/black/white color scheme with orange and purple highlights
- Color-coded task priority accents
- Simple analytics and streak tracking
- JSON export and import
- Markdown page export
- Command palette with common actions

## Setup

```bash
npm install
npm run dev
```

The app defaults to `http://localhost:5173`.

For AI extraction, run the backend at `http://localhost:4000` or set:

```bash
VITE_API_BASE_URL=http://localhost:4000
```
