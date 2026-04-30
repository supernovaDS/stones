import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bell,
  Brain,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  Command,
  Download,
  ExternalLink,
  FileDown,
  FilePlus,
  History,
  Image,
  Link,
  ListChecks,
  Moon,
  Network,
  PanelRight,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Workflow,
  X
} from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { formatShortDate, isOverdue, isToday, todayIso, toDateInput, toInputDate } from "./utils/date";


const navItems = [
  { id: "workspace", label: "Workspace", icon: Workflow },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "insights", label: "Insights", icon: Activity }
];

const priorityClasses = {
  high: "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200",
  medium: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200",
  low: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200"
};

const priorityRail = {
  high: "border-l-red-500 dark:border-l-red-400",
  medium: "border-l-orange-500 dark:border-l-orange-400",
  low: "border-l-green-500 dark:border-l-green-400"
};

const blockTypeRail = {
  note: "border-l-sky-500 dark:border-l-sky-400",
  checklist: "border-l-purple-500 dark:border-l-purple-400",
  code: "border-l-amber-500 dark:border-l-amber-400",
  link: "border-l-indigo-500 dark:border-l-indigo-400",
  image: "border-l-pink-500 dark:border-l-pink-400",
};

function App() {
  const store = useAppStore();
  const {
    activePageId,
    addChecklistBlock,
    addCodeBlock,
    addImageBlock,
    addLinkBlock,
    addNoteBlock,
    addTaskBlock,
    aiReview,
    aiStatus,
    blocks,
    createPage,
    error,
    initialize,
    loading,
    notification,
    openTodayPage,
    pages,
    quickAddTask,
    setNotification,
    selectedTaskId,
    setActivePage,
    setTheme,
    setView,
    theme,
    undoLastChange,
    undoStack,
    view
  } = store;
  const [quickText, setQuickText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const imageInputRef = useRef(null);

  const activePage = pages.find((page) => page.id === activePageId);
  const tasks = blocks.filter((block) => block.type === "task");
  const openTasks = tasks.filter((task) => !task.metadata.completed);
  const dueToday = openTasks.filter((task) => isToday(task.metadata.deadline));
  const overdue = openTasks.filter((task) => isOverdue(task.metadata.deadline));

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoLastChange]);

  useEffect(() => {
    const checkReminders = () => notifyDueReminders(openTasks, setNotification);
    checkReminders();
    const interval = window.setInterval(checkReminders, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [openTasks, setNotification]);

  const submitQuickAdd = async (event) => {
    event.preventDefault();
    await quickAddTask(quickText);
    setQuickText("");
  };

  const addImage = async (file) => {
    await addImageBlock(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium">
          Loading workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6f2] text-[#171717] dark:bg-[#111814] dark:text-slate-100">
      <div className="fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-[#6fbe44] via-[#ffb45c] to-[#6c63ff]" />
      <div className="grid min-h-screen grid-cols-[300px_1fr] max-lg:grid-cols-1">
        <aside className="border-r border-stone-200 bg-white/90 px-4 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 max-lg:border-b max-lg:border-r-0">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg border border-stone-200 bg-stone-100 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <img alt="Stones logo" className="h-full w-full object-cover" src="/stones_logo.png" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Stones</h1>
              <p className="text-xs text-stone-500 dark:text-slate-400">Task + workspace</p>
            </div>
            <button
              className="ml-auto grid h-9 w-9 place-items-center rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle dark mode"
              type="button"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <nav className="mb-6 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={clsx(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                    view === item.id
                      ? "bg-[#202020] text-white shadow-sm dark:bg-[#8bdc65] dark:text-slate-950"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  )}
                  onClick={() => setView(item.id)}
                  type="button"
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
              Pages
            </p>
          </div>

          <div className="grid gap-1">
            {pages.map((page) => (
              <div key={page.id} className="group relative flex items-center">
                <button
                  className={clsx(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition pr-8",
                    activePageId === page.id && view === "workspace"
                      ? "bg-stone-100 font-semibold text-stone-950 dark:bg-slate-800 dark:text-white"
                      : "text-stone-600 hover:bg-stone-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                  onClick={() => setActivePage(page.id)}
                  type="button"
                >
                  {page.title}
                </button>
                <button
                  className="absolute right-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  onClick={() => void deletePage(page.id)}
                  title="Delete page"
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-stone-200 bg-white text-sm font-medium hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            onClick={() => void createPage()}
            type="button"
          >
            <FilePlus size={16} />
            New Page
          </button>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Metric label="Today" value={dueToday.length.toString()} color="blue" />
            <Metric label="Overdue" value={overdue.length.toString()} color="red" />
          </div>
        </aside>

        <section className="min-w-0 px-6 py-5 max-sm:px-4">
          <header className="sticky top-5 z-10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <p className="text-sm font-medium text-stone-500 dark:text-slate-400">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric"
                })}
              </p>
              <h2 className="text-2xl font-semibold">
                {view === "workspace" ? activePage?.title : viewTitle(view)}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HeaderButton icon={CalendarPlus} label="Today" onClick={() => void openTodayPage()} />
              <HeaderButton icon={Command} label="Menu" onClick={() => setCommandOpen(true)} />
              <HeaderButton
                disabled={!undoStack.length}
                icon={RotateCcw}
                label="Undo"
                onClick={() => void undoLastChange()}
              />
              {view === "workspace" && activePage && (
                <>
                  <HeaderButton icon={Plus} label="Note" onClick={() => void addNoteBlock()} />
                  <HeaderButton icon={ListChecks} label="Checklist" onClick={() => void addChecklistBlock()} />
                  <HeaderButton icon={Link} label="Link" onClick={() => void addLinkBlock()} />
                  <HeaderButton icon={Code2} label="Code" onClick={() => void addCodeBlock()} />
                  <HeaderButton icon={Image} label="Image" onClick={() => imageInputRef.current?.click()} />
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#202020] px-3 text-sm font-medium text-white hover:bg-black dark:bg-[#8bdc65] dark:text-slate-950 dark:hover:bg-[#9bea76]"
                    onClick={() => void addTaskBlock()}
                    type="button"
                  >
                    <Check size={16} />
                    Task
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

          <div className="mb-4 grid grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)] gap-3 max-lg:grid-cols-1">
            <form className="flex rounded-md border border-stone-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" onSubmit={submitQuickAdd}>
              <input
                className="min-w-0 flex-1 rounded-l-md bg-transparent px-3 text-sm outline-none"
                onChange={(event) => setQuickText(event.target.value)}
                placeholder="Quick add: Finish assignment tomorrow high weekly"
                value={quickText}
              />
              <button className="inline-flex h-11 items-center gap-2 rounded-r-md bg-[#202020] px-3 text-sm font-medium text-white dark:bg-[#8bdc65] dark:text-slate-950" type="submit">
                <Plus size={16} />
                Add
              </button>
            </form>
            <label className="flex h-11 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              <Search size={16} />
              <input
                className="min-w-0 flex-1 bg-transparent text-stone-900 outline-none dark:text-white"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search notes, tasks, pages..."
                value={searchQuery}
              />
            </label>
          </div>

          {error ? <Notice tone="red">{error}</Notice> : null}
          {aiStatus ? <Notice tone="sky">{aiStatus}</Notice> : null}
          {notification ? <Notice tone="green">{notification}</Notice> : null}

          {view === "workspace" && activePage ? (
            <WorkspaceView pageId={activePage.id} searchQuery={searchQuery} />
          ) : null}
          {view === "tasks" ? <TaskListView searchQuery={searchQuery} /> : null}
          {view === "calendar" ? <CalendarView searchQuery={searchQuery} /> : null}
          {view === "insights" ? <InsightsView /> : null}
        </section>
      </div>
      {selectedTaskId ? <TaskDetailPanel /> : null}
      {aiReview ? <AiReviewModal /> : null}
      {commandOpen ? <CommandPalette onClose={() => setCommandOpen(false)} /> : null}
    </main>
  );
}


function WorkspaceView({ pageId, searchQuery }) {
  const { blocks, pages, renamePage } = useAppStore();
  const page = pages.find((item) => item.id === pageId);
  const pageBlocks = blocks
    .filter((block) => block.pageId === pageId)
    .filter((block) => blockMatchesSearch(block, searchQuery))
    .sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 grid grid-cols-[1fr_190px] gap-3 max-sm:grid-cols-1">
        <input
          className="w-full bg-transparent text-4xl font-semibold outline-none max-sm:text-3xl"
          onChange={(event) => page && void renamePage(page.id, event.target.value)}
          value={page?.title ?? ""}
        />
      </div>
      <div className="grid gap-3">
        {pageBlocks.map((block) => (
          <BlockCard key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}

function BlockCard({ block }) {
  if (block.type === "task") return <TaskBlock block={block} />;
  if (block.type === "checklist") return <ChecklistBlock block={block} />;
  if (block.type === "code") return <CodeBlock block={block} />;
  if (block.type === "link") return <LinkBlock block={block} />;
  if (block.type === "image") return <ImageBlock block={block} />;
  return <NoteBlock block={block} />;
}

function BlockShell({ block, label, children, actions }) {
  const { deleteBlock, moveBlock } = useAppStore();
  return (
    <article className={clsx("rounded-lg border border-l-4 border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50", blockTypeRail[block.type] ?? "border-l-stone-400 dark:border-l-slate-500")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">{label}</p>
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

function NoteBlock({ block }) {
  const { blocks, convertTextToTask, extractTasksWithAi, setSelectedTask, updateNote } = useAppStore();
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
          <IconButton icon={Brain} title="Extract tasks" onClick={() => void extractTasksWithAi(block.id)} />
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
          className="min-h-32 w-full resize-y bg-transparent text-base leading-7 text-stone-800 outline-none dark:text-slate-100"
          onBlur={() => void updateNote(block.id, draft)}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a note, meeting thought, or rough plan..."
          ref={textareaRef}
          value={draft}
        />
      )}
      {linkedTasks.length ? (
        <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 dark:border-slate-700 dark:bg-slate-950/70">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Linked tasks</p>
          <div className="grid gap-2">
            {linkedTasks.map((task) => (
              <button
                className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-left text-sm font-medium shadow-sm dark:bg-slate-900"
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

function TaskBlock({ block }) {
  const { deleteBlock, setSelectedTask, toggleTask, updateTask, moveBlock } = useAppStore();
  const blocked = useIsBlocked(block);
  return (
    <article className={clsx("rounded-lg border border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50", priorityRail[block.metadata.priority ?? "medium"])}>
      <div className="grid gap-3">
        <div className="flex items-start gap-3">
          <button className="mt-1 text-stone-500 hover:text-stone-950 dark:hover:text-white" onClick={() => void toggleTask(block.id)} title={blocked ? "Blocked by dependencies" : "Toggle task"} type="button">
            {block.metadata.completed ? <Check size={20} /> : <Circle size={20} />}
          </button>
          <input
            className={clsx("min-w-0 flex-1 bg-transparent text-lg font-medium outline-none", block.metadata.completed && "text-stone-400 line-through")}
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
          <select className={clsx("h-9 rounded-md border px-2 text-sm font-medium", priorityClasses[block.metadata.priority ?? "medium"])} onChange={(event) => void updateTask(block.id, { priority: event.target.value })} value={block.metadata.priority ?? "medium"}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(block.id, { deadline: event.target.value })} type="date" value={toDateInput(block.metadata.deadline)} />
          <select className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(block.id, { recurrence: event.target.value })} value={block.metadata.recurrence ?? "none"}>
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
          {block.metadata.recurrence === "custom" ? (
            <label className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950">
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

function ChecklistBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  const items = block.content.items ?? [];
  const updateItems = (nextItems) => void updateBlockContent(block.id, { items: nextItems });
  return (
    <BlockShell block={block} label="Checklist">
      <div className="grid gap-2">
        {items.map((item) => (
          <div className="flex items-center gap-2" key={item.id}>
            <input checked={item.completed} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, completed: event.target.checked } : entry))} type="checkbox" />
            <input className="min-w-0 flex-1 bg-transparent outline-none" onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry))} value={item.text} />
            <IconButton danger icon={X} title="Remove item" onClick={() => updateItems(items.filter((entry) => entry.id !== item.id))} />
          </div>
        ))}
        <button className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-medium dark:border-slate-700" onClick={() => updateItems([...items, { id: crypto.randomUUID(), text: "New item", completed: false }])} type="button">
          <Plus size={16} /> Item
        </button>
      </div>
    </BlockShell>
  );
}

function CodeBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  return (
    <BlockShell block={block} label="Code">
      <div className="grid gap-2">
        <input className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateBlockContent(block.id, { language: event.target.value })} value={block.content.language ?? ""} />
        <textarea className="min-h-44 rounded-md bg-slate-950 p-3 font-mono text-sm leading-6 text-emerald-100 outline-none" onChange={(event) => void updateBlockContent(block.id, { code: event.target.value })} value={block.content.code ?? ""} />
      </div>
    </BlockShell>
  );
}

function LinkBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  return (
    <BlockShell block={block} label="External link">
      <div className="grid gap-2">
        <input className="text-lg font-semibold outline-none dark:bg-transparent" onChange={(event) => void updateBlockContent(block.id, { title: event.target.value })} value={block.content.title ?? ""} />
        <input className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateBlockContent(block.id, { url: event.target.value })} value={block.content.url ?? ""} />
        <a className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-300" href={block.content.url} rel="noreferrer" target="_blank">
          <Link size={16} /> Open link
        </a>
      </div>
    </BlockShell>
  );
}

function ImageBlock({ block }) {
  const { updateBlockContent } = useAppStore();
  return (
    <BlockShell block={block} label="Image">
      {block.content.dataUrl ? <img alt={block.content.caption ?? block.content.name ?? "Workspace image"} className="mb-3 max-h-[420px] w-full rounded-md object-contain" src={block.content.dataUrl} /> : null}
      <input className="w-full bg-transparent text-sm outline-none" onChange={(event) => void updateBlockContent(block.id, { caption: event.target.value })} placeholder="Caption" value={block.content.caption ?? ""} />
    </BlockShell>
  );
}

function TaskListView({ searchQuery }) {
  const { blocks } = useAppStore();
  const [filter, setFilter] = useState("open");
  const [groupMode, setGroupMode] = useState("none");
  const allTasks = blocks.filter((block) => block.type === "task");
  const tasks = allTasks
    .filter((block) => block.type === "task")
    .filter((task) => taskMatchesFilter(task, filter))
    .filter((task) => blockMatchesSearch(task, searchQuery))
    .sort(compareTasksByDate);
  const groups = groupTasks(tasks, groupMode);
  const todayTasks = tasks.filter((task) => isToday(task.metadata.deadline));
  const agendaTasks = (todayTasks.length ? todayTasks : tasks).slice(0, 8);
  const completedCount = allTasks.filter((task) => task.metadata.completed).length;
  const highCount = allTasks.filter((task) => task.metadata.priority === "high" && !task.metadata.completed).length;
  const overdueCount = allTasks.filter((task) => !task.metadata.completed && isOverdue(task.metadata.deadline)).length;

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <div className="grid grid-cols-1 gap-5">

        <section className="grid content-start gap-4">
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
            <InsightCard color="green" label="Completion" value={`${Math.round((completedCount / Math.max(1, allTasks.length)) * 100)}%`} />
            <InsightCard color="orange" label="High Priority" value={highCount.toString()} />
            <InsightCard color="purple" label="Overdue" value={overdueCount.toString()} />
          </div>

          <div className="app-card p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {["open", "today", "overdue", "upcoming", "no-date", "high", "done", "all"].map((item) => (
                <button
                  className={clsx(
                    "rounded-full px-3 py-2 text-sm font-semibold transition",
                    filter === item
                      ? "bg-[#202020] text-white dark:bg-[#8bdc65] dark:text-slate-950"
                      : "bg-[#f2f5ee] text-stone-600 hover:bg-lime-100 dark:bg-slate-800 dark:text-slate-300"
                  )}
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
              <select
                className="ml-auto h-10 rounded-full border border-stone-200 bg-white px-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
                onChange={(event) => setGroupMode(event.target.value)}
                value={groupMode}
              >
                <option value="none">Sort by date</option>
                <option value="day">Group by day</option>
                <option value="week">Group by week</option>
                <option value="month">Group by month</option>
              </select>
            </div>

            <div className="grid gap-4">
              {groups.map((group) => (
                <section key={group.label}>
                  {groupMode !== "none" ? (
                    <h3 className="mb-2 text-sm font-semibold text-stone-500 dark:text-slate-400">
                      {group.label}
                    </h3>
                  ) : null}
                  <div className="grid gap-3">
                    {group.tasks.map((task) => (
                      <TaskListCard key={task.id} task={task} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InsightCard({ color, label, value }) {
  const borderColors = {
    green: "border-l-green-500 dark:border-l-green-400",
    orange: "border-l-red-500 dark:border-l-red-400",
    purple: "border-l-purple-500 dark:border-l-purple-400"
  };
  return (
    <div className={clsx("rounded-lg border border-l-4 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50", borderColors[color])}>
      <p className="text-sm font-semibold text-stone-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-stone-800 dark:text-white">{value}</p>
    </div>
  );
}

function TaskListCard({ task }) {
  const { deleteBlock, setSelectedTask, toggleTask } = useAppStore();
  return (
    <article
      className={clsx(
        "grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-lg border border-l-4 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/50",
        priorityRail[task.metadata.priority ?? "medium"]
      )}
    >
      <button
        className="text-stone-500 hover:text-[#6fbe44] dark:hover:text-[#8bdc65]"
        onClick={() => void toggleTask(task.id)}
        type="button"
      >
        {task.metadata.completed ? <Check size={19} /> : <Circle size={19} />}
      </button>
      <button className="min-w-0 text-left" onClick={() => setSelectedTask(task.id)} type="button">
        <span className={clsx("block truncate font-semibold", task.metadata.completed && "text-stone-400 line-through")}>
          {task.content.title || "Untitled task"}
        </span>
        <span className="text-xs text-stone-500 dark:text-slate-400">
          {task.metadata.priority ?? "medium"} priority - {formatShortDate(task.metadata.deadline)}
        </span>
      </button>
      <span className={clsx("rounded-md border px-2 py-1 text-xs font-semibold", priorityClasses[task.metadata.priority ?? "medium"])}>
        {task.metadata.priority ?? "medium"}
      </span>
      <button
        className="grid h-8 w-8 place-items-center rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        onClick={() => void deleteBlock(task.id)}
        title="Delete task"
        type="button"
      >
        <Trash2 size={15} />
      </button>
    </article>
  );
}


function CalendarView({ searchQuery }) {
  const { blocks, quickAddTask, setSelectedTask } = useAppStore();
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(todayIso());
  const tasks = blocks.filter((block) => block.type === "task").filter((task) => blockMatchesSearch(task, searchQuery));
  const days = getCalendarDays(cursor);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedTasks = tasks.filter((task) => toDateInput(task.metadata.deadline) === selectedDay);

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <button className="icon-button" onClick={() => setCursor(shiftMonth(cursor, -1))} type="button"><ChevronLeft size={16} /></button>
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <button className="icon-button" onClick={() => setCursor(shiftMonth(cursor, 1))} type="button"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-[1fr_320px] gap-4 max-lg:grid-cols-1">
        <section className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div className="text-center text-xs font-semibold text-stone-500" key={day}>{day}</div>)}
          {days.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const dayTasks = tasks.filter((task) => toDateInput(task.metadata.deadline) === key);
            const inMonth = day.getMonth() === cursor.getMonth();
            return (
              <button className={clsx("min-h-24 rounded-lg border p-2 text-left transition", selectedDay === key ? "border-stone-950 bg-stone-950 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-slate-950" : "border-stone-200 bg-white hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800", !inMonth && "opacity-45")} key={key} onClick={() => setSelectedDay(key)} type="button">
                <span className="text-sm font-semibold">{day.getDate()}</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {dayTasks.slice(0, 4).map((task) => <span className={clsx("h-2 w-2 rounded-full", priorityDot(task.metadata.priority))} key={task.id} />)}
                </div>
                {dayTasks.length > 4 ? <p className="mt-1 text-xs">+{dayTasks.length - 4}</p> : null}
              </button>
            );
          })}
        </section>
        <aside className="rounded-lg border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 font-semibold">{formatShortDate(selectedDay)}</h3>
          {selectedDay >= todayIso() && (
            <button className="mb-3 inline-flex h-9 items-center gap-2 rounded-md bg-stone-950 px-3 text-sm font-medium text-white dark:bg-emerald-500 dark:text-slate-950" onClick={() => void quickAddTask(`New task ${selectedDay}`, useAppStore.getState().activePageId)} type="button">
              <Plus size={16} /> Add task for day
            </button>
          )}
          <div className="grid gap-2">
            {selectedTasks.map((task) => <button className="rounded-md border border-stone-200 px-3 py-2 text-left text-sm hover:bg-stone-50 dark:border-slate-700 dark:hover:bg-slate-800" key={task.id} onClick={() => setSelectedTask(task.id)} type="button">{task.content.title}</button>)}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const { deleteBlock, setSelectedTask, toggleTask } = useAppStore();
  return (
    <div className={clsx("grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-l-4 bg-white px-3 py-3 text-left hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800", priorityRail[task.metadata.priority ?? "medium"])}>
      <button onClick={() => void toggleTask(task.id)} type="button">
        {task.metadata.completed ? <Check size={18} /> : <Circle size={18} />}
      </button>
      <span className="min-w-0 flex-1">
        <button className="block text-left text-sm font-medium" onClick={() => setSelectedTask(task.id)} type="button">{task.content.title}</button>
      </span>
      <button className="text-stone-400 hover:text-red-600" onClick={() => void deleteBlock(task.id)} title="Delete task" type="button">
        <Trash2 size={15} />
      </button>
    </div>
  );
}


function InsightsView() {
  const {
    activePageId,
    blocks,
    dismissDeletedItem,
    exportBackup,
    exportPageMarkdown,
    importBackup,
    pages,
    recentlyDeleted,
    restoreDeletedItem,
    setNotification,
    undoLastChange,
    undoStack
  } = useAppStore();
  const fileInputRef = useRef(null);
  const tasks = blocks.filter((block) => block.type === "task");
  const completed = tasks.filter((task) => task.metadata.completed);
  const streak = useMemo(() => calculateStreak(tasks), [tasks]);
  const completionRate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

  const onExport = () => downloadText(`stones-backup-${todayIso()}.json`, JSON.stringify(exportBackup(), null, 2), "application/json");
  const onMarkdownExport = () => {
    const page = pages.find((item) => item.id === activePageId);
    downloadText(`${slugify(page?.title ?? "page")}.md`, exportPageMarkdown(activePageId), "text/markdown");
  };
  const onPdfExport = () => {
    const page = pages.find((item) => item.id === activePageId);
    printPagePdf(page?.title ?? "Stones page", exportPageMarkdown(activePageId));
  };
  const onImport = async (file) => {
    if (!file) return;
    await importBackup(JSON.parse(await file.text()));
  };
  const enableReminders = async () => {
    if (!("Notification" in window)) {
      setNotification("Browser notifications are not supported here.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotification(permission === "granted" ? "Task reminders enabled." : "Reminder permission was not granted.");
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Metric label="Tasks" value={tasks.length.toString()} color="blue" />
        <Metric label="Completed" value={completed.length.toString()} color="green" />
        <Metric label="Rate" value={`${completionRate}%`} color="purple" />
        <Metric label="Streak" value={`${streak}d`} color="orange" />
      </div>
      <section className="rounded-lg border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-base font-semibold">Backup</h3>
        <div className="flex flex-wrap gap-2">
          <HeaderButton icon={Download} label="Export JSON" onClick={onExport} />
          <HeaderButton icon={FileDown} label="Export Markdown" onClick={onMarkdownExport} />
          <HeaderButton icon={Printer} label="Export PDF" onClick={onPdfExport} />
          <HeaderButton icon={Upload} label="Import JSON" onClick={() => fileInputRef.current?.click()} />
          <HeaderButton icon={Bell} label="Enable Reminders" onClick={enableReminders} />
          <HeaderButton disabled={!undoStack.length} icon={RotateCcw} label="Undo Last Change" onClick={() => void undoLastChange()} />
          <input accept="application/json" className="hidden" onChange={(event) => void onImport(event.target.files?.[0])} ref={fileInputRef} type="file" />
        </div>
      </section>
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-base font-semibold">Recovery</h3>
        <div className="grid gap-2">
          {recentlyDeleted.length ? recentlyDeleted.map((item) => (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-stone-200 px-3 py-2 dark:border-slate-700" key={item.id}>
              <History size={16} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
              <span className="text-xs text-stone-500 dark:text-slate-400">{formatShortDate(item.deletedAt)}</span>
              <HeaderButton label="Restore" onClick={() => void restoreDeletedItem(item.id)} />
              <IconButton danger icon={X} title="Dismiss" onClick={() => dismissDeletedItem(item.id)} />
            </div>
          )) : (
            <p className="rounded-md border border-dashed border-stone-200 px-3 py-8 text-center text-sm text-stone-500 dark:border-slate-700">
              Deleted pages and blocks will appear here.
            </p>
          )}
        </div>
      </section>
      <section className="rounded-lg border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-base font-semibold">Recent Completion</h3>
        <div className="grid grid-cols-14 gap-1">
          {Array.from({ length: 42 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (41 - index));
            const key = date.toISOString().slice(0, 10);
            const count = completed.filter((task) => task.metadata.completedAt?.startsWith(key)).length;
            return <div className={clsx("h-7 rounded-sm border border-white/60 dark:border-slate-800", heatColor(count))} key={key} title={`${key}: ${count} completed`} />;
          })}
        </div>
      </section>
    </div>
  );
}

function TaskDetailPanel() {
  const { addSubtask, blocks, deleteSubtask, pages, selectedTaskId, setActivePage, setSelectedTask, setTaskDependencies, toggleTask, updateSubtask, updateTask } = useAppStore();
  const task = blocks.find((block) => block.id === selectedTaskId);
  if (!task || task.type !== "task") return null;
  const page = pages.find((item) => item.id === task.pageId);
  const source = blocks.find((block) => block.id === task.sourceBlockId);
  const otherTasks = blocks.filter((block) => block.type === "task" && block.id !== task.id);
  const dependencies = task.content.dependencyIds ?? [];

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-[400px] max-w-full overflow-auto border-l border-stone-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Task details</p><h3 className="text-lg font-semibold">{page?.title ?? "Workspace"}</h3></div>
        <IconButton icon={X} title="Close details" onClick={() => setSelectedTask(undefined)} />
      </div>
      <div className="grid gap-4">
        <label className="grid gap-1 text-sm font-medium">Title<input className="rounded-md border border-stone-200 bg-white px-3 py-2 font-normal outline-none dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { title: event.target.value })} value={task.content.title} /></label>
        <label className="grid gap-1 text-sm font-medium">Notes<textarea className="min-h-24 rounded-md border border-stone-200 bg-white px-3 py-2 font-normal outline-none dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { notes: event.target.value })} value={task.content.notes ?? ""} /></label>
        <div className="grid grid-cols-2 gap-3">
          <select className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { priority: event.target.value })} value={task.metadata.priority ?? "medium"}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
          <input className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { deadline: event.target.value })} type="datetime-local" value={toInputDate(task.metadata.deadline)} />
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3 max-sm:grid-cols-1">
          <select className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { recurrence: event.target.value })} value={task.metadata.recurrence ?? "none"}><option value="none">No repeat</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom days</option></select>
          <input className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" disabled={task.metadata.recurrence !== "custom"} min="1" onChange={(event) => void updateTask(task.id, { customRecurrenceInterval: event.target.value })} type="number" value={task.metadata.customRecurrenceInterval ?? 1} />
        </div>
        <section className="grid gap-2">
          <h4 className="text-sm font-semibold">Schedule</h4>
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
            <input className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { scheduledDate: event.target.value })} type="date" value={task.metadata.scheduledDate ?? ""} />
            <input className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { scheduledStart: event.target.value })} type="time" value={task.metadata.scheduledStart ?? ""} />
            <input className="rounded-md border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { scheduledEnd: event.target.value })} type="time" value={task.metadata.scheduledEnd ?? ""} />
          </div>
        </section>
        <label className="grid gap-1 text-sm font-medium">
          Reminder
          <input className="rounded-md border border-stone-200 bg-white px-3 py-2 font-normal outline-none dark:border-slate-700 dark:bg-slate-950" onChange={(event) => void updateTask(task.id, { reminderAt: event.target.value })} type="datetime-local" value={toInputDate(task.metadata.reminderAt)} />
        </label>
        <section className="grid gap-2">
          <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Subtasks</h4><button className="text-sm font-medium text-sky-700 dark:text-sky-300" onClick={() => void addSubtask(task.id)} type="button">Add</button></div>
          {(task.content.subtasks ?? []).map((subtask) => (
            <div className="flex items-center gap-2" key={subtask.id}>
              <input checked={subtask.completed} onChange={(event) => void updateSubtask(task.id, subtask.id, { completed: event.target.checked })} type="checkbox" />
              <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" onChange={(event) => void updateSubtask(task.id, subtask.id, { text: event.target.value })} value={subtask.text} />
              <IconButton danger icon={X} title="Delete subtask" onClick={() => void deleteSubtask(task.id, subtask.id)} />
            </div>
          ))}
        </section>
        <section className="grid gap-2">
          <h4 className="text-sm font-semibold">Dependencies</h4>
          <div className="max-h-36 overflow-auto rounded-md border border-stone-200 p-2 dark:border-slate-700">
            {otherTasks.map((candidate) => (
              <label className="flex items-center gap-2 py-1 text-sm" key={candidate.id}>
                <input checked={dependencies.includes(candidate.id)} onChange={(event) => {
                  const next = event.target.checked ? [...dependencies, candidate.id] : dependencies.filter((id) => id !== candidate.id);
                  void setTaskDependencies(task.id, next);
                }} type="checkbox" />
                {candidate.content.title}
              </label>
            ))}
          </div>
        </section>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 text-sm font-medium text-white dark:bg-emerald-500 dark:text-slate-950" onClick={() => void toggleTask(task.id)} type="button"><Check size={16} />{task.metadata.completed ? "Mark Open" : "Mark Complete"}</button>
        {source?.type === "note" ? <div className="rounded-md border border-stone-200 bg-stone-50 p-3 dark:border-slate-700 dark:bg-slate-950"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Source note</p><p className="line-clamp-4 text-sm text-stone-700 dark:text-slate-300">{source.content.text}</p></div> : null}
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-medium dark:border-slate-700" onClick={() => { setActivePage(task.pageId); setSelectedTask(undefined); }} type="button"><Workflow size={16} />Open Page</button>
      </div>
    </aside>
  );
}

