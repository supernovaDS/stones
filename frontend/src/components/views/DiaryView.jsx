import { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { BlockCard } from "../blocks";
import { clsx } from "clsx";
import { Plus, Book, ArrowLeft, Menu, X, Settings, Trash2 } from "lucide-react";

import { DiaryAddBlockMenu } from "./DiaryAddBlockMenu";

export function DiaryView() {
  const { 
    pages, 
    blocks, 
    activeDiaryPageId, 
    setActiveDiaryPage, 
    addDiaryPage,
    renamePage,
    setView,
    setSettingsOpen,
    deletePage,
    sidebarHidden,
    setSidebarHidden
  } = useAppStore();

  const [newPageTitle, setNewPageTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const diaryPages = pages.filter((p) => p.workspaceId === "diary").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const activePage = diaryPages.find((p) => p.id === activeDiaryPageId) || diaryPages[0];

  useEffect(() => {
    if (!activeDiaryPageId && diaryPages.length > 0) {
      setActiveDiaryPage(diaryPages[0].id);
    }
  }, [diaryPages, activeDiaryPageId, setActiveDiaryPage]);

  const handleCreatePage = (e) => {
    e.preventDefault();
    if (newPageTitle.trim()) {
      addDiaryPage(newPageTitle.trim());
      setNewPageTitle("");
    }
  };

  const pageBlocks = activePage
    ? blocks
        .filter((block) => block.pageId === activePage.id && !block.metadata.archived)
        .sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="flex h-[100dvh] gap-6 p-6 max-lg:h-auto max-lg:min-h-[100dvh] max-lg:flex-col max-lg:gap-4 max-lg:p-4 relative">
      {/* Sidebar Backdrop (Mobile only) */}
      {isSidebarOpen && (
        <div 
          className="hidden max-lg:block fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar / List Pane */}
      <div className={clsx(
        "w-80 shrink-0 flex flex-col gap-4",
        "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[320px] max-lg:bg-[#fffdf6] max-lg:p-4 max-lg:shadow-[6px_6px_0_#111]",
        "max-lg:dark:bg-[#12151a] max-lg:dark:shadow-[4px_4px_0_#000] max-lg:transition-transform max-lg:duration-200 max-lg:h-full max-lg:max-w-[85vw]",
        !isSidebarOpen && "max-lg:-translate-x-full",
        sidebarHidden && "lg:hidden"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 min-w-0 flex-1 mr-2">
            <button className="nb-button justify-start px-4 flex-1 truncate" onClick={() => setView("workspace")}>
              <ArrowLeft size={16} className="shrink-0" /> <span className="truncate">Back to Workspace</span>
            </button>
            <button
              className="nb-button p-2 shrink-0"
              onClick={() => {
                if (window.innerWidth <= 1024) {
                  setIsSidebarOpen(false);
                } else {
                  setSidebarHidden(true);
                }
              }}
              title="Collapse sidebar"
              type="button"
            >
              <Menu size={20} />
            </button>
          </div>
          <button className="!hidden max-lg:!flex nb-button p-2 shrink-0" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <div className="bento-card hover-static flex-1 flex flex-col bg-[#fff7e8] dark:bg-[#12151a] p-4 min-h-0">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-black">
              <Book size={20} /> My Diary
            </h3>
            <button
              className="nb-button p-2 shrink-0 bg-white dark:bg-[#0c0e11]"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              type="button"
            >
              <Settings size={16} />
            </button>
          </div>
          
          <form onSubmit={handleCreatePage} className="mb-4 flex gap-2">
            <input
              className="nb-input min-w-0 flex-1 px-3 py-2 text-sm font-bold"
              placeholder="New entry title..."
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
            />
            <button type="submit" className="nb-button px-3 py-2" disabled={!newPageTitle.trim()}>
              <Plus size={16} />
            </button>
          </form>

          <div className="flex-1 overflow-auto p-2 -m-2">
            <div className="grid gap-2">
              {diaryPages.map((page) => {
                const isActive = activePage?.id === page.id;
                return (
                  <div key={page.id} className="flex gap-2 items-center">
                    <button
                      onClick={() => {
                        setActiveDiaryPage(page.id);
                        setIsSidebarOpen(false);
                      }}
                      className={clsx(
                        "nb-button flex-1 justify-start truncate text-left border-[2px] min-w-0",
                        isActive 
                          ? "bg-[#2ef2a6] dark:bg-[#0a3d28]" 
                          : "bg-white dark:bg-[#0c0e11]"
                      )}
                    >
                      <span className="truncate">{page.title}</span>
                    </button>
                    <button
                      className="nb-button p-2 hover:bg-[#ff5a5f] hover:text-white dark:hover:bg-[#ff5a5f] transition-all shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(page.id);
                      }}
                      title="Delete entry"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              {diaryPages.length === 0 && (
                <p className="text-center text-sm font-bold text-stone-500 mt-4">
                  No diary entries yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activePage && (
          <div className={clsx("flex items-center gap-3 mb-4", !sidebarHidden && "lg:hidden")}>
            <button 
              className="nb-button p-2 bg-[#2ef2a6] dark:bg-[#0a3d28]" 
              onClick={() => {
                if (window.innerWidth <= 1024) {
                  setIsSidebarOpen(true);
                } else {
                  setSidebarHidden(!sidebarHidden);
                }
              }}
              title="Toggle sidebar"
              type="button"
            >
              <Menu size={20} />
            </button>
          </div>
        )}
        
        {activePage ? (
          <div className="flex-1 overflow-auto max-lg:overflow-visible pt-1 pr-4 pb-4 pl-1 -mt-1 -mr-4 -mb-4 -ml-1">
            <div className="flex items-center gap-4 mb-6 px-1">
              <button 
                className={clsx(
                  "nb-button p-2 bg-[#2ef2a6] dark:bg-[#0a3d28] shrink-0",
                  !sidebarHidden && "lg:hidden"
                )}
                onClick={() => {
                  if (window.innerWidth <= 1024) {
                    setIsSidebarOpen(true);
                  } else {
                    setSidebarHidden(!sidebarHidden);
                  }
                }}
                title="Toggle sidebar"
                type="button"
              >
                <Menu size={20} />
              </button>
              
              <input
                className="flex-1 bg-transparent text-4xl font-black outline-none border-b-2 border-transparent focus:border-black/20 dark:focus:border-white/20 pb-2 text-black dark:text-[#c8c3ba] min-w-0"
                onChange={(event) => renamePage(activePage.id, event.target.value)}
                value={activePage.title}
                placeholder="Untitled Entry"
              />
            </div>
            
            <section className="flex flex-col gap-8 pb-12">
              {pageBlocks.length ? (
                pageBlocks.map((block) => (
                  <div key={block.id}>
                    <BlockCard block={block} />
                  </div>
                ))
              ) : (
                <div className="bento-card bg-[#eef2ea] p-8 text-center dark:bg-[#12151a]">
                  <p className="text-2xl font-black">Empty page.</p>
                  <p className="text-sm font-bold mt-2 opacity-70">Add a note, link, or image to start writing.</p>
                </div>
              )}
              <DiaryAddBlockMenu pageId={activePage.id} />
            </section>
          </div>
        ) : (
          <div className="bento-card flex flex-1 items-center justify-center bg-[#f1f5ff] p-8 text-center dark:bg-[#0c0e11]">
            <div>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black bg-white dark:border-[#1e232a] dark:bg-[#12151a]">
                <Book size={32} className="opacity-50" />
              </div>
              <p className="text-2xl font-black">Select or create an entry.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
