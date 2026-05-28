import {
  CalendarDays,
  CalendarPlus,
  Check,
  Code2,
  Command,
  FileDown,
  Heading,
  Link,
  ListChecks,
  Plus,
  Workflow,
  X,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate, toInputDate } from "../../utils/date";
import { slugify, downloadText } from "../../utils/helpers";
import { IconButton, Checkbox } from "../ui";

// ── Task detail panel ───────────────────────────────────────────

export function TaskDetailPanel() {
  const { addSubtask, blocks, deleteSubtask, pages, selectedTaskId, setActivePage, setSelectedTask, setTaskDependencies, toggleTask, toggleFailTask, updateSubtask, updateTask } = useAppStore();
  const task = blocks.find((block) => block.id === selectedTaskId);
  if (!task || task.type !== "task") return null;
  const page = pages.find((item) => item.id === task.pageId);
  const source = blocks.find((block) => block.id === task.sourceBlockId);
  const otherTasks = blocks.filter((block) => block.type === "task" && block.id !== task.id);
  const dependencies = task.content.dependencyIds ?? [];

  return (
    <aside className="task-detail-panel fixed inset-y-0 right-0 z-30 w-[430px] max-w-full overflow-auto border-l-[3px] border-black bg-[#fff7e8] p-5 shadow-[-4px_0_0_#111] dark:border-[#1e232a] dark:bg-[#0c0e11] dark:shadow-[-3px_0_0_#000]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-stone-600 dark:text-[#7a7670]">Task details</p><h3 className="truncate text-xl font-black">{page?.title ?? "Workspace"}</h3></div>
        <IconButton icon={X} title="Close details" onClick={() => setSelectedTask(undefined)} />
      </div>
      <div className="grid gap-4">
        <label className="grid gap-1 text-sm font-black">Title<input className="nb-input w-full px-3 py-2 font-bold" onChange={(event) => void updateTask(task.id, { title: event.target.value })} value={task.content.title} /></label>
        <label className="grid gap-1 text-sm font-black">Notes<textarea className="nb-textarea w-full min-h-24 px-3 py-2 font-bold" onChange={(event) => void updateTask(task.id, { notes: event.target.value })} value={task.content.notes ?? ""} /></label>
        <label className="grid gap-1 text-sm font-black">
          Priority
          <select className="nb-select w-full px-3 py-2 font-bold" onChange={(event) => void updateTask(task.id, { priority: event.target.value })} value={task.metadata.priority ?? "medium"}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        </label>
        <label className="grid gap-1 text-sm font-black">
          Deadline
          <input className="nb-input w-full px-3 py-2 font-bold" onChange={(event) => void updateTask(task.id, { deadline: event.target.value })} type="datetime-local" value={toInputDate(task.metadata.deadline)} />
        </label>

        <label className="grid gap-1 text-sm font-black">
          Reminder
          <input className="nb-input w-full px-3 py-2 font-bold" onChange={(event) => void updateTask(task.id, { reminderAt: event.target.value })} type="datetime-local" value={toInputDate(task.metadata.reminderAt)} />
        </label>
        <section className="grid gap-2">
          <div className="flex items-center justify-between"><h4 className="text-sm font-black">Subtasks</h4><button className="nb-button min-h-0 px-3 py-1 text-xs" onClick={() => void addSubtask(task.id)} type="button">Add</button></div>
          {(task.content.subtasks ?? []).map((subtask) => (
            <div className="flex items-center gap-2" key={subtask.id}>
              <Checkbox checked={subtask.completed} onChange={(event) => void updateSubtask(task.id, subtask.id, { completed: event.target.checked })} />
              <input className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" onChange={(event) => void updateSubtask(task.id, subtask.id, { text: event.target.value })} value={subtask.text} />
              <IconButton danger icon={X} title="Delete subtask" onClick={() => void deleteSubtask(task.id, subtask.id)} />
            </div>
          ))}
        </section>
        <section className="grid gap-2">
          <h4 className="text-sm font-black">Dependencies</h4>
          <div className="max-h-36 overflow-auto rounded-lg border-[3px] border-black bg-white p-2 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]">
            {otherTasks.map((candidate) => (
              <label className="flex items-center gap-2 py-1 text-sm" key={candidate.id}>
                <Checkbox checked={dependencies.includes(candidate.id)} onChange={(event) => {
                  const next = event.target.checked ? [...dependencies, candidate.id] : dependencies.filter((id) => id !== candidate.id);
                  void setTaskDependencies(task.id, next);
                }} />
                {candidate.content.title}
              </label>
            ))}
          </div>
        </section>
        <div className="flex gap-2">
          <button className="nb-button action flex-1" onClick={() => void toggleTask(task.id)} type="button"><Check size={16} />{task.metadata.completed ? "Mark Open" : "Mark Complete"}</button>
          <button className="nb-button flex-1" onClick={() => void toggleFailTask(task.id)} type="button"><XCircle size={16} />{task.metadata.failed ? "Unfail Task" : "Fail Task"}</button>
        </div>
        {source?.type === "note" ? <div className="rounded-lg border-[3px] border-black bg-[#fff1b8] p-3 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]"><p className="mb-1 text-xs font-black uppercase tracking-wide text-stone-600 dark:text-[#7a7670]">Source note</p><p className="line-clamp-4 text-sm font-bold text-stone-700 dark:text-[#7a7670]">{source.content.text}</p></div> : null}
        {task.pageId !== "system-calendar" && (
          <button className="nb-button" onClick={() => { setActivePage(task.pageId); setSelectedTask(undefined); }} type="button"><Workflow size={16} />Open Page</button>
        )}
      </div>
    </aside>
  );
}

