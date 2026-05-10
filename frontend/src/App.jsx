import { useEffect, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { isOverdue, isToday } from "./utils/date";
import { notifyDueReminders } from "./utils/helpers";

import { Sidebar } from "./components/layout/Sidebar";
import { Topbar, SearchBar } from "./components/layout/Topbar";
import { Notice } from "./components/ui";
import { WorkspaceView, TaskListView, CalendarView, InsightsView } from "./components/views";
import { TaskDetailPanel, TaskModal, CommandPalette, SettingsModal } from "./components/modals";

function App() {
  const {
    activePageId,
    addTaskBlock,
    blocks,
    closeTaskModal,
    error,
    initialize,
    loading,
    notification,
    pages,
    selectedTaskId,
    setNotification,
    taskModalParams,
    settingsOpen,
    theme,
    undoLastChange,
    view
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);

  const activePage = pages.find((page) => page.id === activePageId);
  const tasks = blocks.filter((block) => block.type === "task");
  const openTasks = tasks.filter((task) => !task.metadata.completed);
  const dueToday = openTasks.filter((task) => isToday(task.metadata.deadline));
  const overdue = openTasks.filter((task) => isOverdue(task.metadata.deadline));

  // ── Bootstrap ───────────────────────────────────────────────
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // ── Theme sync ──────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // ── Global keyboard shortcuts ───────────────────────────────
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void undoLastChange();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoLastChange]);

  // ── Reminder polling ────────────────────────────────────────
  useEffect(() => {
    const checkReminders = () => notifyDueReminders(openTasks, setNotification);
    checkReminders();
    const interval = window.setInterval(checkReminders, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [openTasks, setNotification]);

  // ── Loading state ───────────────────────────────────────────
  if (loading) {
    return (
      <main className="app-shell grid min-h-screen place-items-center p-6">
        <div className="brutal-card bg-[#ffdc4a] px-6 py-4 text-lg font-black">
          Loading workspace...
        </div>
      </main>
    );
  }

  // ── Main render ─────────────────────────────────────────────
  return (
    <main className="app-shell">
      <div className="layout-grid">
        <Sidebar dueToday={dueToday.length} overdue={overdue.length} />

        <section className="content-shell">
          <Topbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCommandOpen={() => setCommandOpen(true)}
            activePage={activePage}
            view={view}
          />

          <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

          {error ? <Notice tone="red">{error}</Notice> : null}
          {notification ? <Notice tone="green">{notification}</Notice> : null}

          {view === "workspace" && activePage ? (
            <WorkspaceView pageId={activePage.id} searchQuery={searchQuery} />
          ) : null}
          {view === "tasks" ? <TaskListView searchQuery={searchQuery} /> : null}
          {view === "calendar" ? <CalendarView searchQuery={searchQuery} /> : null}
          {view === "insights" ? <InsightsView /> : null}
        </section>
      </div>

      {selectedTaskId ? <TaskDetailPanel /> : null}
      {taskModalParams ? (
        <TaskModal
          initialParams={taskModalParams}
          onClose={closeTaskModal}
          onSubmit={async (taskData) => {
            await addTaskBlock(taskData);
          }}
        />
      ) : null}
      {commandOpen ? <CommandPalette onClose={() => setCommandOpen(false)} /> : null}
      {settingsOpen ? <SettingsModal /> : null}
    </main>
  );
}

export default App;
