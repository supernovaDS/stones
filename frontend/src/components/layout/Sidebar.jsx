import { useState } from "react";
import { clsx } from "clsx";
import { Moon, Sun, Trash2, Settings, X, Plus, ChevronDown, ChevronRight, Edit2 } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { navItems } from "../../utils/constants";

export function Sidebar({ isOpen, onClose }) {
  const {
    activePageId,
    createPage,
    deletePage,
    pages,
    sections,
    createSection,
    deleteSection,
    renameSection,
    setActivePage,
    setTheme,
    setView,
    setSettingsOpen,
    theme,
    view
  } = useAppStore();

  const [collapsedSections, setCollapsedSections] = useState({});

  const handleNav = (action) => {
    action();
    onClose?.();
  };

  const sortedPages = [...pages]
    .filter(p => p.workspaceId !== "diary")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
          <button
              className="icon-button ml-auto"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              type="button"
            >
              <Settings size={16} />
            </button>

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
        <div className="flex gap-1">
          <button
            className="icon-button pages-btn !h-6 !w-auto px-2 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => {
              const name = window.prompt("Enter section name:");
              if (name) {
                void createSection(name);
              }
            }}
            title="New Section"
            type="button"
          >
            + Section
          </button>
          <button
            className="icon-button pages-btn !h-6 !w-6"
            onClick={() => {
              const defaultDate = new Date().toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric"
              });
              const title = window.prompt("Enter page name:", defaultDate);
              if (title !== null) {
                void createPage(null, title || defaultDate);
                onClose?.();
              }
            }}
            title="New Page"
            type="button"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="mx-4 flex min-h-[8rem] flex-1 flex-col gap-2 overflow-auto pb-2 pr-3">
        {/* Unsectioned Pages */}
        {sortedPages.filter(p => !p.sectionId).map((page) => (
          <div key={page.id} className="group relative flex items-center">
            <button
              className={clsx("nav-button flex-1 min-w-0 pr-12", activePageId === page.id && view === "workspace" && "active")}
              onClick={() => handleNav(() => setActivePage(page.id))}
              type="button"
            >
              <span className="truncate min-w-0 flex-1">{page.title}</span>
            </button>
            <button
              className="absolute right-4 grid h-7 w-7 place-items-center rounded-md text-stone-500 opacity-100 md:opacity-0 transition hover:bg-[#ff5a5f] hover:text-black group-hover:opacity-100 dark:text-[#7a7670] dark:hover:bg-[#3d1215] dark:hover:text-[#e8a0a2]"
              onClick={() => void deletePage(page.id)}
              title="Delete page"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* Sections */}
        {sections.map(section => {
          const isCollapsed = !!collapsedSections[section.id];
          return (
            <div key={section.id} className="flex flex-col gap-1 mt-2 mb-1">
              <div className="group flex items-center justify-between pl-1 pr-2 py-1 text-[11px] font-black uppercase tracking-wide text-stone-500 hover:text-stone-800 dark:text-[#7a7670] dark:hover:text-stone-300">
                <div className="flex items-center flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }));
                    }}
                    className="ml-0.5 mr-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <span
                    className="flex-1 cursor-pointer truncate"
                    onClick={() => {
                      setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }));
                    }}
                    title="Toggle collapse"
                  >
                    {section.title}
                  </span>
                </div>
                <div className="flex gap-2 opacity-100 md:opacity-0 transition group-hover:opacity-100 ml-2">
                  <button
                    className="hover:text-black dark:hover:text-white transition-colors"
                    onClick={() => {
                      const newTitle = window.prompt("Rename section:", section.title);
                      if (newTitle) renameSection(section.id, newTitle);
                    }}
                    title="Rename section"
                    type="button"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className="hover:text-[#ff5a5f] transition-colors"
                    onClick={() => void deleteSection(section.id)}
                    title="Delete section"
                    type="button"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    className="hover:text-black dark:hover:text-white transition-colors"
                    onClick={() => {
                      const defaultDate = new Date().toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric"
                      });
                      const title = window.prompt("Enter page name for this section:", defaultDate);
                      if (title !== null) {
                        void createPage(section.id, title || defaultDate);
                        onClose?.();
                      }
                    }}
                    title="Add page to section"
                    type="button"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              
              {!isCollapsed && (
                <div className="flex flex-col gap-1">
                  {sortedPages.filter(p => p.sectionId === section.id).map((page) => (
                    <div key={page.id} className="group relative flex items-center">
                      <button
                        className={clsx("nav-button flex-1 min-w-0 pr-12", activePageId === page.id && view === "workspace" && "active")}
                        onClick={() => handleNav(() => setActivePage(page.id))}
                        type="button"
                      >
                        <span className="truncate min-w-0 flex-1 pl-4">{page.title}</span>
                      </button>
                      <button
                        className="absolute right-4 grid h-7 w-7 place-items-center rounded-md text-stone-500 opacity-100 md:opacity-0 transition hover:bg-[#ff5a5f] hover:text-black group-hover:opacity-100 dark:text-[#7a7670] dark:hover:bg-[#3d1215] dark:hover:text-[#e8a0a2]"
                        onClick={() => void deletePage(page.id)}
                        title="Delete page"
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </aside>
  );
}
