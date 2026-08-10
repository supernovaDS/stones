import {
  Command,
  History,
  Repeat,
  Workflow,
  X
} from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { slugify, downloadText } from "../../utils/helpers";

export function CommandPalette({ onClose }) {
  const { activePageId, openTaskModal, pages, setActivePage, setRecurringTasksOpen, setRecoveryOpen, setTheme, setView, theme, view } = useAppStore();
  const [query, setQuery] = useState("");
  const isWorkspace = view === "workspace" && activePageId;
  const normalized = query.trim().toLowerCase();
  const actions = [
    ["/recurring", "Recurring Tasks", Repeat, () => setRecurringTasksOpen(true)],
    ["/recovery", "Recovery & Deletions", History, () => { setRecoveryOpen(true); onClose(); }],
  ].filter(([shortcut, label]) => {
    if (!normalized) return true;
    return shortcut.includes(normalized) || label.toLowerCase().includes(normalized);
  });
  const pageResults = pages
    .filter((page) => !normalized || page.title.toLowerCase().includes(normalized))
    .slice(0, 6);
    
  return (
    <div className="modal-backdrop place-items-start pt-24" onClick={onClose}>
      <section className="modal-card mx-auto max-w-xl p-2" onClick={(e) => e.stopPropagation()}>
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