function AiReviewModal() {
  const { acceptAiReview, aiReview, dismissAiReview, updateAiDraft } = useAppStore();
  if (!aiReview) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-stone-950/40 p-4">
      <section className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">AI review</p><h3 className="text-lg font-semibold">Review extracted tasks from {aiReview.provider}</h3></div><IconButton icon={X} title="Close review" onClick={dismissAiReview} /></div>
        <div className="grid gap-3">{aiReview.tasks.map((task, index) => <div className="grid gap-2 rounded-md border border-stone-200 p-3 dark:border-slate-700" key={`${task.title}-${index}`}><label className="flex items-center gap-2 text-sm font-medium"><input checked={task.selected} onChange={(event) => updateAiDraft(index, { selected: event.target.checked })} type="checkbox" />Add this task</label><input className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" onChange={(event) => updateAiDraft(index, { title: event.target.value })} value={task.title} /><div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1"><select className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" onChange={(event) => updateAiDraft(index, { priority: event.target.value })} value={task.priority ?? "medium"}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><input className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" onChange={(event) => updateAiDraft(index, { deadline: event.target.value })} type="datetime-local" value={toInputDate(task.deadline) ?? ""} /></div></div>)}</div>
        <div className="mt-4 flex justify-end gap-2"><HeaderButton label="Cancel" onClick={dismissAiReview} /><button className="h-10 rounded-md bg-stone-950 px-3 text-sm font-medium text-white dark:bg-emerald-500 dark:text-slate-950" onClick={() => void acceptAiReview()} type="button">Add Selected</button></div>
      </section>
    </div>
  );
}

