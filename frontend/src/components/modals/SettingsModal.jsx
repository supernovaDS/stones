import { X, Check } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { clsx } from "clsx";

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
  {
    id: "glow",
    label: "Glow",
    description: "Dark, immersive, accent glow — dark mode only",
    preview: {
      bg: "#0B1120",
      border: "#1E293B",
      accent: "#8B5CF6",
      text: "#F8FAFC",
    },
  },
];

export function SettingsModal() {
  const { colorProfile, setColorProfile, setSettingsOpen } = useAppStore();

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

        <p className="mb-4 text-sm font-black uppercase tracking-wide text-stone-700 dark:text-[#7a7670]">
          Color Profile
        </p>
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
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
      </div>
    </div>
  );
}
