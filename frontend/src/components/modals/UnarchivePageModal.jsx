import { useState } from "react";
import { X, ArchiveRestore, FolderPlus, Folder, FileText, Check } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { clsx } from "clsx";

export function UnarchivePageModal() {
  const {
    unarchiveModalPage,
    setUnarchiveModalPage,
    sections,
    unarchivePage,
    setArchivedPagesOpen
  } = useAppStore();

  const [destinationMode, setDestinationMode] = useState(
    sections.length > 0 ? "existing" : "none"
  );
  const [selectedSectionId, setSelectedSectionId] = useState(
    sections[0]?.id || ""
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [error, setError] = useState("");

  if (!unarchiveModalPage) return null;

  const handleRestore = async (e) => {
    e?.preventDefault();
    setError("");

    if (destinationMode === "new") {
      if (!newSectionTitle.trim()) {
        setError("Please enter a section name.");
        return;
      }
      await unarchivePage(unarchiveModalPage.id, {
        newSectionTitle: newSectionTitle.trim()
      });
    } else if (destinationMode === "existing") {
      if (!selectedSectionId) {
        setError("Please select a section.");
        return;
      }
      await unarchivePage(unarchiveModalPage.id, {
        sectionId: selectedSectionId
      });
    } else {
      await unarchivePage(unarchiveModalPage.id, { sectionId: null });
    }

    setUnarchiveModalPage(null);
    setArchivedPagesOpen(false);
  };

  return (
    <div
      className="modal-backdrop animate-fade-in z-50"
      onClick={() => setUnarchiveModalPage(null)}
    >
      <div
        className="modal-card w-[min(90vw,520px)] max-h-[90vh] overflow-y-auto p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border-2 border-black bg-[#2ef2a6] dark:border-[#1e232a] dark:bg-[#0a3d28]">
              <ArchiveRestore size={20} className="text-black dark:text-[#2ef2a6]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black dark:text-[#c8c3ba]">
                Restore Page
              </h2>
              <p className="text-xs font-bold text-stone-500 dark:text-[#7a7670] truncate max-w-[280px]">
                {unarchiveModalPage.title}
              </p>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={() => setUnarchiveModalPage(null)}
            type="button"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs font-bold text-stone-600 dark:text-[#7a7670] mb-4">
          Select where to place this page in your workspace sidebar:
        </p>

        <form onSubmit={handleRestore} className="grid gap-3">
          {/* Option 1: Existing Section */}
          {sections.length > 0 && (
            <label
              className={clsx(
                "flex flex-col gap-2 p-3.5 rounded-xl border-[3px] cursor-pointer transition-all",
                destinationMode === "existing"
                  ? "border-black bg-[#fffae6] shadow-[3px_3px_0_#111] dark:border-[#ffdc4a] dark:bg-[#1a1805] dark:shadow-[3px_3px_0_#ffdc4a]"
                  : "border-stone-200 hover:border-stone-400 bg-white dark:border-stone-800 dark:bg-[#12151a]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="destinationMode"
                    value="existing"
                    checked={destinationMode === "existing"}
                    onChange={() => setDestinationMode("existing")}
                    className="accent-black dark:accent-[#ffdc4a]"
                  />
                  <span className="text-sm font-black flex items-center gap-1.5">
                    <Folder size={16} /> Add to Existing Section
                  </span>
                </div>
              </div>
              {destinationMode === "existing" && (
                <div className="pl-6 pt-1">
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="nb-select w-full py-1.5 px-3 text-sm font-bold"
                  >
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </label>
          )}

          {/* Option 2: No Section (Root) */}
          <label
            className={clsx(
              "flex flex-col gap-1.5 p-3.5 rounded-xl border-[3px] cursor-pointer transition-all",
              destinationMode === "none"
                ? "border-black bg-[#fffae6] shadow-[3px_3px_0_#111] dark:border-[#ffdc4a] dark:bg-[#1a1805] dark:shadow-[3px_3px_0_#ffdc4a]"
                : "border-stone-200 hover:border-stone-400 bg-white dark:border-stone-800 dark:bg-[#12151a]"
            )}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="destinationMode"
                value="none"
                checked={destinationMode === "none"}
                onChange={() => setDestinationMode("none")}
                className="accent-black dark:accent-[#ffdc4a]"
              />
              <span className="text-sm font-black flex items-center gap-1.5">
                <FileText size={16} /> No Section (Top Level / Root)
              </span>
            </div>
            <p className="pl-6 text-[11px] font-bold text-stone-500 dark:text-[#7a7670]">
              Place directly under the main pages list.
            </p>
          </label>

          {/* Option 3: Create New Section */}
          <label
            className={clsx(
              "flex flex-col gap-2 p-3.5 rounded-xl border-[3px] cursor-pointer transition-all",
              destinationMode === "new"
                ? "border-black bg-[#fffae6] shadow-[3px_3px_0_#111] dark:border-[#ffdc4a] dark:bg-[#1a1805] dark:shadow-[3px_3px_0_#ffdc4a]"
                : "border-stone-200 hover:border-stone-400 bg-white dark:border-stone-800 dark:bg-[#12151a]"
            )}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="destinationMode"
                value="new"
                checked={destinationMode === "new"}
                onChange={() => setDestinationMode("new")}
                className="accent-black dark:accent-[#ffdc4a]"
              />
              <span className="text-sm font-black flex items-center gap-1.5">
                <FolderPlus size={16} /> Create New Section
              </span>
            </div>
            {destinationMode === "new" && (
              <div className="pl-6 pt-1">
                <input
                  type="text"
                  placeholder="Enter section name..."
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  autoFocus
                  className="nb-input w-full px-3 py-1.5 text-sm font-bold"
                />
              </div>
            )}
          </label>

          {error && (
            <p className="text-xs font-black text-red-500 mt-1">{error}</p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              className="nb-button text-xs px-4 py-2"
              onClick={() => setUnarchiveModalPage(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="nb-button primary text-xs px-4 py-2 flex items-center gap-1.5 font-black"
            >
              <Check size={14} /> Restore Page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
