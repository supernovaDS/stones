import { X, Trash2, Undo } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export function RecycleBinModal() {
  const {
    deletedPagesBin,
    restorePageFromBin,
    permanentlyDeletePageFromBin,
    setRecycleBinOpen,
    view
  } = useAppStore();

  const filteredBin = deletedPagesBin.filter((item) => item.workspaceId !== "diary" && item.type !== "diary");

  return (
    <div className="modal-backdrop animate-fade-in" onClick={() => setRecycleBinOpen(false)}>
      <div 
        className="modal-card w-[min(90vw,600px)] max-h-[90vh] overflow-y-auto p-6 animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 size={24} className="text-[#ff5a5f]" />
            <h2 className="text-2xl font-black text-black dark:text-[#c8c3ba]">
              Workspace Recycle Bin
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={() => setRecycleBinOpen(false)}
            type="button"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm font-bold text-stone-600 dark:text-[#7a7670] mb-6">
          Deleted workspace pages and sections are stored here for 30 days before getting permanently deleted.
        </p>

        {filteredBin.length === 0 ? (
          <div className="bento-card hover-static bg-stone-50 p-8 text-center dark:bg-[#12151a]">
            <p className="text-lg font-black text-stone-500">Recycle Bin is empty.</p>
          </div>
        ) : (
          <div className="grid gap-3 pr-1">
            {filteredBin.map((item) => {
              const daysLeft = Math.ceil(
                (new Date(item.deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) /
                  (1000 * 60 * 60 * 24)
              );
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border-[3px] border-[#111111] bg-white dark:border-[#1e232a] dark:bg-[#12151a] shadow-[4px_4px_0_#111] dark:shadow-[3px_3px_0_#000]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-black truncate text-black dark:text-[#c8c3ba]">{item.title}</p>
                    <p className="text-xs font-bold text-stone-500 dark:text-[#7a7670] flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded border border-black dark:border-[#1e232a] bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-700 dark:text-stone-300 font-black">
                        {item.type === "section" ? "Section" : "Page"}
                      </span>
                      <span>Deletes in {daysLeft} {daysLeft === 1 ? "day" : "days"}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="nb-button text-xs px-3 py-2 bg-[#2ef2a6] dark:bg-[#0a3d28] flex items-center gap-1.5"
                      onClick={() => restorePageFromBin(item.id)}
                      type="button"
                    >
                      <Undo size={14} /> Restore
                    </button>
                    <button
                      className="nb-button text-xs px-3 py-2 danger flex items-center gap-1.5"
                      onClick={() => permanentlyDeletePageFromBin(item.id)}
                      type="button"
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
