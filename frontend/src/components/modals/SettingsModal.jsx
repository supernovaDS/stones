import { X, LogOut, User, Moon, Sun, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAppStore } from "../../store/useAppStore";
import { clsx } from "clsx";
import { SyncStatusIndicator } from "../sync/SyncStatusIndicator";

export function SettingsModal({ syncStatus }) {
  const {
    theme,
    setTheme,
    setSettingsOpen,
    setRecycleBinOpen
  } = useAppStore();
  const { user, signOut } = useAuth();

  return (
    <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
      <div className="modal-card w-[min(90vw,600px)] max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">Settings</h2>
          <button
            className="icon-button"
            onClick={() => setSettingsOpen(false)}
            type="button"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {user && (
          <div className="mb-8">
            <p className="mb-4 text-sm font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">
              Account
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-[3px] border-[#111111] bg-white p-4 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg border-2 border-black bg-[#ffdc4a] dark:border-[#1e232a] dark:bg-[#3d2800]">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-500 dark:text-[#7a7670]">Signed in as</p>
                  <p className="text-sm font-black">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SyncStatusIndicator status={syncStatus} onSync={() => void syncStatus?.syncNow?.()} />
                <button
                  className="nb-button danger"
                  onClick={() => void signOut()}
                  type="button"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <p className="mb-4 text-sm font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">
            Appearance
          </p>
          <div className="flex items-center justify-between rounded-xl border-[3px] border-[#111111] bg-white p-4 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]">
            <div>
              <p className="text-base font-black">Theme Mode</p>
              <p className="text-xs font-bold text-stone-500 dark:text-[#7a7670]">Toggle light or dark interface</p>
            </div>
            <button
              className="nb-button px-4 py-2"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              type="button"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>

        <div className="mt-8">
          <p className="mb-4 text-sm font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">
            Data & Storage
          </p>
          <div className="flex items-center justify-between rounded-xl border-[3px] border-[#111111] bg-white p-4 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]">
            <div>
              <p className="text-base font-black">Recycle Bin</p>
              <p className="text-xs font-bold text-stone-500 dark:text-[#7a7670]">View and restore recently deleted pages</p>
            </div>
            <button
              className="nb-button px-4 py-2 flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setRecycleBinOpen(true);
                setSettingsOpen(false);
              }}
              type="button"
            >
              <Trash2 size={16} /> Open Bin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
