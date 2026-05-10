import {
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  Circle,
  Code2,
  Link,
  Maximize2,
  Minimize2,
  Move,
  PanelRight,
  Plus,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut
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
  return <NoteBlock block={block} />;
}

// ── Block shell ─────────────────────────────────────────────────

function BlockShell({ block, label, children, actions }) {
  const { deleteBlock, moveBlock } = useAppStore();
  return (
    <article className={clsx("bento-card h-full border-l-[10px] p-4", blockTypeRail[block.type] ?? "border-l-stone-400")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-stone-700 dark:text-slate-200">{label}</p>
        <div className="flex flex-wrap gap-2">
          <IconButton icon={ArrowUp} title="Move up" onClick={() => void moveBlock(block.id, "up")} />
          <IconButton icon={ArrowDown} title="Move down" onClick={() => void moveBlock(block.id, "down")} />
          {actions}
          <IconButton danger icon={Trash2} title="Delete block" onClick={() => void deleteBlock(block.id)} />
        </div>
      </div>
      {children}
    </article>
  );
}

// ── Note block ──────────────────────────────────────────────────

function NoteBlock({ block }) {
  const { blocks, convertTextToTask, setSelectedTask, updateNote } = useAppStore();
  const [draft, setDraft] = useState(block.content.text ?? "");
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef(null);
  const linkedTasks = blocks.filter((task) => task.type === "task" && task.sourceBlockId === block.id);

  useEffect(() => {
    setDraft(block.content.text ?? "");
  }, [block.id, block.content.text]);

  const formatSelection = (wrapper, suffix = wrapper) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.slice(start, end) || "text";
    const next = `${draft.slice(0, start)}${wrapper}${selected}${suffix}${draft.slice(end)}`;
    setDraft(next);
    void updateNote(block.id, next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + wrapper.length, start + wrapper.length + selected.length);
    });
  };

  const convertSelection = () => {
    const textarea = textareaRef.current;
    const selected = textarea
      ? draft.slice(textarea.selectionStart, textarea.selectionEnd)
      : "";
    void convertTextToTask(block.id, selected || draft.split("\n")[0]);
  };

  return (
    <BlockShell
      block={block}
      label="Note"
      actions={
        <>
          <IconButton icon={Sparkles} title="Convert selection to task" onClick={convertSelection} />
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="rich-button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatSelection("**")} type="button">B</button>
        <button className="rich-button italic" onMouseDown={(e) => e.preventDefault()} onClick={() => formatSelection("_")} type="button">I</button>
        <button className="rich-button font-mono" onMouseDown={(e) => e.preventDefault()} onClick={() => formatSelection("`")} type="button">`</button>
        <button className="rich-button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatSelection("- ", "")} type="button">List</button>
        <button className="rich-button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatSelection("[", "](https://)")} type="button">Link</button>
        <button className="rich-button ml-auto" onClick={() => setPreview((value) => !value)} type="button">
          {preview ? "Edit" : "Preview"}
        </button>
      </div>
      {preview ? (
        <MarkdownPreview text={draft} />
      ) : (
        <textarea
          className="nb-textarea min-h-36 w-full resize-y px-4 py-3 text-base leading-7"
          onBlur={() => void updateNote(block.id, draft)}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a note, meeting thought, or rough plan..."
          ref={textareaRef}
          value={draft}
        />
      )}
      {linkedTasks.length ? (
        <div className="mt-4 rounded-lg border-[3px] border-black bg-[#f1f5ff] p-3 shadow-[4px_4px_0_#111] dark:border-white dark:bg-[#202020] dark:shadow-[4px_4px_0_#fff]">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-stone-700 dark:text-slate-200">Linked tasks</p>
          <div className="grid gap-2">
            {linkedTasks.map((task) => (
              <button
                className="nb-button justify-between bg-white text-left"
                key={task.id}
                onClick={() => setSelectedTask(task.id)}
                type="button"
              >
                <span className={clsx("truncate", task.metadata.completed && "text-stone-400 line-through")}>{task.content.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </BlockShell>
  );
}

// ── Task block ──────────────────────────────────────────────────

function TaskBlock({ block }) {
  const { deleteBlock, setSelectedTask, toggleTask, updateTask, moveBlock } = useAppStore();
  const blocked = useIsBlocked(block);
  return (
    <article className={clsx("bento-card h-full border-l-[10px] p-4", priorityRail[block.metadata.priority ?? "medium"])}>
      <div className="grid gap-3">
        <div className="flex items-start gap-3">
          <Checkbox checked={block.metadata.completed} onChange={() => void toggleTask(block.id)} className="mt-1" />
          <input
            className={clsx("min-w-0 flex-1 bg-transparent text-xl font-black outline-none", block.metadata.completed && "text-stone-400 line-through")}
            onChange={(event) => void updateTask(block.id, { title: event.target.value })}
            placeholder="Task title"
            value={block.content.title}
          />
          <IconButton icon={ArrowUp} title="Move up" onClick={() => void moveBlock(block.id, "up")} />
          <IconButton icon={ArrowDown} title="Move down" onClick={() => void moveBlock(block.id, "down")} />
          <IconButton icon={PanelRight} title="Open details" onClick={() => setSelectedTask(block.id)} />
          <IconButton danger icon={Trash2} title="Delete task" onClick={() => void deleteBlock(block.id)} />
        </div>
        <div className="flex flex-wrap gap-2 pl-8">
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
          {blocked ? <Badge tone="red">Blocked</Badge> : null}
          {block.sourceBlockId ? <Badge>Linked note</Badge> : null}
          {block.metadata.scheduledDate ? <Badge>{block.metadata.scheduledStart ?? "Scheduled"}</Badge> : null}
          {block.metadata.reminderAt ? <Badge><Bell size={13} /> {formatShortDate(block.metadata.reminderAt)}</Badge> : null}
        </div>
      </div>
    </article>
  );
}

// ── Checklist block ─────────────────────────────────────────────

function ChecklistBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  const items = block.content.items ?? [];
  const updateItems = (nextItems) => void updateBlockContent(block.id, { items: nextItems });
  return (
    <BlockShell block={block} label="Checklist">
      <div className="grid gap-2">
        {items.map((item) => (
          <div className="flex items-center gap-3 rounded-lg border-[3px] border-black bg-[#f7f2e8] p-2 dark:border-white dark:bg-[#202020]" key={item.id}>
            <Checkbox checked={item.completed} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, completed: event.target.checked } : entry))} />
            <input className="min-w-0 flex-1 bg-transparent font-bold outline-none" onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry))} value={item.text} />
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
        <textarea className="min-h-44 rounded-lg border-[3px] border-black bg-[#111] p-4 font-mono text-sm leading-6 text-[#2ef2a6] outline-none shadow-[5px_5px_0_#111] dark:border-white dark:shadow-[5px_5px_0_#fff]" onChange={(event) => void updateBlockContent(block.id, { code: event.target.value })} value={block.content.code ?? ""} />
      </div>
    </BlockShell>
  );
}

// ── Link block ──────────────────────────────────────────────────

function LinkBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  const embedUrl = getEmbedUrl(block.content.url);
  
  return (
    <BlockShell block={block} label="External link">
      <div className="grid gap-2">
        <input className="bg-transparent text-xl font-black outline-none" onChange={(event) => void updateBlockContent(block.id, { title: event.target.value })} value={block.content.title ?? ""} />
        <input className="nb-input px-3 py-2 text-sm" onChange={(event) => void updateBlockContent(block.id, { url: event.target.value })} value={block.content.url ?? ""} />
        <a className="nb-button primary justify-self-start" href={block.content.url} rel="noreferrer" target="_blank">
          <Link size={16} /> Open link
        </a>
        {embedUrl ? (
          <iframe
            className="mt-2 w-full max-w-[560px] aspect-video h-auto rounded-lg border-[3px] border-black shadow-[4px_4px_0_#111] dark:border-white dark:shadow-[4px_4px_0_#fff]"
            src={embedUrl}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : null}
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
  const startPos = useRef({ x: 0, y: 0 });

  const handleWheel = (e) => {
    if (!e.shiftKey && !e.ctrlKey && !e.altKey) return;
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
    <BlockShell block={block} label="Image">
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="rich-button" onClick={() => setScale((s) => Math.min(s + 0.2, 5))}><ZoomIn size={14} /> Zoom</button>
        <button type="button" className="rich-button" onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))}><ZoomOut size={14} /> Zoom</button>
        <button type="button" className="rich-button" onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}><Move size={14} /> Reset</button>
        <button type="button" className="rich-button bg-[#21caff]" onClick={() => setFullscreen(true)}><Maximize2 size={14} /> Fullscreen</button>
        <span className="self-center text-xs font-bold text-stone-600 dark:text-slate-300">Scroll with Shift/Ctrl to zoom. Drag to pan.</span>
      </div>
      {block.content.dataUrl ? (
        <ImageCanvas
          alt={block.content.caption ?? block.content.name ?? "Workspace image"}
          dataUrl={block.content.dataUrl}
          doDrag={doDrag}
          endDrag={endDrag}
          handleWheel={handleWheel}
          isDragging={isDragging}
          pan={pan}
          scale={scale}
          startDrag={startDrag}
        />
      ) : null}
      <input className="nb-input mt-1 w-full px-3 py-2 text-sm" onChange={(event) => void updateBlockContent(block.id, { caption: event.target.value })} placeholder="Caption" value={block.content.caption ?? ""} />
      {fullscreen && block.content.dataUrl ? (
        <div className="modal-backdrop" onClick={() => setFullscreen(false)}>
          <div className="modal-card w-[min(96vw,1100px)] p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-lg font-black">{block.content.caption || block.content.name || "Image preview"}</p>
              <button className="icon-button" onClick={() => setFullscreen(false)} type="button"><Minimize2 size={16} /></button>
            </div>
            <ImageCanvas
              alt={block.content.caption ?? block.content.name ?? "Workspace image"}
              dataUrl={block.content.dataUrl}
              doDrag={doDrag}
              endDrag={endDrag}
              fullscreen
              handleWheel={handleWheel}
              isDragging={isDragging}
              pan={pan}
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

function ImageCanvas({ alt, dataUrl, doDrag, endDrag, fullscreen, handleWheel, isDragging, pan, scale, startDrag }) {
  return (
    <div
      className={clsx(
        "relative mb-3 cursor-grab overflow-hidden rounded-lg border-[4px] border-black bg-[#fff1b8] shadow-[6px_6px_0_#111] active:cursor-grabbing dark:border-white dark:bg-[#202020] dark:shadow-[6px_6px_0_#fff]",
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
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: "center",
          transition: isDragging ? "none" : "transform 110ms ease"
        }}
      />
      <div className="absolute bottom-3 left-3 rounded-md border-[3px] border-black bg-white px-2 py-1 text-xs font-black shadow-[3px_3px_0_#111] dark:border-white dark:bg-[#151515] dark:shadow-[3px_3px_0_#fff]">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

// ── Markdown preview ────────────────────────────────────────────

function MarkdownPreview({ text }) {
  const lines = text.split(/\r?\n/);
  return (
    <div className="nb-textarea min-h-36 p-4 text-sm font-bold leading-7">
      {lines.map((line, index) => {
        if (!line.trim()) return <div className="h-4" key={index} />;
        if (line.startsWith("### ")) return <h4 className="text-base font-semibold" key={index}>{renderInlineMarkdown(line.slice(4))}</h4>;
        if (line.startsWith("## ")) return <h3 className="text-lg font-semibold" key={index}>{renderInlineMarkdown(line.slice(3))}</h3>;
        if (line.startsWith("# ")) return <h2 className="text-xl font-semibold" key={index}>{renderInlineMarkdown(line.slice(2))}</h2>;
        if (line.startsWith("- ")) return <p className="pl-4" key={index}>- {renderInlineMarkdown(line.slice(2))}</p>;
        return <p key={index}>{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text) {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[\[[^\]]+\]\])/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("_")) {
      parts.push(<em key={`${token}-${match.index}`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code className="rounded border-2 border-black bg-[#ffdc4a] px-1 py-0.5 text-xs text-black" key={`${token}-${match.index}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[[")) {
      parts.push(<span className="rounded border-2 border-black bg-[#2ef2a6] px-1 font-black text-black" key={`${token}-${match.index}`}>{token}</span>);
    } else {
      const label = token.match(/^\[([^\]]+)\]/)?.[1] ?? token;
      const href = token.match(/\(([^)]+)\)$/)?.[1] ?? "#";
      parts.push(<a className="font-black underline decoration-[3px]" href={href} key={`${token}-${match.index}`} rel="noreferrer" target="_blank">{label}</a>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
