import { clsx } from "clsx";
import { FilePlus, Moon, Sun, Trash2, Settings, X } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { navItems } from "../../utils/constants";
import { Metric } from "../ui";

export function Sidebar({ dueToday, overdue, isOpen, onClose }) {
  const {
    activePageId,
    createPage,
    deletePage,
    pages,
    setActivePage,
    setTheme,
    setView,
    setSettingsOpen,
    theme,
    view,
    colorProfile
  } = useAppStore();

  const handleNav = (action) => {
    action();
    onClose?.();
  };

  const sortedPages = [...pages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <aside aria-label="Workspace navigation" className={clsx("sidebar-shell", isOpen && "sidebar-open")}>
      <div className="border-b-4 border-black bg-[#ffdc4a] p-4 dark:border-[#1e232a] dark:bg-[#0c0e11]">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-lg border-[3px] border-black bg-white shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]">
            <img alt="Stones logo" className="h-full w-full object-cover" src="/stones_logo_2.png" />
          </div>
          <div className="min-w-0">
            <h1 className="brand-word leading-tight">Stones</h1>
            <p className="text-xs font-black uppercase tracking-wide text-black/70 dark:text-[#7a7670]">Task + workspace</p>
          </div>
          {colorProfile !== "glow" && (
            <button
              className="icon-button ml-auto"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle dark mode"
              type="button"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <button
            className="icon-button sidebar-close-btn"
            onClick={onClose}
            title="Close sidebar"
            type="button"
            style={{ display: "none" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <nav className="grid gap-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={clsx("nav-button", view === item.id && "active")}
              onClick={() => handleNav(() => setView(item.id))}
              type="button"
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mx-4 mb-3 flex items-center justify-between border-t-4 border-black pt-4 dark:border-[#1e232a]">
        <p className="text-xs font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">
          Pages
        </p>
      </div>

      <div className="mx-4 flex min-h-[8rem] flex-1 flex-col gap-2 overflow-auto pb-2 pr-3">
        {sortedPages.map((page) => (
          <div key={page.id} className="group relative flex items-center">
            <button
              className={clsx("nav-button flex-1 min-w-0 pr-12", activePageId === page.id && view === "workspace" && "active")}
              onClick={() => handleNav(() => setActivePage(page.id))}
              type="button"
            >
              <span className="truncate min-w-0 flex-1">{page.title}</span>
            </button>
            <button
              className="absolute right-4 grid h-7 w-7 place-items-center rounded-md text-stone-500 opacity-0 transition hover:bg-[#ff5a5f] hover:text-black group-hover:opacity-100 dark:text-[#7a7670] dark:hover:bg-[#3d1215] dark:hover:text-[#e8a0a2]"
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
        className="nb-button primary mx-4 mt-4"
        onClick={() => {
          const defaultDate = new Date().toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric"
          });
          const title = window.prompt("Enter page name:", defaultDate);
          if (title !== null) {
            void createPage(undefined, title || defaultDate);
            onClose?.();
          }
        }}
        type="button"
      >
        <FilePlus size={16} />
        New Page
      </button>

      <div className="mx-4 mt-6">
        <p className="text-xs font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">
          Tasks:
        </p>
      </div>

      <div className="m-4 grid grid-cols-2 gap-3">
        <Metric label="Today" value={dueToday.toString()} color="blue" />
        <Metric label="Overdue" value={overdue.toString()} color="red" />
      </div>

      <button
        className="nav-button mx-4 mb-4"
        onClick={() => handleNav(() => setSettingsOpen(true))}
        type="button"
      >
        <Settings size={17} />
        Settings
      </button>
    </aside>
  );
}
