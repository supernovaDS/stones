import { X, Check, LogOut, User, Moon, Sun } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAppStore } from "../../store/useAppStore";
import { clsx } from "clsx";
import { SyncStatusIndicator } from "../sync/SyncStatusIndicator";

const PROFILES = [
  {
    id: "neo",
    label: "Neo",
    description: "Bold borders, heavy shadows, vibrant & punchy",
    preview: {
      bg: "#fff7e8",
      border: "#111111",
      accent: "#ffdc4a",
      text: "#15120f",
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean lines, soft shadows, elegant & calm",
    preview: {
      bg: "#f4f6f2",
      border: "#e7e5e4",
      accent: "#57534e",
      text: "#161616",
    },
  },
];

export function SettingsModal({ syncStatus }) {
  const { colorProfile, setColorProfile, theme, setTheme, setSettingsOpen } = useAppStore();
  const { user, signOut } = useAuth();

  return (
    <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
      <div className="modal-card w-[min(90vw,600px)] p-6" onClick={(e) => e.stopPropagation()}>
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

        <p className="mb-4 text-sm font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">
          Color Profile
        </p>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          {PROFILES.map((profile) => {
            const isActive = colorProfile === profile.id;
            return (
              <button
                key={profile.id}
                className={clsx(
                  "relative rounded-xl border-[3px] p-4 text-left transition-all duration-150",
                  isActive
                    ? "profile-card--active"
                    : "profile-card--inactive"
                )}
                onClick={() => setColorProfile(profile.id)}
                type="button"
              >
                {isActive && (
                  <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#2ef2a6] text-black dark:bg-[#0a3d28] dark:text-[#6fd09a]">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
                <div className="mb-3 flex gap-2">
                  <span className="h-6 w-6 rounded-md border-2" style={{ background: profile.preview.bg, borderColor: profile.preview.border }} />
                  <span className="h-6 w-6 rounded-md border-2" style={{ background: profile.preview.accent, borderColor: profile.preview.border }} />
                  <span className="h-6 w-6 rounded-md border-2" style={{ background: profile.preview.text, borderColor: profile.preview.border }} />
                </div>
                <p className="text-base font-black">{profile.label}</p>
                <p className="mt-1 text-xs font-bold text-stone-500 dark:text-[#7a7670]">{profile.description}</p>
              </button>
            );
          })}
        </div>

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
      </div>
    </div>
  );
}
