import {
  Check,
  Code2,
  Command,
  Heading,
  Image,
  Link,
  ListChecks,
  Menu,
  Plus,
  RotateCcw,
  Search
} from "lucide-react";
import { useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { viewTitle } from "../../utils/helpers";
import { HeaderButton } from "../ui";
import { SyncStatusIndicator } from "../sync/SyncStatusIndicator";

export function Topbar({ searchQuery, onSearchChange, onCommandOpen, onMenuToggle, activePage, view, syncStatus }) {

  const {
    addChecklistBlock,
    addCodeBlock,
    addImageBlock,
    addLinkBlock,
    addNoteBlock,
    addTitleBlock,
    openTaskModal,
    openTodayPage,
    undoLastChange,
    undoStack
  } = useAppStore();
  const imageInputRef = useRef(null);

  const addImage = async (file) => {
    await addImageBlock(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

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
        <HeaderButton icon={Command} label="Menu" onClick={onCommandOpen} />
        <HeaderButton
          disabled={!undoStack.length}
          icon={RotateCcw}
          label="Undo"
          onClick={() => void undoLastChange()}
        />
        {view === "workspace" && activePage && (
          <>
            <HeaderButton icon={Heading} label="Heading" onClick={() => void addTitleBlock()} />
            <HeaderButton icon={Plus} label="Note" onClick={() => void addNoteBlock()} />
            <HeaderButton icon={ListChecks} label="Checklist" onClick={() => void addChecklistBlock()} />
            <HeaderButton icon={Link} label="Link" onClick={() => void addLinkBlock()} />
            <HeaderButton icon={Code2} label="Code" onClick={() => void addCodeBlock()} />
            <HeaderButton icon={Image} label="Image" onClick={() => imageInputRef.current?.click()} />
            <button
              className="nb-button action"
              onClick={() => openTaskModal()}
              type="button"
            >
              <Check size={16} />
              <span className="header-btn-label">Task</span>
            </button>
          </>
        )}
        <input
          accept="image/*"
          className="hidden"
          onChange={(event) => void addImage(event.target.files?.[0])}
          ref={imageInputRef}
          type="file"
        />
      </div>
    </header>
  );
}

export function SearchBar({ searchQuery, onSearchChange }) {
  return (
    <div className="mb-5 grid gap-3">
      <label className="nb-input flex min-h-12 items-center gap-2 px-3 text-sm text-stone-600 dark:text-[#7a7670]">
        <Search size={16} />
        <input
          className="min-w-0 flex-1 bg-transparent text-stone-900 outline-none dark:text-[#c8c3ba]"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search notes, tasks, pages..."
          value={searchQuery}
        />
      </label>
    </div>
  );
}
