import { useState } from "react";
import { X, Archive, ArchiveRestore, Trash2, Search, Layers } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export function ArchivedPagesModal() {
  const {
    pages,
    blocks,
    deletePage,
    setArchivedPagesOpen,
    setUnarchiveModalPage
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");

  const archivedPages = pages
    .filter((p) => p.archived)
    .sort((a, b) => new Date(b.archivedAt || b.updatedAt) - new Date(a.archivedAt || a.updatedAt));

  const filteredPages = archivedPages.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-backdrop animate-fade-in" onClick={() => setArchivedPagesOpen(false)}>
      <div
        className="modal-card w-[min(90vw,650px)] max-h-[90vh] overflow-y-auto p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border-2 border-black bg-[#ffdc4a] dark:border-[#1e232a] dark:bg-[#3d2800]">
              <Archive size={20} className="text-black dark:text-[#ffdc4a]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-black dark:text-[#c8c3ba]">
                Archived Pages
              </h2>
              <p className="text-xs font-bold text-stone-500 dark:text-[#7a7670]">
                {archivedPages.length} {archivedPages.length === 1 ? "page" : "pages"} in archive
              </p>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={() => setArchivedPagesOpen(false)}
            type="button"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm font-bold text-stone-600 dark:text-[#7a7670] mb-5">
          Archived pages are detached from sections and hidden from your active sidebar. You can restore them to any section at any time.
        </p>

        {archivedPages.length > 0 && (
          <div className="relative mb-5">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-[#5a5650]" />
            <input
              type="text"
              placeholder="Search archived pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nb-input w-full pl-10 pr-4 py-2 text-sm font-bold"
            />
          </div>
        )}

        {archivedPages.length === 0 ? (
          <div className="bento-card hover-static bg-stone-50 p-8 text-center dark:bg-[#12151a]">
            <Archive size={36} className="mx-auto mb-3 text-stone-300 dark:text-stone-700" />
            <p className="text-lg font-black text-stone-600 dark:text-[#7a7670]">No archived pages</p>
            <p className="text-xs font-bold text-stone-400 dark:text-[#5a5650] mt-1">
              Pages you archive will appear here for safe keeping.
            </p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="bento-card hover-static bg-stone-50 p-6 text-center dark:bg-[#12151a]">
            <p className="text-base font-black text-stone-500">No pages matching &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="grid gap-3 pr-1">
            {filteredPages.map((page) => {
              const pageBlocks = blocks.filter((b) => b.pageId === page.id);
              const taskCount = pageBlocks.filter((b) => b.type === "task").length;

              const archivedDate = page.archivedAt
                ? new Date(page.archivedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })
                : "Archived";

              return (
                <div
                  key={page.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border-[3px] border-[#111111] bg-white dark:border-[#1e232a] dark:bg-[#12151a] shadow-[4px_4px_0_#111] dark:shadow-[3px_3px_0_#000] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-black truncate text-black dark:text-[#c8c3ba]">
                      {page.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded border border-black dark:border-[#1e232a] bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-700 dark:text-stone-300 font-black">
                        Archived {archivedDate}
                      </span>
                      <span className="text-xs font-bold text-stone-500 dark:text-[#7a7670] flex items-center gap-1.5">
                        <Layers size={12} />
                        {pageBlocks.length} block{pageBlocks.length !== 1 ? "s" : ""}
                        {taskCount > 0 && ` (${taskCount} task${taskCount !== 1 ? "s" : ""})`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="nb-button text-xs px-3 py-2 bg-[#2ef2a6] hover:bg-[#25c486] text-black dark:bg-[#0a3d28] dark:hover:bg-[#0e5236] dark:text-[#2ef2a6] flex items-center gap-1.5 font-black"
                      onClick={() => setUnarchiveModalPage(page)}
                      type="button"
                      title="Restore page to workspace"
                    >
                      <ArchiveRestore size={14} /> Restore
                    </button>
                    <button
                      className="nb-button text-xs px-3 py-2 danger flex items-center gap-1.5 font-black"
                      onClick={() => void deletePage(page.id)}
                      type="button"
                      title="Move page to Recycle Bin"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
