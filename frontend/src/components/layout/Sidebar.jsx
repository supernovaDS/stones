import { clsx } from "clsx";
import { FilePlus, Moon, Sun, Trash2, Settings } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { navItems } from "../../utils/constants";
import { Metric } from "../ui";

export function Sidebar({ dueToday, overdue }) {
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
    view
  } = useAppStore();

  return (
    <aside className="sidebar-shell">
      <div className="border-b-4 border-black bg-[#ffdc4a] p-4 dark:border-white dark:bg-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-lg border-[3px] border-black bg-white shadow-[4px_4px_0_#111] dark:border-white dark:bg-[#202020] dark:shadow-[4px_4px_0_#fff]">
            <img alt="Stones logo" className="h-full w-full object-cover" src="/stones_logo.png" />
          </div>
          <div className="min-w-0">
            <h1 className="brand-word leading-tight">Stones</h1>
            <p className="text-xs font-black uppercase tracking-wide text-black/70">Task + workspace</p>
          </div>
          <button
            className="icon-button ml-auto"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle dark mode"
            type="button"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
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
              onClick={() => setView(item.id)}
              type="button"
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mx-4 mb-3 flex items-center justify-between border-t-4 border-black pt-4 dark:border-white">
        <p className="text-xs font-black uppercase tracking-wide text-stone-700 dark:text-slate-200">
          Pages
        </p>
      </div>

      <div className="mx-4 flex min-h-0 flex-1 flex-col gap-2 overflow-auto pb-2 pr-3">
        {pages.map((page) => (
          <div key={page.id} className="group relative flex items-center">
            <button
              className={clsx("nav-button flex-1 min-w-0 pr-12", activePageId === page.id && view === "workspace" && "active")}
              onClick={() => setActivePage(page.id)}
              type="button"
            >
              <span className="truncate min-w-0 flex-1">{page.title}</span>
            </button>
            <button
              className="absolute right-4 grid h-7 w-7 place-items-center rounded-md text-stone-500 opacity-0 transition hover:bg-[#ff5a5f] hover:text-black group-hover:opacity-100 dark:text-slate-300"
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
          }
        }}
        type="button"
      >
        <FilePlus size={16} />
        New Page
      </button>

      <div className="mx-4 mt-6">
        <p className="text-xs font-black uppercase tracking-wide text-stone-700 dark:text-slate-200">
          Tasks:
        </p>
      </div>

      <div className="m-4 grid grid-cols-2 gap-3">
        <Metric label="Today" value={dueToday.toString()} color="blue" />
        <Metric label="Overdue" value={overdue.toString()} color="red" />
      </div>
      
      <button
        className="nav-button mx-4 mb-4"
        onClick={() => setSettingsOpen(true)}
        type="button"
      >
        <Settings size={17} />
        Settings
      </button>
    </aside>
  );
}