// ── Task modal ──────────────────────────────────────────────────

export function TaskModal({ initialParams, onClose, onSubmit }) {
  const [title, setTitle] = useState(initialParams?.title ?? "");
  const [notes, setNotes] = useState(initialParams?.notes ?? "");
  const [priority, setPriority] = useState(initialParams?.priority ?? "medium");
  const [deadline, setDeadline] = useState(initialParams?.deadline ?? "");
  const [time, setTime] = useState(initialParams?.time ?? "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        notes: notes.trim(),
        priority,
        deadline: deadline ? (time ? `${deadline}T${time}` : `${deadline}T23:59`) : undefined,
        pageId: initialParams?.pageId,
        sourceBlockId: initialParams?.sourceBlockId
      });
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card p-6">
        <h3 className="mb-4 text-3xl font-black">New Task</h3>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1 text-sm font-black">
            Title
            <input autoFocus className="nb-input px-3 py-2 font-bold" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-black">
            Description (optional)
            <textarea className="nb-textarea min-h-[90px] px-3 py-2 font-bold" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <label className="grid gap-1 text-sm font-black">
              Priority
              <select className="nb-select px-3 py-2 font-bold" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black">
              Deadline
              <input type="date" className="nb-input px-3 py-2 font-bold" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </label>
            <label className="col-span-2 grid gap-1 text-sm font-black max-sm:col-span-1">
              Time (optional)
              <input type="time" className="nb-input px-3 py-2 font-bold" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="nb-button flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="nb-button action flex-1">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Command palette ─────────────────────────────────────────────

export function CommandPalette({ onClose }) {
  const { activePageId, addTitleBlock, addChecklistBlock, addCodeBlock, addLinkBlock, addNoteBlock, blocks, exportPageMarkdown, openTaskModal, openTodayPage, pages, setActivePage, setSelectedTask, setView, view } = useAppStore();
  const [query, setQuery] = useState("");
  const isWorkspace = view === "workspace" && activePageId;
  const normalized = query.trim().toLowerCase();
  const actions = [
    ...(isWorkspace ? [
      ["/heading", "Create section heading", Heading, () => void addTitleBlock()],
      ["/task", "Create task", Check, () => void openTaskModal()],
      ["/note", "Create note", Plus, () => void addNoteBlock()],
      ["/checklist", "Create checklist", ListChecks, () => void addChecklistBlock()],
      ["/link", "Create link", Link, () => void addLinkBlock()],
      ["/code", "Create code block", Code2, () => void addCodeBlock()],
      ["/export", "Export page as Markdown", FileDown, () => {
        const page = pages.find((item) => item.id === activePageId);
        downloadText(`${slugify(page?.title ?? "page")}.md`, exportPageMarkdown(activePageId), "text/markdown");
      }]
    ] : []),
    ["/today", "Open today page", CalendarPlus, () => void openTodayPage()],
    ["/calendar", "Go to calendar", CalendarDays, () => setView("calendar")]
  ].filter(([shortcut, label]) => {
    if (!normalized) return true;
    return shortcut.includes(normalized) || label.toLowerCase().includes(normalized);
  });
  const pageResults = pages
    .filter((page) => !normalized || page.title.toLowerCase().includes(normalized))
    .slice(0, 6);
  const taskResults = blocks
    .filter((block) => block.type === "task")
    .filter((task) => !normalized || task.content.title.toLowerCase().includes(normalized))
    .slice(0, 6);
  return (
    <div className="modal-backdrop place-items-start pt-24">
      <section className="modal-card mx-auto max-w-xl p-2">
        <div className="flex items-center gap-2 border-b-[4px] border-black px-3 py-3 text-stone-600 dark:border-[#1e232a] dark:text-[#7a7670]"><Command size={18} /><input autoFocus className="min-w-0 flex-1 bg-transparent text-sm font-black text-stone-900 outline-none dark:text-[#c8c3ba]" onChange={(event) => setQuery(event.target.value)} placeholder="Type /note, or search pages..." value={query} /><button className="icon-button" onClick={onClose} type="button"><X size={16} /></button></div>
        <div className="max-h-[60vh] overflow-auto p-2">
          <CommandGroup label="Commands">
            {actions.map(([shortcut, label, Icon, run]) => <button className="nb-button justify-start bg-white text-left dark:bg-[#12151a]" key={shortcut} onClick={() => { run(); onClose(); }} type="button"><Icon size={16} /><span className="min-w-0 flex-1">{label}</span><span className="kbd">{shortcut}</span></button>)}
          </CommandGroup>
          <CommandGroup label="Pages">
            {pageResults.map((page) => <button className="nb-button justify-start bg-white text-left dark:bg-[#12151a]" key={page.id} onClick={() => { setActivePage(page.id); onClose(); }} type="button"><Workflow size={15} />{page.title}</button>)}
          </CommandGroup>
        </div>
      </section>
    </div>
  );
}

function CommandGroup({ children, label }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  if (!items || (Array.isArray(items) && items.length === 0)) return null;
  return (
    <section className="mb-2">
      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-[#5a5650]">{label}</p>
      <div className="grid gap-1">{items}</div>
    </section>
  );
}

export { SettingsModal } from "./SettingsModal";
export { RecurringTasksModal } from "./RecurringTasksModal";
