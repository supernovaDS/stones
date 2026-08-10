import {
  Command,
  Menu,
  RotateCcw,
  Repeat,
  Edit2,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { viewTitle } from "../../utils/helpers";
import { HeaderButton } from "../ui";

export function Topbar({ onCommandOpen, onMenuToggle, activePage, view, sidebarHidden }) {

  const {
    undoLastChange,
    undoStack,
    setRecurringTasksOpen,
    renamePage,
  } = useAppStore();

  const activeUndoStack = undoStack;

  return (
    <header className="topbar">
      <div className="topbar-main min-w-0 flex-1 flex items-center gap-3">
        <button
          aria-label="Toggle sidebar"
          className="icon-button"
          onClick={onMenuToggle}
          title="Toggle sidebar"
          type="button"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="date-label text-sm font-black uppercase tracking-wide text-stone-600 dark:text-[#7a7670]">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric"
            })}
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="truncate text-3xl font-black tracking-normal max-sm:text-2xl">
              {view === "workspace" ? (activePage?.title || "Workspace") : viewTitle(view)}
            </h2>
            {view === "workspace" && activePage && (
              <button
                className="icon-button !h-7 !w-7 shrink-0"
                onClick={() => {
                  const newTitle = window.prompt("Rename page:", activePage.title);
                  if (newTitle && newTitle.trim()) {
                    void renamePage(activePage.id, newTitle.trim());
                  }
                }}
                title="Rename page"
                type="button"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="topbar-actions flex flex-wrap items-center gap-2">
        <HeaderButton
          icon={Repeat}
          label="Recurring Tasks"
          onClick={() => setRecurringTasksOpen(true)}
        />
        <HeaderButton icon={Command} label="Menu" onClick={onCommandOpen} />
        <HeaderButton
          disabled={!activeUndoStack.length}
          icon={RotateCcw}
          label="Undo"
          onClick={() => void undoLastChange()}
        />
      </div>
    </header>
  );
}

