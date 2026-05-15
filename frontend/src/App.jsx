import { useEffect, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { isOverdue, isToday } from "./utils/date";
import { notifyDueReminders } from "./utils/helpers";
import { useAuth } from "./contexts/AuthContext";
import { useSync } from "./hooks/useSync";

import { Toaster, toast } from "sonner";
import { AuthPage } from "./components/auth/AuthPage";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar, SearchBar } from "./components/layout/Topbar";
import { WorkspaceView, TaskListView, CalendarView, InsightsView } from "./components/views";
import { TaskDetailPanel, TaskModal, CommandPalette, SettingsModal } from "./components/modals";

function App() {
  const auth = useAuth();
  const syncStatus = useSync(auth.user);
  const {
    activePageId,
    addTaskBlock,
    blocks,
    closeTaskModal,
    colorProfile,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activePage = pages.find((page) => page.id === activePageId);
  const tasks = blocks.filter((block) => block.type === "task");
  const openTasks = tasks.filter((task) => !task.metadata.completed);
  const dueToday = openTasks.filter((task) => isToday(task.metadata.deadline));
  const overdue = openTasks.filter((task) => isOverdue(task.metadata.deadline));

  // ── Sync UI updates ─────────────────────────────────────────
  useEffect(() => {
    if (syncStatus.lastSyncedAt) {
      void useAppStore.getState().syncDbUpdates?.();
    }
  }, [syncStatus.lastSyncedAt]);

  // ── Bootstrap ───────────────────────────────────────────────
  useEffect(() => {
    void initialize({ skipSeed: Boolean(auth.user) });
  }, [initialize]);

  // ── Theme sync ──────────────────────────────────────────────
  useEffect(() => {
    // Glow profile is always dark-only
    const isDark = theme === "dark" || colorProfile === "glow";
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme, colorProfile]);

  // ── Color profile sync ─────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("profile-neo", "profile-minimal", "profile-glow");
    root.classList.add(`profile-${colorProfile}`);
  }, [colorProfile]);

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
      if (event.key === "Escape") {
        setSidebarOpen(false);
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

  if (auth.loading) {
    return (
      <main className="app-shell grid min-h-screen place-items-center p-6">
        <div className="brutal-card bg-[#ffdc4a] px-6 py-4 text-lg font-black">
          Restoring session...
        </div>
      </main>
    );
  }

  if (auth.authEnabled && !auth.session) {
    return (
      <>
        <AuthPage />
        <Toaster position="top-center" />
      </>
    );
  }

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
        <div
          className={`sidebar-backdrop${sidebarOpen ? " sidebar-backdrop-visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar
          dueToday={dueToday.length}
          overdue={overdue.length}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <section className="content-shell">
          <Topbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCommandOpen={() => setCommandOpen(true)}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
            activePage={activePage}
            view={view}
            syncStatus={syncStatus}
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
