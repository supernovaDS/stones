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
  Clipboard,
  FileText,
  CheckSquare,
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

  // Click outside or scroll to close
  useEffect(() => {
    if (!visible) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        hideContextMenu();
      }
    };
    const handleScroll = () => {
      hideContextMenu();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, { capture: true });

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [visible, hideContextMenu]);

  if (!visible || !block) return null;

  const handleAction = async (actionFn, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    hideContextMenu();
    await actionFn();
  };

  const handleCopyText = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    hideContextMenu();

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : "";

    if (selectedText.trim()) {
      await navigator.clipboard.writeText(selectedText);
      setNotification("Selected text copied");
      return;
    }

    let text = "";
    if (block.type === "note" || block.type === "title") {
      text = (block.content?.text || block.content?.html || "").replace(/<[^>]*>/g, "");
    } else if (block.type === "code") {
      text = block.content?.code || "";
    } else if (block.type === "checklist") {
      text = (block.content?.items || []).map((i) => i.text).join("\n");
    } else if (block.type === "link") {
      text = block.content?.url || block.content?.title || "";
    } else if (block.type === "task") {
      text = block.content?.title || "";
    }

    if (text) {
      await navigator.clipboard.writeText(text);
      setNotification("Block content copied");
    }
  };

  const handlePasteText = async (asPlainText = false, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    hideContextMenu();

    try {
      let clipText = await navigator.clipboard.readText();
      if (!clipText) return;

      if (asPlainText) {
        clipText = clipText.replace(/<[^>]*>/g, "");
      }

      const activeElem = document.activeElement;

      if (activeElem && (activeElem.tagName === "INPUT" || activeElem.tagName === "TEXTAREA")) {
        const start = activeElem.selectionStart ?? 0;
        const end = activeElem.selectionEnd ?? 0;
        const val = activeElem.value || "";
        const nextVal = val.slice(0, start) + clipText + val.slice(end);
        activeElem.value = nextVal;
        activeElem.setSelectionRange(start + clipText.length, start + clipText.length);
        activeElem.dispatchEvent(new Event("input", { bubbles: true }));
        setNotification(asPlainText ? "Pasted plain text" : "Pasted text");
        return;
      }

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(clipText);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        const container = range.startContainer.parentElement?.closest?.("[contenteditable]");
        if (container) {
          container.dispatchEvent(new Event("input", { bubbles: true }));
        }
        setNotification(asPlainText ? "Pasted plain text" : "Pasted text");
        return;
      }
    } catch (err) {
      console.error("Paste failed:", err);
      setNotification("Failed to paste from clipboard");
    }
  };

  const isEditableBlock = ["note", "title", "link", "code", "checklist"].includes(block.type);
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
        onClick={(e) => handleAction(() => moveBlock(block.id, "up"), e)}
      >
        <ArrowUp size={14} /> Move Up
      </button>

      <button
        type="button"
        className="block-context-menu-item"
        onClick={(e) => handleAction(() => moveBlock(block.id, "down"), e)}
      >
        <ArrowDown size={14} /> Move Down
      </button>

      {!isTaskBlock && (
        <button
          type="button"
          className="block-context-menu-item"
          onClick={(e) => handleAction(() => duplicateBlock(block.id), e)}
        >
          <Plus size={14} /> Duplicate Block
        </button>
      )}

      <button
        type="button"
        className="block-context-menu-item"
        onClick={(e) => handleAction(() => {
          cutBlock(block.id);
        }, e)}
      >
        <Scissors size={14} /> Cut Block
      </button>

      {isTaskBlock && (
        <>
          <button
            type="button"
            className="block-context-menu-item"
            onClick={(e) => handleAction(() => setSelectedTask(block.id), e)}
          >
            <PanelRight size={14} /> Open Details
          </button>

          <button
            type="button"
            className="block-context-menu-item"
            onClick={(e) => handleAction(() => toggleTask(block.id), e)}
          >
            <Check size={14} /> {block.metadata.completed ? "Mark Incomplete" : "Mark Complete"}
          </button>

          <button
            type="button"
            className="block-context-menu-item"
            onClick={(e) => handleAction(() => toggleFailTask(block.id), e)}
          >
            <XCircle size={14} /> {block.metadata.failed ? "Restore Task" : "Fail Task"}
          </button>
        </>
      )}

      {isEditableBlock && (
        <>
          <div className="h-[2px] bg-dashed border-t-2 border-dashed border-stone-200 dark:border-[#1e232a] my-1" />

          <button
            type="button"
            className="block-context-menu-item"
            onClick={(e) => handleCopyText(e)}
          >
            <Copy size={14} /> Copy
          </button>

          <button
            type="button"
            className="block-context-menu-item"
            onClick={(e) => handlePasteText(false, e)}
          >
            <Clipboard size={14} /> Paste
          </button>

          <button
            type="button"
            className="block-context-menu-item"
            onClick={(e) => handlePasteText(true, e)}
          >
            <FileText size={14} /> Paste as Plain Text
          </button>
        </>
      )}

      <button
        type="button"
        className="block-context-menu-item"
        onClick={(e) => handleAction(() => toggleArchiveBlock(block.id), e)}
      >
        <Archive size={14} /> {block.metadata.archived ? "Unarchive" : "Archive"}
      </button>

      <div className="h-[2px] bg-dashed border-t-2 border-dashed border-stone-200 dark:border-[#1e232a] my-1" />

      <button
        type="button"
        className="block-context-menu-item danger"
        onClick={(e) => handleAction(() => deleteBlock(block.id), e)}
      >
        <Trash2 size={14} /> Delete Block
      </button>
    </div>
  );
}
