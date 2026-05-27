import {
  Command,
  Menu,
  RotateCcw,
  Repeat,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { viewTitle } from "../../utils/helpers";
import { HeaderButton } from "../ui";
import { SyncStatusIndicator } from "../sync/SyncStatusIndicator";

export function Topbar({ onCommandOpen, onMenuToggle, activePage, view, syncStatus }) {

  const {
    undoLastChange,
    undoStack,
    setRecurringTasksOpen
  } = useAppStore();

  return (
    <header className="topbar">
      <div className="topbar-main min-w-0 flex-1 flex items-center gap-3">
        <button
          aria-label="Toggle sidebar"
          className="menu-toggle icon-button"
          onClick={onMenuToggle}
          title="Toggle sidebar"
          type="button"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <p className="date-label text-sm font-black uppercase tracking-wide text-stone-600 dark:text-[#7a7670]">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric"
            })}
          </p>
          <h2 className="max-w-full truncate text-3xl font-black tracking-normal max-sm:text-2xl">
            {view === "workspace" ? "Workspace" : viewTitle(view)}
          </h2>
        </div>
      </div>
      <div className="topbar-actions flex flex-wrap items-center gap-2">
        <SyncStatusIndicator status={syncStatus} onSync={() => void syncStatus?.syncNow?.()} />
        <HeaderButton
          icon={Repeat}
          label="Recurring Tasks"
          onClick={() => setRecurringTasksOpen(true)}
        />
        <HeaderButton icon={Command} label="Menu" onClick={onCommandOpen} />
        <HeaderButton
          disabled={!undoStack.length}
          icon={RotateCcw}
          label="Undo"
          onClick={() => void undoLastChange()}
        />
      </div>
    </header>
  );
}

