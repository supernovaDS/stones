import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Code2,
  ImagePlus,
  Link,
  Maximize2,
  Minimize2,
  Move,
  PanelRight,
  Plus,
  RotateCw,
  Scissors,
  Trash2,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
  Archive,
  ArchiveRestore
} from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate, toDateInput } from "../../utils/date";
import { priorityClasses, priorityRail, blockTypeRail } from "../../utils/constants";
import { getEmbedUrl } from "../../utils/helpers";
import { useIsBlocked } from "../../hooks/useIsBlocked";
import { IconButton, Badge, Checkbox } from "../ui";

// ── Block dispatcher ────────────────────────────────────────────

export function BlockCard({ block }) {
  if (block.type === "task") return <TaskBlock block={block} />;
  if (block.type === "checklist") return <ChecklistBlock block={block} />;
  if (block.type === "code") return <CodeBlock block={block} />;
  if (block.type === "link") return <LinkBlock block={block} />;
  if (block.type === "image") return <ImageBlock block={block} />;
  if (block.type === "title") return <TitleBlock block={block} />;
  return <NoteBlock block={block} />;
}

// ── Block shell ─────────────────────────────────────────────────

function BlockShell({ block, label, children, actions }) {
  const { deleteBlock, moveBlock, toggleArchiveBlock, cutBlock, clipboard } = useAppStore();
  const isCut = clipboard?.some((b) => b.id === block.id);
  return (
    <article className={clsx("bento-card block-shell h-full border-l-[10px] p-4 transition-all duration-150", `block-type-${block.type}`, blockTypeRail[block.type] ?? "border-l-stone-400", isCut && "is-cut")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">{label}</p>
        <div className="block-actions flex flex-wrap gap-2">
          <IconButton icon={ArrowUp} title="Move up" onClick={() => void moveBlock(block.id, "up")} />
          <IconButton icon={ArrowDown} title="Move down" onClick={() => void moveBlock(block.id, "down")} />
          {actions}
          <IconButton icon={Scissors} title="Cut block" onClick={() => cutBlock(block.id)} />
          <IconButton icon={block.metadata.archived ? ArchiveRestore : Archive} title={block.metadata.archived ? "Unarchive block" : "Archive block"} onClick={() => void toggleArchiveBlock(block.id)} />
          <IconButton danger icon={Trash2} title="Delete block" onClick={() => void deleteBlock(block.id)} />
        </div>
      </div>
      {children}
    </article>
  );
}

// ── Note block ──────────────────────────────────────────────────

const FONT_COLORS = ["#111111", "#ff5a5f", "#ff8c42", "#ffdc4a", "#2ef2a6", "#21caff", "#a78bfa", "#f472b6", "#ffffff"];

function RichToolbar({ editorRef }) {
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    insertOrderedList: false,
    insertUnorderedList: false,
    foreColor: "#111111",
  });
  const [showFontColor, setShowFontColor] = useState(false);

  useEffect(() => {
    const updateFormatState = () => {
      const selection = window.getSelection();
      if (!editorRef.current || !selection.anchorNode || !editorRef.current.contains(selection.anchorNode)) {
        setActiveFormats({
          bold: false,
          italic: false,
          underline: false,
          justifyLeft: false,
          justifyCenter: false,
          justifyRight: false,
          insertOrderedList: false,
          insertUnorderedList: false,
          foreColor: "#111111",
        });
        return;
      }

      // queryCommandValue("foreColor") typically returns an rgb() string.
      // If it fails or returns nothing, we default to #111111.
      const currentForeColor = document.queryCommandValue("foreColor") || "#111111";

      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        foreColor: currentForeColor,
      });
    };

    document.addEventListener("selectionchange", updateFormatState);
    return () => document.removeEventListener("selectionchange", updateFormatState);
  }, []);

  const exec = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    // Manually trigger update after command execution
    setActiveFormats(prev => ({
      ...prev,
      [command]: command === "foreColor" ? value : document.queryCommandState(command),
      ...(command === "foreColor" ? { foreColor: value } : {})
    }));
  };

  return (
    <div className="rte-toolbar mb-3 flex flex-wrap items-center gap-1.5">
      {/* Bold */}
      <button className={clsx("rich-button", activeFormats.bold && "rich-button--active")} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} type="button" title="Bold">
        <strong>B</strong>
      </button>
      {/* Italic */}
      <button className={clsx("rich-button italic", activeFormats.italic && "rich-button--active")} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} type="button" title="Italic">
        I
      </button>
      {/* Underline */}
      <button className={clsx("rich-button", activeFormats.underline && "rich-button--active")} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} type="button" title="Underline" style={{ textDecoration: "underline" }}>
        U
      </button>

      {/* Link */}
      <button className="rich-button" onMouseDown={(e) => e.preventDefault()} onClick={() => {
        const url = window.prompt("Enter link URL:", "https://");
        if (url) exec("createLink", url);
      }} type="button" title="Insert link">
        <Link size={14} strokeWidth={2.5} />
      </button>

      <span className="rte-sep" />

      {/* Align */}
      <button className={clsx("rich-button", activeFormats.justifyLeft && "rich-button--active")} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyLeft")} type="button" title="Align left">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>
      </button>
      <button className={clsx("rich-button", activeFormats.justifyCenter && "rich-button--active")} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyCenter")} type="button" title="Align center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
      </button>
      <button className={clsx("rich-button", activeFormats.justifyRight && "rich-button--active")} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyRight")} type="button" title="Align right">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></svg>
      </button>

      <span className="rte-sep" />

      {/* Numbered list */}
      <button className={clsx("rich-button", activeFormats.insertOrderedList && "rich-button--active")} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} type="button" title="Numbered list">
        1.
      </button>
      {/* Bullet list */}
      <button className={clsx("rich-button", activeFormats.insertUnorderedList && "rich-button--active")} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} type="button" title="Bullet list">
        •
      </button>

      <span className="rte-sep" />

      {/* Font Color */}
      <div className="relative">
        <button className="rich-button" onMouseDown={(e) => e.preventDefault()} onClick={() => {
          setShowFontColor((v) => !v);
        }} type="button" title="Font color">
          A<span className="ml-0.5 inline-block h-[3px] w-3 rounded" style={{ background: activeFormats.foreColor }} />
        </button>
        {showFontColor ? (
          <div className="rte-dropdown" onMouseDown={(e) => e.preventDefault()}>
            {FONT_COLORS.map((color) => (
              <button
                className="rte-swatch"
                key={color}
                onClick={() => { exec("foreColor", color); setShowFontColor(false); }}
                style={{ background: color }}
                title={color}
                type="button"
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NoteBlock({ block }) {
  const { blocks, setSelectedTask, updateBlockContent } = useAppStore();
  const editorRef = useRef(null);
  const [activeLink, setActiveLink] = useState(null);
  const linkedTasks = blocks.filter((task) => task.type === "task" && task.sourceBlockId === block.id);
  const isInitializing = useRef(false);

  // Initialize editor content from stored HTML or plain text
  useEffect(() => {
    if (!editorRef.current) return;
    isInitializing.current = true;
    const html = block.content.html ?? "";
    const text = block.content.text ?? "";
    // Prefer stored HTML; fall back to plain text (wrap lines in <p> tags)
    if (html) {
      editorRef.current.innerHTML = html;
    } else if (text) {
      editorRef.current.innerHTML = text
        .split("\n")
        .map((line) => `<p>${line || "<br>"}</p>`)
        .join("");
    } else {
      editorRef.current.innerHTML = "";
    }
    isInitializing.current = false;
  }, [block.id]); // only re-init when block changes

  const handleInput = () => {
    if (isInitializing.current) return;
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    const text = editor.innerText;
    void updateBlockContent(block.id, { html, text });
  };

  return (
    <BlockShell
      block={block}
      label="Note"
    >
      <RichToolbar editorRef={editorRef} />
      <div className="relative">
        <div
          className="nb-textarea rte-editor min-h-36 w-full px-4 py-3 text-base leading-7"
          contentEditable
          onInput={handleInput}
          onClick={(e) => {
            if (e.target.tagName === "A") {
              const editorRect = editorRef.current.getBoundingClientRect();
              const linkRect = e.target.getBoundingClientRect();
              setActiveLink({
                url: e.target.href,
                top: linkRect.bottom - editorRect.top + 8,
                left: Math.max(0, linkRect.left - editorRect.left),
              });
            } else {
              setActiveLink(null);
            }
          }}
          onMouseOver={(e) => {
            if (e.target.tagName === "A") {
              const editorRect = editorRef.current.getBoundingClientRect();
              const linkRect = e.target.getBoundingClientRect();
              setActiveLink({
                url: e.target.href,
                top: linkRect.bottom - editorRect.top + 8,
                left: Math.max(0, linkRect.left - editorRect.left),
              });
            }
          }}
          ref={editorRef}
          suppressContentEditableWarning
          data-placeholder="Write a note, meeting thought, or rough plan..."
        />
        {activeLink && (
          <div
            className="absolute z-10 flex items-center gap-3 rounded-md border-[2px] border-black bg-white px-3 py-2 shadow-[3px_3px_0_#111] dark:border-[#1e232a] dark:bg-[#0c0e11] dark:shadow-[2px_2px_0_#000]"
            style={{ top: activeLink.top, left: activeLink.left }}
          >
            <span className="max-w-[200px] truncate text-xs text-stone-500 dark:text-[#7a7670]">{activeLink.url}</span>
            <a
              className="text-xs font-black text-blue-500 hover:underline"
              href={activeLink.url}
              onClick={() => setActiveLink(null)}
              rel="noopener noreferrer"
              target="_blank"
            >
              Go to link
            </a>
          </div>
        )}
      </div>
      {linkedTasks.length ? (
        <div className="mt-4 rounded-lg border-[3px] border-black bg-[#f1f5ff] p-3 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">Linked tasks</p>
          <div className="grid gap-2">
            {linkedTasks.map((task) => (
              <button
                className="nb-button justify-between bg-white text-left dark:bg-[#12151a]"
                key={task.id}
                onClick={() => setSelectedTask(task.id)}
                type="button"
              >
                <span className={clsx("truncate", task.metadata.completed && "text-stone-400 line-through dark:text-[#5a5650]")}>{task.content.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </BlockShell>
  );
}

// ── Title block ─────────────────────────────────────────────────

function TitleBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  return (
    <BlockShell block={block} label="Heading">
      <input
        className="w-full bg-transparent text-3xl font-black tracking-tight text-black outline-none dark:text-[#c8c3ba]"
        onChange={(event) => void updateBlockContent(block.id, { text: event.target.value })}
        placeholder="Header / Section Title..."
        value={block.content.text ?? ""}
      />
    </BlockShell>
  );
}

// ── Task block ──────────────────────────────────────────────────

function TaskBlock({ block }) {
  const { deleteBlock, setSelectedTask, toggleTask, toggleFailTask, updateTask, moveBlock, updateSubtask, deleteSubtask, addSubtask, toggleArchiveBlock, cutBlock, clipboard } = useAppStore();
  const blocked = useIsBlocked(block);
  const isCut = clipboard?.some((b) => b.id === block.id);
  return (
    <article className={clsx("bento-card block-shell block-type-task h-full border-l-[10px] p-4 transition-all duration-150", priorityRail[block.metadata.priority ?? "medium"], isCut && "is-cut")}>
      <div className="grid gap-3">
        <div className="task-block-header flex items-start gap-3">
          <Checkbox checked={block.metadata.completed} onChange={() => void toggleTask(block.id)} className="mt-1" />
          <input
            className={clsx("min-w-0 flex-1 bg-transparent text-xl font-black outline-none", block.metadata.completed && "text-stone-400 line-through dark:text-[#5a5650]", block.metadata.failed && "text-red-500 line-through dark:text-red-400")}
            onChange={(event) => void updateTask(block.id, { title: event.target.value })}
            placeholder="Task title"
            value={block.content.title}
          />
          <div className="task-block-actions flex shrink-0 flex-wrap gap-2">
            <IconButton icon={ArrowUp} title="Move up" onClick={() => void moveBlock(block.id, "up")} />
            <IconButton icon={ArrowDown} title="Move down" onClick={() => void moveBlock(block.id, "down")} />
            <IconButton 
              icon={XCircle} 
              title={block.metadata.failed ? "Unfail task" : "Fail task"} 
              onClick={() => void toggleFailTask(block.id)} 
              className={clsx(
                block.metadata.failed 
                  ? "!bg-[#ff5a5f] !text-black border-black dark:!bg-[#5c1a1d] dark:!text-[#e8a0a2] dark:border-[#1e232a]" 
                  : "bg-white text-stone-600 dark:bg-[#12151a] dark:text-[#7a7670]"
              )}
            />
            <IconButton icon={PanelRight} title="Open details" onClick={() => setSelectedTask(block.id)} />
            <IconButton icon={Scissors} title="Cut task" onClick={() => cutBlock(block.id)} />
            <IconButton icon={block.metadata.archived ? ArchiveRestore : Archive} title={block.metadata.archived ? "Unarchive task" : "Archive task"} onClick={() => void toggleArchiveBlock(block.id)} />
            <IconButton danger icon={Trash2} title="Delete task" onClick={() => void deleteBlock(block.id)} />
          </div>
        </div>
        <div className="task-block-controls flex flex-wrap items-center gap-2 pl-8">
          <select className={clsx("nb-select h-10 px-2 text-sm font-black", priorityClasses[block.metadata.priority ?? "medium"])} onChange={(event) => void updateTask(block.id, { priority: event.target.value })} value={block.metadata.priority ?? "medium"}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input className="nb-input h-10 px-2 text-sm" onChange={(event) => void updateTask(block.id, { deadline: event.target.value })} type="date" value={toDateInput(block.metadata.deadline)} />
          <select className="nb-select h-10 px-2 text-sm" onChange={(event) => void updateTask(block.id, { recurrence: event.target.value })} value={block.metadata.recurrence ?? "none"}>
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
          {block.metadata.recurrence === "custom" ? (
            <label className="nb-input inline-flex h-10 items-center gap-2 px-2 text-sm">
              Every
              <input
                className="w-12 bg-transparent text-center outline-none"
                min="1"
                onChange={(event) => void updateTask(block.id, { customRecurrenceInterval: event.target.value })}
                type="number"
                value={block.metadata.customRecurrenceInterval ?? 1}
              />
              days
            </label>
          ) : null}
          <button
            className="nb-button h-10 px-3 text-xs font-black bg-white hover:bg-stone-50 text-stone-700 dark:bg-[#12151a] dark:text-[#7a7670]"
            onClick={() => void addSubtask(block.id)}
            type="button"
          >
            + Subtask
          </button>
          {blocked && !block.metadata.failed ? <Badge tone="red">Blocked</Badge> : null}
          {block.sourceBlockId ? <Badge>Linked note</Badge> : null}
          {block.metadata.scheduledDate ? <Badge>{block.metadata.scheduledStart ?? "Scheduled"}</Badge> : null}
          {block.metadata.reminderAt ? <Badge><Bell size={13} /> {formatShortDate(block.metadata.reminderAt)}</Badge> : null}
        </div>
        {block.content.subtasks && block.content.subtasks.length > 0 ? (
          <div className="task-block-subtasks pl-8 pr-2 pt-3 border-t border-dashed border-stone-300 dark:border-stone-850 grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-[#7a7670]">
                Subtasks ({block.content.subtasks.filter(s => s.completed).length}/{block.content.subtasks.length})
              </span>
            </div>
            <div className="grid gap-1.5 max-h-48 overflow-y-auto pr-1">
              {block.content.subtasks.map((subtask) => (
                <div className="flex items-center gap-2 group/subtask" key={subtask.id}>
                  <Checkbox 
                    checked={subtask.completed} 
                    onChange={(event) => void updateSubtask(block.id, subtask.id, { completed: event.target.checked })} 
                  />
                  <input 
                    className={clsx(
                      "min-w-0 flex-1 bg-transparent text-sm font-bold outline-none", 
                      subtask.completed && "text-stone-400 line-through dark:text-[#5a5650]"
                    )} 
                    onChange={(event) => void updateSubtask(block.id, subtask.id, { text: event.target.value })} 
                    value={subtask.text} 
                  />
                  <button
                    className="opacity-0 group-hover/subtask:opacity-100 transition-opacity text-stone-400 hover:text-red-500 p-0.5"
                    onClick={() => void deleteSubtask(block.id, subtask.id)}
                    title="Delete subtask"
                    type="button"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

// ── Checklist block ─────────────────────────────────────────────

function ChecklistBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  const items = block.content.items ?? [];
  const updateItems = (nextItems) => void updateBlockContent(block.id, { items: nextItems });

  const completedCount = items.filter((item) => item.completed).length;
  const progress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);

  return (
    <BlockShell block={block} label="Checklist">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-black bg-white shadow-[2px_2px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[1px_1px_0_#000]">
          <div className="h-full bg-[#2ef2a6] dark:bg-[#0a3d28]" style={{ width: `${progress}%`, transition: "width 0.3s ease" }} />
        </div>
        <span className="text-xs font-black text-stone-500 dark:text-[#5a5650]">{progress}%</span>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div 
            className={clsx(
              "flex items-center gap-3 rounded-lg border-[3px] p-2 transition-all duration-150",
              item.completed 
                ? "bg-[#e2dfd7] dark:bg-[#0d0e11] border-stone-400 dark:border-[#181c22] opacity-70"
                : "bg-[#f7f2e8] dark:bg-[#12151a] border-black dark:border-[#1e232a]"
            )} 
            key={item.id}
          >
            <Checkbox checked={item.completed} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, completed: event.target.checked } : entry))} />
            <input 
              className={clsx(
                "min-w-0 flex-1 bg-transparent font-bold outline-none transition-all duration-150",
                item.completed ? "text-stone-500 line-through dark:text-stone-600 font-medium" : "text-black dark:text-[#c8c3ba]"
              )} 
              onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry))} 
              value={item.text} 
            />
            <IconButton danger icon={X} title="Remove item" onClick={() => updateItems(items.filter((entry) => entry.id !== item.id))} />
          </div>
        ))}
        <button className="nb-button action justify-self-start" onClick={() => updateItems([...items, { id: crypto.randomUUID(), text: "New item", completed: false }])} type="button">
          <Plus size={16} /> Item
        </button>
      </div>
    </BlockShell>
  );
}

// ── Code block ──────────────────────────────────────────────────

function CodeBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  return (
    <BlockShell block={block} label="Code">
      <div className="grid gap-2">
        <input className="nb-input h-11 px-3 text-sm font-black" onChange={(event) => void updateBlockContent(block.id, { language: event.target.value })} value={block.content.language ?? ""} />
        <textarea className="min-h-44 rounded-lg border-[3px] border-black bg-[#111] p-4 font-mono text-sm leading-6 text-[#2ef2a6] outline-none shadow-[5px_5px_0_#111] dark:border-[#1e232a] dark:bg-[#0a0c0f] dark:text-[#4dd89a] dark:shadow-[3px_3px_0_#000]" onChange={(event) => void updateBlockContent(block.id, { code: event.target.value })} value={block.content.code ?? ""} />
      </div>
    </BlockShell>
  );
}

// ── Link block ──────────────────────────────────────────────────

function LinkBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  const rawLinks = block.content.links || [];
  const links = rawLinks.length > 0
    ? rawLinks
    : [{ id: "legacy-link", title: block.content.title || "Useful link", url: block.content.url || "https://example.com" }];

  const updateLinks = (nextLinks) => {
    const firstLink = nextLinks[0] || {};
    void updateBlockContent(block.id, {
      links: nextLinks,
      title: firstLink.title || "",
      url: firstLink.url || ""
    });
  };

  return (
    <BlockShell block={block} label="External links">
      <div className="grid gap-4">
        {links.map((link, index) => {
          const embedUrl = getEmbedUrl(link.url);
          return (
            <div
              key={link.id || index}
              className="link-block-item flex flex-col gap-2 rounded-lg border-2 border-black bg-stone-50 p-3 shadow-[2px_2px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[1px_1px_0_#000]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none"
                  onChange={(event) => updateLinks(links.map((item, i) => i === index ? { ...item, title: event.target.value } : item))}
                  placeholder="Link title..."
                  value={link.title ?? ""}
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    className="nb-button primary flex h-9 items-center justify-center px-3 text-xs"
                    href={link.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Link size={12} /> Open
                  </a>
                  {links.length > 1 && (
                    <IconButton
                      danger
                      icon={Trash2}
                      onClick={() => updateLinks(links.filter((_, i) => i !== index))}
                      title="Remove link"
                    />
                  )}
                </div>
              </div>
              <input
                className="nb-input h-9 px-3 text-xs"
                onChange={(event) => updateLinks(links.map((item, i) => i === index ? { ...item, url: event.target.value } : item))}
                placeholder="URL (https://...)"
                value={link.url ?? ""}
              />
              {embedUrl ? (
                <iframe
                  className="mt-2 w-full max-w-[560px] aspect-video h-auto rounded-lg border-[3px] border-black shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:shadow-[3px_3px_0_#000]"
                  src={embedUrl}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
            </div>
          );
        })}
        <button
          className="nb-button action justify-self-start px-3 py-2 text-xs"
          onClick={() => {
            const newId = crypto.randomUUID ? crypto.randomUUID() : `link_${Date.now()}`;
            updateLinks([...links, { id: newId, title: "New link", url: "https://" }]);
          }}
          type="button"
        >
          <Plus size={14} /> Add Link
        </button>
      </div>
    </BlockShell>
  );
}

// ── Image block ─────────────────────────────────────────────────

function ImageBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const startPos = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef(null);

  // Normalize images for backward compatibility
  const images = block.content.images || (block.content.dataUrl ? [{ dataUrl: block.content.dataUrl, name: block.content.name, caption: block.content.caption }] : []);
  const currentImage = images[activeIndex] || {};

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      resetView();
    }
  };

  const handleNext = () => {
    if (activeIndex < images.length - 1) {
      setActiveIndex(activeIndex + 1);
      resetView();
    }
  };

  const handleAddImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newImages = [...images, { dataUrl: ev.target.result, name: file.name, caption: "" }];
      updateBlockContent(block.id, { images: newImages });
      setActiveIndex(newImages.length - 1);
      resetView();
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteImage = () => {
    const newImages = images.filter((_, i) => i !== activeIndex);
    updateBlockContent(block.id, { images: newImages });
    if (activeIndex >= newImages.length) {
      setActiveIndex(Math.max(0, newImages.length - 1));
    }
    resetView();
  };

  const handleWheel = (e) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    setScale((s) => Math.min(Math.max(0.5, s - e.deltaY * 0.005), 5));
  };

  const startDrag = (e) => {
    setIsDragging(true);
    startPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const doDrag = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
  };

  const endDrag = () => setIsDragging(false);

  return (
    <BlockShell block={block} label="Image Gallery">
      <div className="image-block-toolbar mb-3 flex flex-wrap items-center gap-2">
        <button type="button" className="nb-button px-3" onClick={() => setScale((s) => Math.min(s + 0.2, 5))}><ZoomIn size={16} /> Zoom</button>
        <button type="button" className="nb-button px-3" onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))}><ZoomOut size={16} /> Zoom</button>
        <button type="button" className="nb-button px-3" onClick={() => setRotation((r) => r + 90)}><RotateCw size={16} /> Rotate</button>
        <button type="button" className="nb-button px-3" onClick={resetView}><Move size={16} /> Reset</button>
        <button type="button" className="nb-button px-3 bg-[#21caff] dark:bg-[#002535]" onClick={() => setFullscreen(true)}><Maximize2 size={16} /> Fullscreen</button>
        
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="nb-button px-3 action" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={16} /> Add Image
          </button>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAddImage} />
          {images.length > 0 && (
            <button type="button" className="icon-button danger" onClick={handleDeleteImage} title="Delete this image">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {images.length > 1 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-stone-100 p-2 dark:bg-[#12151a]">
          <button type="button" className="icon-button" onClick={handlePrev} disabled={activeIndex === 0}><ArrowLeft size={16} /></button>
          <span className="flex-1 text-center text-sm font-black">Image {activeIndex + 1} of {images.length}</span>
          <button type="button" className="icon-button" onClick={handleNext} disabled={activeIndex === images.length - 1}><ArrowRight size={16} /></button>
        </div>
      )}

      {currentImage.dataUrl ? (
        <ImageCanvas
          alt={currentImage.caption ?? currentImage.name ?? "Workspace image"}
          dataUrl={currentImage.dataUrl}
          doDrag={doDrag}
          endDrag={endDrag}
          handleWheel={handleWheel}
          isDragging={isDragging}
          pan={pan}
          rotation={rotation}
          scale={scale}
          startDrag={startDrag}
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border-[3px] border-dashed border-stone-300 dark:border-[#1e232a]">
          <span className="text-sm font-bold text-stone-500 dark:text-[#7a7670]">No images in this block</span>
        </div>
      )}
      <input 
        className="nb-input mt-1 w-full px-3 py-2 text-sm" 
        onChange={(event) => {
          if (images.length === 0) return;
          const newImages = [...images];
          newImages[activeIndex] = { ...newImages[activeIndex], caption: event.target.value };
          updateBlockContent(block.id, { images: newImages });
        }} 
        placeholder="Caption for current image" 
        value={currentImage.caption ?? ""} 
        disabled={images.length === 0}
      />
      {fullscreen && currentImage.dataUrl ? (
        <div className="modal-backdrop" onClick={() => setFullscreen(false)}>
          <div className="modal-card w-[min(96vw,1100px)] p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="flex-1 min-w-[200px] text-lg font-black">{currentImage.caption || currentImage.name || "Image preview"}</p>
              
              {images.length > 1 && (
                <div className="flex items-center gap-2">
                  <button type="button" className="icon-button" onClick={handlePrev} disabled={activeIndex === 0}><ArrowLeft size={16} /></button>
                  <span className="text-sm font-black w-16 text-center">{activeIndex + 1} / {images.length}</span>
                  <button type="button" className="icon-button" onClick={handleNext} disabled={activeIndex === images.length - 1}><ArrowRight size={16} /></button>
                </div>
              )}

              <button className="icon-button" onClick={() => setFullscreen(false)} type="button"><Minimize2 size={16} /></button>
            </div>
            <ImageCanvas
              alt={currentImage.caption ?? currentImage.name ?? "Workspace image"}
              dataUrl={currentImage.dataUrl}
              doDrag={doDrag}
              endDrag={endDrag}
              fullscreen
              handleWheel={handleWheel}
              isDragging={isDragging}
              pan={pan}
              rotation={rotation}
              scale={scale}
              startDrag={startDrag}
            />
          </div>
        </div>
      ) : null}
    </BlockShell>
  );
}

// ── Image canvas ────────────────────────────────────────────────

function ImageCanvas({ alt, dataUrl, doDrag, endDrag, fullscreen, handleWheel, isDragging, pan, rotation, scale, startDrag }) {
  return (
    <div
      className={clsx(
        "relative mb-3 cursor-grab overflow-hidden rounded-lg border-[4px] border-black bg-[#fff1b8] shadow-[6px_6px_0_#111] active:cursor-grabbing dark:border-[#1e232a] dark:bg-[#0a0c0f] dark:shadow-[4px_4px_0_#000]",
        fullscreen ? "h-[72vh]" : "h-[420px] max-sm:h-[300px]"
      )}
      onMouseDown={startDrag}
      onMouseLeave={endDrag}
      onMouseMove={doDrag}
      onMouseUp={endDrag}
      onTouchEnd={endDrag}
      onTouchMove={(e) => doDrag({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })}
      onTouchStart={(e) => startDrag({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })}
      onWheelCapture={handleWheel}
    >
      <img
        alt={alt}
        className="h-full w-full object-contain pointer-events-none select-none"
        src={dataUrl}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
          transformOrigin: "center",
          transition: isDragging ? "none" : "transform 110ms ease"
        }}
      />
      <div className="absolute bottom-3 left-3 rounded-md border-[3px] border-black bg-white px-2 py-1 text-xs font-black shadow-[3px_3px_0_#111] dark:border-[#1e232a] dark:bg-[#0c0e11] dark:text-[#7a7670] dark:shadow-[2px_2px_0_#000]">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
