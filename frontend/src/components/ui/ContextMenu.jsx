import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import {
  ArrowDown,
  ArrowUp,
  Scissors,
  Trash2,
  Archive,
  ArchiveRestore,
  Copy,
  Plus,
  Check,
  XCircle,
  PanelRight
} from "lucide-react";

export function ContextMenu() {
  const {
    contextMenu,
    hideContextMenu,
    blocks,
    moveBlock,
    duplicateBlock,
    cutBlock,
    toggleArchiveBlock,
    deleteBlock,
    setNotification,
    toggleTask,
    toggleFailTask,
    setSelectedTask
  } = useAppStore();

  const menuRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });

  const { visible, x, y, blockId } = contextMenu;
  const block = blocks.find((b) => b.id === blockId);

  useEffect(() => {
    if (!visible || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = x;
    let newY = y;

    if (x + rect.width > viewportWidth) {
      newX = viewportWidth - rect.width - 10;
    }
    if (y + rect.height > viewportHeight) {
      newY = viewportHeight - rect.height - 10;
    }

    setAdjustedPos({ x: Math.max(10, newX), y: Math.max(10, newY) });
  }, [x, y, visible]);

  // Click outside to close
  useEffect(() => {
    if (!visible) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        hideContextMenu();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [visible, hideContextMenu]);

  if (!visible || !block) return null;

  const handleAction = async (actionFn) => {
    hideContextMenu();
    await actionFn();
  };

  const handleCopyText = async () => {
    hideContextMenu();
    const rawText = block.content?.text || "";
    // Strip HTML tags for clean text copying
    const cleanText = rawText.replace(/<[^>]*>/g, "");
    try {
      await navigator.clipboard.writeText(cleanText);
      setNotification("Text copied to clipboard");
    } catch (e) {
      console.error("Failed to copy text", e);
    }
  };

  const isNoteBlock = block.type === "note";
  const isTaskBlock = block.type === "task";

  return (
    <div
      ref={menuRef}
      className="block-context-menu"
      style={{
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
      }}
    >
      <div className="px-3 py-1.5 border-b-2 border-dashed border-stone-200 dark:border-[#1e232a] mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-[#7a7670]">
          Block Actions
        </span>
      </div>

      <button
        type="button"
        className="block-context-menu-item"
        onClick={() => handleAction(() => moveBlock(block.id, "up"))}
      >
        <ArrowUp size={14} /> Move Up
      </button>

      <button
        type="button"
        className="block-context-menu-item"
        onClick={() => handleAction(() => moveBlock(block.id, "down"))}
      >
        <ArrowDown size={14} /> Move Down
      </button>

      {!isTaskBlock && (
        <button
          type="button"
          className="block-context-menu-item"
          onClick={() => handleAction(() => duplicateBlock(block.id))}
        >
          <Plus size={14} /> Duplicate Block
        </button>
      )}

      <button
        type="button"
        className="block-context-menu-item"
        onClick={() => handleAction(() => {
          cutBlock(block.id);
        })}
      >
        <Scissors size={14} /> Cut Block
      </button>

      {isTaskBlock && (
        <>
          <button
            type="button"
            className="block-context-menu-item"
            onClick={() => handleAction(() => setSelectedTask(block.id))}
          >
            <PanelRight size={14} /> Open Details
          </button>

          <button
            type="button"
            className="block-context-menu-item"
            onClick={() => handleAction(() => toggleTask(block.id))}
          >
            <Check size={14} /> {block.metadata.completed ? "Mark Incomplete" : "Mark Complete"}
          </button>

          <button
            type="button"
            className="block-context-menu-item"
            onClick={() => handleAction(() => toggleFailTask(block.id))}
          >
            <XCircle size={14} /> {block.metadata.failed ? "Restore Task" : "Fail Task"}
          </button>
        </>
      )}

      {isNoteBlock && (
        <button
          type="button"
          className="block-context-menu-item"
          onClick={handleCopyText}
        >
          <Copy size={14} /> Copy Text Content
        </button>
      )}

      <button
        type="button"
        className="block-context-menu-item"
        onClick={() => handleAction(() => toggleArchiveBlock(block.id))}
      >
        <Archive size={14} /> {block.metadata.archived ? "Unarchive" : "Archive"}
      </button>

      <div className="h-[2px] bg-dashed border-t-2 border-dashed border-stone-200 dark:border-[#1e232a] my-1" />

      <button
        type="button"
        className="block-context-menu-item danger"
        onClick={() => handleAction(() => deleteBlock(block.id))}
      >
        <Trash2 size={14} /> Delete Block
      </button>
    </div>
  );
}
