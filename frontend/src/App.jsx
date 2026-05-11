import { useEffect, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { isOverdue, isToday } from "./utils/date";
import { notifyDueReminders } from "./utils/helpers";

import { Toaster, toast } from "sonner";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar, SearchBar } from "./components/layout/Topbar";
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
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (notification) {
      toast.success(notification);
    }
  }, [notification]);

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
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: "border-4 border-black !bg-[#2ef2a6] !text-[#111111] !font-black !text-base shadow-[9px_9px_0_#111] rounded-[10px] dark:border-[#1e232a] dark:!bg-[#0a6b42] dark:!text-[#c8c3ba] dark:shadow-[6px_6px_0_#000] !p-4 !rounded-xl !border-4 !opacity-100",
          error: {
            className: "!bg-[#ff5a5f] border-4 border-black !text-[#111111] !font-black !text-base shadow-[9px_9px_0_#111] rounded-[10px] dark:border-[#1e232a] dark:!bg-[#3d1215] dark:!text-[#e8a0a2] dark:shadow-[6px_6px_0_#000]"
          }
        }} 
      />
    </main>
  );
}

export default App;