function CommandPalette({ onClose }) {
  const { activePageId, addChecklistBlock, addCodeBlock, addLinkBlock, addNoteBlock, addTaskBlock, blocks, exportPageMarkdown, openTodayPage, pages, setActivePage, setSelectedTask, setView, view } = useAppStore();
  const [query, setQuery] = useState("");
  const isWorkspace = view === "workspace" && activePageId;
  const normalized = query.trim().toLowerCase();
  const actions = [
    ...(isWorkspace ? [
      ["/task", "Create task", Check, () => void addTaskBlock()],
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
    <div className="fixed inset-0 z-50 grid place-items-start bg-stone-950/40 p-4 pt-24">
      <section className="mx-auto w-full max-w-xl rounded-lg bg-white p-2 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2 text-stone-500 dark:border-slate-800"><Command size={17} /><input autoFocus className="min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-900 outline-none dark:text-white" onChange={(event) => setQuery(event.target.value)} placeholder="Type /task, /note, or search pages and tasks..." value={query} /><button className="grid h-8 w-8 place-items-center rounded-md hover:bg-stone-100 dark:hover:bg-slate-800" onClick={onClose} type="button"><X size={16} /></button></div>
        <div className="max-h-[60vh] overflow-auto p-2">
          <CommandGroup label="Commands">
            {actions.map(([shortcut, label, Icon, run]) => <button className="flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-medium hover:bg-stone-100 dark:hover:bg-slate-800" key={shortcut} onClick={() => { run(); onClose(); }} type="button"><Icon size={16} /><span className="min-w-0 flex-1">{label}</span><span className="font-mono text-xs text-stone-400">{shortcut}</span></button>)}
          </CommandGroup>
          <CommandGroup label="Pages">
            {pageResults.map((page) => <button className="flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-stone-100 dark:hover:bg-slate-800" key={page.id} onClick={() => { setActivePage(page.id); onClose(); }} type="button"><Workflow size={15} />{page.title}</button>)}
          </CommandGroup>
          <CommandGroup label="Tasks">
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
      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">{label}</p>
      <div className="grid gap-1">{items}</div>
    </section>
  );
}

function HeaderButton({ disabled, icon: Icon, label, onClick }) {
  return <button className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" disabled={disabled} onClick={onClick} type="button">{Icon ? <Icon size={16} /> : null}{label}</button>;
}

function IconButton({ danger, icon: Icon, onClick, title }) {
  return <button className={clsx("icon-button", danger && "danger")} onClick={onClick} title={title} type="button"><Icon size={16} /></button>;
}

function Metric({ label, value, color }) {
  const borderColors = {
    green: "border-l-green-500 dark:border-l-green-400",
    orange: "border-l-orange-500 dark:border-l-orange-400",
    red: "border-l-red-500 dark:border-l-red-400",
    blue: "border-l-sky-500 dark:border-l-sky-400",
    purple: "border-l-purple-500 dark:border-l-purple-400",
    pink: "border-l-pink-500 dark:border-l-pink-400",
    teal: "border-l-teal-500 dark:border-l-teal-400"
  };
  return (
    <div className={clsx("rounded-lg border border-l-4 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/50", color ? borderColors[color] : "border-l-stone-300 dark:border-l-slate-600")}>
      <p className="text-xs font-medium text-stone-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-800 dark:text-white">{value}</p>
    </div>
  );
}

function Notice({ children, tone }) {
  let classes = "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200";
  if (tone === "red") classes = "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";
  if (tone === "green") classes = "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  return <div className={clsx("mb-4 rounded-md border px-4 py-3 text-sm", classes)}>{children}</div>;
}

function Badge({ children, tone }) {
  return <span className={clsx("inline-flex h-9 items-center gap-1 rounded-md border px-2 text-xs font-medium", tone === "red" ? "border-red-200 text-red-700 dark:border-red-700 dark:text-red-200" : "border-stone-200 text-stone-500 dark:border-slate-700 dark:text-slate-300")}>{children}</span>;
}

function useIsBlocked(task) {
  const blocks = useAppStore((state) => state.blocks);
  return (task.content.dependencyIds ?? []).some((id) => {
    const dependency = blocks.find((block) => block.id === id);
    return dependency?.type === "task" && !dependency.metadata.completed;
  });
}

function taskMatchesFilter(task, filter) {
  if (filter === "open") return !task.metadata.completed;
  if (filter === "done") return task.metadata.completed;
  if (filter === "today") return isToday(task.metadata.deadline);
  if (filter === "overdue") return !task.metadata.completed && isOverdue(task.metadata.deadline);
  if (filter === "upcoming") return !task.metadata.completed && task.metadata.deadline && task.metadata.deadline > todayIso();
  if (filter === "no-date") return !task.metadata.completed && !task.metadata.deadline;
  if (filter === "high") return task.metadata.priority === "high";
  return true;
}

function compareTasksByDate(a, b) {
  if (!a.metadata.deadline && !b.metadata.deadline) return 0;
  if (!a.metadata.deadline) return 1;
  if (!b.metadata.deadline) return -1;
  return a.metadata.deadline.localeCompare(b.metadata.deadline);
}

function groupTasks(tasks, mode) {
  if (mode === "none") return [{ label: "Tasks", tasks }];
  const groups = new Map();
  for (const task of tasks) {
    const label = groupLabel(task.metadata.deadline, mode);
    groups.set(label, [...(groups.get(label) ?? []), task]);
  }
  return [...groups.entries()].map(([label, groupTasksValue]) => ({ label, tasks: groupTasksValue }));
}

function groupLabel(deadline, mode) {
  if (!deadline) return "No date";
  const date = new Date(`${deadline}T00:00:00`);
  if (mode === "day") return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (mode === "week") {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return `Week of ${formatShortDate(start.toISOString().slice(0, 10))}`;
  }
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function blockMatchesSearch(block, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const content = {
    task: `${block.content.title} ${block.content.notes ?? ""}`,
    note: block.content.text,
    checklist: (block.content.items ?? []).map((item) => item.text).join(" "),
    code: `${block.content.language} ${block.content.code}`,
    link: `${block.content.title} ${block.content.url}`,
    image: `${block.content.name} ${block.content.caption}`
  }[block.type] ?? "";
  return content.toLowerCase().includes(normalized);
}

function MarkdownPreview({ text }) {
  const lines = text.split(/\r?\n/);
  return (
    <div className="min-h-32 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-7 text-stone-800 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
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
      parts.push(<code className="rounded bg-stone-200 px-1 py-0.5 text-xs dark:bg-slate-800" key={`${token}-${match.index}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[[")) {
      parts.push(<span className="rounded bg-lime-100 px-1 font-medium text-lime-800 dark:bg-emerald-950 dark:text-emerald-200" key={`${token}-${match.index}`}>{token}</span>);
    } else {
      const label = token.match(/^\[([^\]]+)\]/)?.[1] ?? token;
      const href = token.match(/\(([^)]+)\)$/)?.[1] ?? "#";
      parts.push(<a className="font-medium text-sky-700 dark:text-sky-300" href={href} key={`${token}-${match.index}`} rel="noreferrer" target="_blank">{label}</a>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function extractInternalLinks(text) {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim()).filter(Boolean);
}





function getCalendarDays(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getMiniWeek() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return {
      iso: day.toISOString().slice(0, 10),
      day: day.getDate(),
      weekday: day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3)
    };
  });
}

function priorityDot(priority) {
  if (priority === "high") return "bg-[#ff9f43]";
  if (priority === "low") return "bg-[#6c63ff]";
  return "bg-[#6fbe44]";
}

function heatColor(count) {
  if (count === 0) return "bg-[#eef2ea] dark:bg-slate-800";
  if (count === 1) return "bg-[#dff8d4]";
  if (count === 2) return "bg-[#8bdc65]";
  if (count === 3) return "bg-[#ffb45c]";
  return "bg-[#8f75ff]";
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function notifyDueReminders(tasks, setNotification) {
  const now = Date.now();
  const firedKey = "stones-fired-reminders";
  const fired = new Set(JSON.parse(localStorage.getItem(firedKey) ?? "[]"));
  let changed = false;

  for (const task of tasks) {
    if (!task.metadata.reminderAt || fired.has(task.id)) continue;
    const due = new Date(task.metadata.reminderAt).getTime();
    if (Number.isNaN(due) || due > now) continue;

    const title = task.content.title || "Task reminder";
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Stones reminder", {
        body: title,
        icon: "/stones_logo.png"
      });
    } else {
      setNotification(`Reminder: ${title}`);
    }
    fired.add(task.id);
    changed = true;
  }

  if (changed) {
    localStorage.setItem(firedKey, JSON.stringify([...fired].slice(-200)));
  }
}

function printPagePdf(title, markdown) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  const body = markdown
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("- [")) return `<p>${escapeHtml(line)}</p>`;
      if (!line.trim()) return "<br />";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Inter,Arial,sans-serif;max-width:760px;margin:48px auto;color:#171717;line-height:1.55}h1{font-size:32px}p{font-size:14px}</style></head><body>${body}<script>window.onload=()=>window.print()</script></body></html>`);
  printWindow.document.close();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function viewTitle(view) {
  if (view === "tasks") return "Task list";
  if (view === "calendar") return "Calendar";
  if (view === "insights") return "Insights";
  return "Workspace";
}

function calculateStreak(tasks) {
  const completedDays = new Set(tasks.map((task) => task.metadata.completedAt?.slice(0, 10)).filter(Boolean));
  let streak = 0;
  const cursor = new Date();
  while (completedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default App;
