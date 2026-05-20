import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { isOverdue, isToday } from "./utils/date";
import { notifyDueReminders } from "./utils/helpers";
import { useAuth } from "./contexts/AuthContext";
import { useSync } from "./hooks/useSync";
import { ArrowDown, ArrowUp } from "lucide-react";

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

  // ── Scroll to Top/Bottom button ──
  const [scrollDirection, setScrollDirection] = useState("down");
  const [isScrollVisible, setIsScrollVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;

      if (docHeight > winHeight + 150) {
        setIsScrollVisible(true);
      } else {
        setIsScrollVisible(false);
      }

      if (scrollTop > (docHeight - winHeight) / 2) {
        setScrollDirection("up");
      } else {
        setScrollDirection("down");
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    handleScroll();

    const observer = new MutationObserver(handleScroll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      observer.disconnect();
    };
  }, []);

  const handleScrollClick = () => {
    if (scrollDirection === "up") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    }
  };

  const activePage = pages.find((page) => page.id === activePageId);
  const tasks = blocks.filter((block) => block.type === "task");
  const openTasks = tasks.filter((task) => !task.metadata.completed && !task.metadata.failed);
  const dueToday = openTasks.filter((task) => isToday(task.metadata.deadline));
  const overdue = openTasks.filter((task) => isOverdue(task.metadata.deadline));

  // ── Sync UI updates (debounced) ─────────────────────────────
  const syncDebounceRef = useRef(null);
  useEffect(() => {
    if (syncStatus.lastSyncedAt) {
      if (syncDebounceRef.current) window.clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = window.setTimeout(() => {
        void useAppStore.getState().syncDbUpdates?.();
        syncDebounceRef.current = null;
      }, 300);
    }
    return () => {
      if (syncDebounceRef.current) window.clearTimeout(syncDebounceRef.current);
    };
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
      {isScrollVisible && (
        <button
          className={
            colorProfile === "minimal"
              ? "fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-md transition-all hover:bg-stone-50 hover:shadow-lg active:scale-95 dark:border-stone-800 dark:bg-[#12151a] dark:text-[#c8c3ba] dark:shadow-none animate-in fade-in zoom-in-75 duration-200"
              : "fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-black bg-[#ffdc4a] text-black shadow-[4px_4px_0_#111] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111] active:translate-y-0 active:shadow-[2px_2px_0_#111] dark:border-black dark:bg-[#21caff] dark:text-black dark:shadow-[3px_3px_0_#000] animate-in fade-in zoom-in-75 duration-200"
          }
          onClick={handleScrollClick}
          title={scrollDirection === "up" ? "Scroll to top" : "Scroll to bottom"}
          type="button"
        >
          {scrollDirection === "up" ? <ArrowUp size={22} /> : <ArrowDown size={22} />}
        </button>
      )}
    </main>
  );
}

export default App;
