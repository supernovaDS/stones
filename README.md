<div align="center">
  <img src="frontend/public/stones_logo_2.png" alt="Stones Logo" width="120" height="120" />
  <h1>🪨 Stones</h1>
  <p><b>An offline-first, encrypted productivity workspace</b></p>
  <p>
    <a href="https://stones-iwzo.onrender.com/"><b>🔴 Live Demo</b></a>
  </p>
</div>

---

**Stones** is a powerful, offline-first productivity workspace designed to seamlessly blend your notes, tasks, daily planning, and analytics into one unified platform. Built with a focus on speed, privacy, and flexibility, Stones stores your data locally via IndexedDB, ensuring sub-millisecond response times and full functionality without an internet connection.

With the recent integration of **Supabase**, Stones now features robust, multi-device cloud synchronization, all secured by true **Client-Side End-to-End Encryption (E2EE)** for private data.

---

## ✨ Key Features

### 📝 Block-Based Editor
- Organize workspaces into customizable sections.
- Create dynamic pages using a rich block editor.
- Support for text notes, interactive tasks, code blocks, hyperlinks, and image attachments.
- Seamlessly reorder blocks via intuitive controls.

### ✅ Advanced Task Management
- Prioritize and schedule tasks with strict deadlines.
- Support for subtasks, dependencies, and complex recurring schedules.
- Convert simple text notes into actionable tasks effortlessly.
- Automated browser-level task reminders and notifications.
- Daily dashboard to focus purely on today's tasks.

### 📊 Insights & Analytics
- Track your task completion rates, analyze fail rates, and maintain productivity streaks.
- Visualize your monthly progress with an interactive GitHub-style heatmap.
- Advanced "undo" stack and a robust recovery bin for recently deleted items.

### ⚡ PWA Ready
- Install Stones as a Progressive Web App (PWA) on desktop or mobile.
- 100% functional offline thanks to a dedicated service worker.

---

## 🛠️ Tech Stack

**Frontend**
- **React 19** & **Vite 8**
- **Tailwind CSS v4** for utility-first styling and robust light/dark theming
- **Zustand** for lightweight, blazing-fast state management
- **Dexie.js** wrapping IndexedDB for the offline-first database experience
- `lucide-react` for crisp vector iconography

**Sync & Authentication**
- **Supabase:** Providing remote synchronization, user authentication, and secure cloud storage.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Supabase](https://supabase.com/) account (for syncing capabilities)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/stones.git
   cd stones/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the `frontend` directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_TASK_IMAGES_BUCKET=task-images
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:5173` to explore your workspace!

### Production Build
To generate a highly optimized production build, run:
```bash
npm run build
```

---

## 🏗️ Architecture Overview

Stones uses an **optimistic UI** approach. When you create or edit a block:
1. The UI instantly updates the local Zustand state.
2. The change is persisted locally to IndexedDB via Dexie.
3. The change is queued into a robust background `sync_queue`.
4. A background sync manager periodically negotiates with Supabase to resolve conflicts, push updates, and pull remote changes seamlessly.

---

## 📄 License
This project is open-source and available under the MIT License.
