import { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { BlockCard } from "../blocks";
import { clsx } from "clsx";
import { Plus, FileText, Link, Image as ImageIcon, Book, ArrowLeft, Lock, Menu, X, Settings } from "lucide-react";

import { DiaryAddBlockMenu } from "./DiaryAddBlockMenu";

export function DiaryView() {
  const { 
    diaryPasswordHash, 
    diaryAuthenticated, 
    setDiaryPassword, 
    authenticateDiary, 
    pages, 
    blocks, 
    activeDiaryPageId, 
    setActiveDiaryPage, 
    addDiaryPage,
    renamePage,
    setView,
    setSettingsOpen
  } = useAppStore();

  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const diaryPages = pages.filter((p) => p.workspaceId === "diary").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const activePage = diaryPages.find((p) => p.id === activeDiaryPageId) || diaryPages[0];

  useEffect(() => {
    if (!activeDiaryPageId && diaryPages.length > 0) {
      setActiveDiaryPage(diaryPages[0].id);
    }
  }, [diaryPages, activeDiaryPageId, setActiveDiaryPage]);

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    await setDiaryPassword(passwordInput);
    setPasswordInput("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const ok = await authenticateDiary(passwordInput);
    if (!ok) {
      setErrorMsg("Incorrect password.");
    } else {
      setErrorMsg("");
      setPasswordInput("");
    }
  };

  const handleCreatePage = (e) => {
    e.preventDefault();
    if (newPageTitle.trim()) {
      addDiaryPage(newPageTitle.trim());
      setNewPageTitle("");
    }
  };

  const hasSyncedDiary = diaryPages.length > 0;

  if (!diaryPasswordHash && !hasSyncedDiary) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6 max-md:p-4">
        <form onSubmit={handleSetupSubmit} className="bento-card max-w-md w-full bg-[#f1f5ff] p-8 text-center dark:bg-[#0c0e11] max-md:p-6">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black bg-[#ffb45c] dark:border-[#1e232a] dark:bg-[#3d2800]">
            <Book size={32} />
          </div>
          <h2 className="mb-2 text-2xl font-black">Set up your Diary</h2>
          <p className="mb-6 text-sm font-bold text-stone-600 dark:text-[#7a7670]">
            Your diary is private. Choose a secure password to lock it.
            <br />
            <strong className="text-[#ff5a5f] mt-2 block">Warning: You cannot change or recover this password later.</strong>
          </p>
          <input
            autoFocus
            type="password"
            className="nb-input mb-4 w-full px-4 py-3 text-center text-lg font-black tracking-widest placeholder:tracking-normal placeholder:font-bold"
            placeholder="Enter a secure password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" className="nb-button action w-full p-3 text-lg" disabled={!passwordInput.trim()}>
            Lock Diary
          </button>
        </form>
      </div>
    );
  }

  if (!diaryAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6 max-md:p-4">
        <form onSubmit={handleLoginSubmit} className="bento-card max-w-md w-full bg-[#f1f5ff] p-8 text-center dark:bg-[#0c0e11] max-md:p-6">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black bg-[#c4a8ff] dark:border-[#1e232a] dark:bg-[#1a1040]">
            <Lock size={32} />
          </div>
          <h2 className="mb-2 text-2xl font-black">
            {!diaryPasswordHash ? "Unlock Synced Diary" : "Unlock Diary"}
          </h2>
          <p className="mb-6 text-sm font-bold text-stone-600 dark:text-[#7a7670]">
            {!diaryPasswordHash
              ? "It looks like you have a synced diary from another device. Enter your password to access your entries."
              : "Enter your password to access your private entries."}
          </p>
          {errorMsg && <p className="mb-4 text-sm font-black text-[#ff5a5f]">{errorMsg}</p>}
          <input
            autoFocus
            type="password"
            className="nb-input mb-4 w-full px-4 py-3 text-center text-lg font-black tracking-widest placeholder:tracking-normal placeholder:font-bold"
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setErrorMsg("");
            }}
          />
          <div className="flex gap-3">
            <button type="button" className="nb-button w-full p-3" onClick={() => setView("workspace")}>
              Go Back
            </button>
            <button type="submit" className="nb-button action w-full p-3" disabled={!passwordInput}>
              Unlock
            </button>
          </div>
        </form>
      </div>
    );
  }

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
        !isSidebarOpen && "max-lg:-translate-x-full"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 min-w-0 flex-1 mr-2">
            <button className="nb-button justify-start px-4 flex-1 truncate" onClick={() => setView("workspace")}>
              <ArrowLeft size={16} className="shrink-0" /> <span className="truncate">Back to Workspace</span>
            </button>
            <button className="nb-button p-2 shrink-0" onClick={() => setSettingsOpen(true)} title="Settings">
              <Settings size={20} />
            </button>
          </div>
          <button className="!hidden max-lg:!flex nb-button p-2 shrink-0" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <div className="bento-card hover-static flex-1 flex flex-col bg-[#fff7e8] dark:bg-[#12151a] p-4 min-h-0">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-black">
            <Book size={20} /> My Diary
          </h3>
          
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
              {diaryPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => {
                    setActiveDiaryPage(page.id);
                    setIsSidebarOpen(false);
                  }}
                  className={clsx(
                    "nb-button w-full justify-start truncate text-left border-[2px]",
                    activePage?.id === page.id 
                      ? "bg-[#2ef2a6] dark:bg-[#0a3d28]" 
                      : "bg-white dark:bg-[#0c0e11]"
                  )}
                >
                  {page.title}
                </button>
              ))}
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
        <div className="hidden max-lg:flex items-center gap-3 mb-4">
          <button className="nb-button p-2 bg-[#2ef2a6] dark:bg-[#0a3d28]" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Book size={24} /> My Diary
          </h2>
        </div>
        
        {activePage ? (
          <div className="flex-1 overflow-auto max-lg:overflow-visible pt-1 pr-4 pb-4 pl-1 -mt-1 -mr-4 -mb-4 -ml-1">
            <section className="bento-card mb-8 bg-[#ffdc4a] p-5 dark:bg-[#1a1500] max-md:p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/70 dark:text-[#7a7670]">Diary Entry</p>
              <input
                className="hero-title w-full bg-transparent outline-none"
                onChange={(event) => renamePage(activePage.id, event.target.value)}
                value={activePage.title}
              />
            </section>
            
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
