import { useEffect, useRef, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { notifyDueReminders } from "./utils/helpers";
import { useAuth } from "./contexts/AuthContext";
import { useSync } from "./hooks/useSync";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Toaster, toast } from "sonner";
import { AuthPage } from "./components/auth/AuthPage";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { WorkspaceView, TaskListView, CalendarView, InsightsView } from "./components/views";
import { TaskDetailPanel, TaskModal, CommandPalette, SettingsModal, RecurringTasksModal, RecoveryModal, RecycleBinModal, ArchivedPagesModal, UnarchivePageModal } from "./components/modals";
import { ContextMenu } from "./components/ui";

function App() {
  const auth = useAuth();
  const syncStatus = useSync(auth.user);
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
    recurringTasksOpen,
    setRecurringTasksOpen,
    recycleBinOpen,
    setRecycleBinOpen,
    recoveryOpen,
    archivedPagesOpen,
    unarchiveModalPage,
    sidebarHidden,
    setSidebarHidden,
    theme,
    undoLastChange,
    view
  } = useAppStore();

  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Scroll position persistence ──────────────────────────────
  const scrollPositionsRef = useRef({});
  const isRestoringRef = useRef(false);

  const scrollKey = view === "workspace" ? `workspace-${activePageId}` : `view-${view}`;

  // Helper: instantly jump to a scroll position, bypassing CSS scroll-behavior: smooth
  const restoreScroll = (target) => {
    if (target <= 0) return;
    isRestoringRef.current = true;
    window.scrollTo({ top: target, behavior: "instant" });
    // Belt-and-suspenders: browsers may defer the first scrollTo when the
    // viewport is still being laid out after restore, so we retry a couple
    // of times on subsequent frames.
    requestAnimationFrame(() => {
      window.scrollTo({ top: target, behavior: "instant" });
      setTimeout(() => {
        window.scrollTo({ top: target, behavior: "instant" });
        isRestoringRef.current = false;
      }, 80);
    });
  };

  // Restore scroll position when the active page or view changes
  useEffect(() => {
    const target = scrollPositionsRef.current[scrollKey] || 0;
    isRestoringRef.current = true;
    window.scrollTo({ top: target, behavior: "instant" });
    const rafId = requestAnimationFrame(() => {
      window.scrollTo({ top: target, behavior: "instant" });
      isRestoringRef.current = false;
    });
    return () => cancelAnimationFrame(rafId);
  }, [scrollKey]);

  // Save on every scroll & restore on minimize/restore
  useEffect(() => {
    // Only persist meaningful (> 0) positions so that a browser‐reset‐to‐0
    // during minimize never overwrites a real saved value.
    const savePosition = () => {
      if (!isRestoringRef.current && window.scrollY > 0) {
        scrollPositionsRef.current[scrollKey] = window.scrollY;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // scrollY is still the real value here (blur fires before collapse).
        if (window.scrollY > 0) {
          scrollPositionsRef.current[scrollKey] = window.scrollY;
        }
      } else if (document.visibilityState === "visible") {
        const target = scrollPositionsRef.current[scrollKey];
        if (target > 0) restoreScroll(target);
      }
    };

    // blur fires *before* the browser collapses the viewport on minimize,
    // so scrollY is still valid → capture it as a safety net.
    const onBlur = () => {
      if (window.scrollY > 0) {
        scrollPositionsRef.current[scrollKey] = window.scrollY;
      }
    };

    const onFocus = () => {
      const target = scrollPositionsRef.current[scrollKey];
      if (target > 0 && Math.abs(window.scrollY - target) > 2) {
        restoreScroll(target);
      }
    };

    window.addEventListener("scroll", savePosition, { passive: true });
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("scroll", savePosition);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [scrollKey]);

  // ── Scroll to Top/Bottom button ────────────────────────────
  const [scrollDirection, setScrollDirection] = useState("down");
  const [isScrollVisible, setIsScrollVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const updateScrollButton = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
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
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", updateScrollButton, { passive: true });
    window.addEventListener("resize", updateScrollButton);
    updateScrollButton();

    const observer = new MutationObserver(updateScrollButton);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", updateScrollButton);
      window.removeEventListener("resize", updateScrollButton);
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
    if (auth.loading) return;
    void initialize({ skipSeed: Boolean(auth.user) });
  }, [initialize, auth.loading, auth.user]);

  // ── Theme sync ──────────────────────────────────────────────
  useEffect(() => {
    const isDark = theme === "dark";
    
    // Disable transitions temporarily to make theme switch instant
    document.documentElement.classList.add("disable-transitions");
    document.documentElement.classList.toggle("dark", isDark);
    
    // Re-enable transitions after browser paints the new theme
    const timer = setTimeout(() => {
      document.documentElement.classList.remove("disable-transitions");
    }, 50);
    
    return () => clearTimeout(timer);
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

  const handleMenuToggle = () => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarHidden(!sidebarHidden);
    }
  };

  // ── Main render ─────────────────────────────────────────────
  return (
    <main className="app-shell">
      <div className={`layout-grid ${sidebarHidden ? 'layout-grid-collapsed' : ''}`}>
        <div
          className={`sidebar-backdrop${sidebarOpen ? " sidebar-backdrop-visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isHiddenDesktop={sidebarHidden}
        />

        <section className="content-shell">
          <Topbar
            onCommandOpen={() => setCommandOpen(true)}
            onMenuToggle={handleMenuToggle}
            activePage={activePage}
            view={view}
            sidebarHidden={sidebarHidden}
          />
          {view === "workspace" && activePage ? (
            <WorkspaceView pageId={activePage.id} />
          ) : null}
          {view === "tasks" ? <TaskListView /> : null}
          {view === "calendar" ? <CalendarView /> : null}
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
      {settingsOpen ? <SettingsModal syncStatus={syncStatus} /> : null}
      {recurringTasksOpen ? <RecurringTasksModal onClose={() => setRecurringTasksOpen(false)} /> : null}
      {recycleBinOpen ? <RecycleBinModal /> : null}
      {recoveryOpen ? <RecoveryModal /> : null}
      {archivedPagesOpen ? <ArchivedPagesModal /> : null}
      {unarchiveModalPage ? <UnarchivePageModal /> : null}
      <ContextMenu />
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: "toast-success",
          error: {
            className: "toast-error"
          }
        }} 
      />
      {isScrollVisible && (
        <button
          className="scroll-btn"
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
