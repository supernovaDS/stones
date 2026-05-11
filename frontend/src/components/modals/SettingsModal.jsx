import { ArrowRight } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export function SettingsModal() {
  const { setSettingsOpen } = useAppStore();

  return (
    <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
      <div className="modal-card w-[min(90vw,600px)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">Settings</h2>
          <button
            className="icon-button"
            onClick={() => setSettingsOpen(false)}
            type="button"
            title="Back"
          >
            <ArrowRight size={16} />
          </button>
        </div>
        
        <div className="min-h-48 rounded-lg border-2 border-dashed border-stone-300 p-8 text-center dark:border-[#1e232a]">
          <p className="text-sm font-bold text-stone-500 dark:text-[#5a5650]">
            Settings will be added here in the future.
          </p>
        </div>
      </div>
    </div>
  );
}
