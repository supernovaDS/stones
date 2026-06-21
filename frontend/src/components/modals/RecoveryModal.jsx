import { History, X } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate } from "../../utils/date";
import { HeaderButton, IconButton } from "../ui";

export function RecoveryModal() {
  const { recentlyDeleted, restoreDeletedItem, dismissDeletedItem, setRecoveryOpen } = useAppStore();

  return (
    <div className="modal-backdrop place-items-start pt-24" onClick={() => setRecoveryOpen(false)}>
      <section className="modal-card mx-auto w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <History size={24} /> Recovery & Deletions
          </h2>
          <button className="icon-button" onClick={() => setRecoveryOpen(false)} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-2">
          {recentlyDeleted.length ? recentlyDeleted.map((item) => (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border-[3px] border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]" key={item.id}>
              <History size={16} />
              <span className="min-w-0 flex-1 truncate text-sm font-black">{item.label}</span>
              <span className="text-xs text-stone-500 dark:text-[#5a5650]">{formatShortDate(item.deletedAt)}</span>
              <HeaderButton label="Restore" onClick={() => void restoreDeletedItem(item.id)} />
              <IconButton danger icon={X} title="Dismiss" onClick={() => dismissDeletedItem(item.id)} />
            </div>
          )) : (
            <p className="rounded-lg border-[3px] border-dashed border-black px-3 py-8 text-center text-sm font-black text-stone-600 dark:border-[#1e232a] dark:text-[#5a5650]">
              No recently deleted items.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
