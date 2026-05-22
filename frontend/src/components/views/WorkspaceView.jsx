import { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { blockMatchesSearch } from "../../utils/helpers";
import { BlockCard } from "../blocks";
import { clsx } from "clsx";
import { Archive, ChevronDown, ChevronUp, ClipboardPaste, Plus, FileText, CheckSquare, List, Code2, Link, Image, Heading, X } from "lucide-react";

function WeatherWidget() {
// ... keeping weather widget ...

  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: null, desc: "Locating...", icon: "" });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
            if (!res.ok) throw new Error("Network response was not ok");
            const data = await res.json();
            const temp = Math.round(data.current.temperature_2m);
            const code = data.current.weather_code;
            let desc = "Clear";
            let icon = "☀️";
            if (code >= 1 && code <= 3) { desc = "Cloudy"; icon = "☁️"; }
            else if (code >= 45 && code <= 48) { desc = "Fog"; icon = "🌫️"; }
            else if (code >= 51 && code <= 67) { desc = "Rain"; icon = "🌧️"; }
            else if (code >= 71 && code <= 77) { desc = "Snow"; icon = "❄️"; }
            else if (code >= 80 && code <= 82) { desc = "Showers"; icon = "🚿"; }
            else if (code >= 95 && code <= 99) { desc = "Storm"; icon = "⛈️"; }
            
            setWeather({ temp, desc, icon });
          } catch (e) {
            setWeather({ temp: null, desc: "Unavailable", icon: "⚠️" });
          }
        },
        () => {
          setWeather({ temp: null, desc: "No location", icon: "📍" });
        }
      );
    } else {
      setWeather({ temp: null, desc: "No geolocation", icon: "🚫" });
    }
  }, []);

  return (
    <section className="bento-card span-4 bg-[#21caff] p-5 dark:bg-[#001a25] flex flex-col justify-center">
      <div className="weather-layout flex h-full items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="weather-time text-5xl font-black tracking-tight">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
          <p className="text-sm font-black text-black/70 dark:text-[#7a7670] mt-1 uppercase tracking-wide">
            {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="weather-meta flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-4xl leading-none">{weather.icon}</span>
          <div className="min-w-0 text-right">
            <p className="weather-temp text-4xl font-black">{weather.temp !== null ? `${weather.temp}°C` : "--"}</p>
            <p className="text-sm font-black text-black/70 dark:text-[#7a7670] uppercase tracking-wide">
              {weather.desc}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AddBlockMenu({ pageId }) {
  const { addTitleBlock, addNoteBlock, openTaskModal, addChecklistBlock, addCodeBlock, addLinkBlock, addImageBlock, theme, colorProfile } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleImageClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        void addImageBlock(file, pageId);
      }
    };
    input.click();
    setIsOpen(false);
  };

  const menuItems = [
    {
      label: "Task",
      icon: CheckSquare,
      color: "bg-[#21caff] dark:bg-[#002535]",
      action: () => {
        void openTaskModal({ pageId });
        setIsOpen(false);
      }
    },
    {
      label: "Note",
      icon: FileText,
      color: "bg-[#ffdc4a] dark:bg-[#3d2800]",
      action: () => {
        void addNoteBlock(pageId);
        setIsOpen(false);
      }
    },
    {
      label: "Checklist",
      icon: List,
      color: "bg-[#2ef2a6] dark:bg-[#0a3d28]",
      action: () => {
        void addChecklistBlock(pageId);
        setIsOpen(false);
      }
    },
    {
      label: "Code",
      icon: Code2,
      color: "bg-[#c4a8ff] dark:bg-[#1a1040]",
      action: () => {
        void addCodeBlock(pageId);
        setIsOpen(false);
      }
    },
    {
      label: "Link",
      icon: Link,
      color: "bg-[#ff5ec4] dark:bg-[#3d0030]",
      action: () => {
        void addLinkBlock(pageId);
        setIsOpen(false);
      }
    },
    {
      label: "Image",
      icon: Image,
      color: "bg-[#ff5a5f] dark:bg-[#3d1215]",
      action: handleImageClick
    }
  ];

  return (
    <div className="relative flex flex-col items-center py-4">
      {isOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div className="absolute bottom-20 z-20 grid w-64 grid-cols-2 gap-2 rounded-xl border-[3px] border-black bg-white p-3 shadow-[6px_6px_0_#111] animate-in fade-in slide-in-from-bottom-2 duration-150 dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[4px_4px_0_#000]">
          <button
            className="nb-button col-span-2 flex items-center gap-3 p-2.5 transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111]"
            onClick={() => {
              void addTitleBlock(pageId);
              setIsOpen(false);
            }}
            type="button"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#ffb84d] dark:border-[#1e232a] dark:bg-[#b45309]">
              <Heading size={16} />
            </span>
            <span className="text-sm font-black">Heading / Section Title</span>
          </button>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="nb-button flex flex-col items-center justify-center gap-1.5 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111]"
                onClick={item.action}
                type="button"
              >
                <span className={clsx("flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black dark:border-[#1e232a]", item.color)}>
                  <Icon size={16} />
                </span>
                <span className="text-xs font-black">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        className={clsx(
          "nb-button flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black !p-0 shadow-[4px_4px_0_#111] transition-all hover:scale-105 active:scale-95 dark:border-[#1e232a] dark:shadow-[3px_3px_0_#000]",
          isOpen ? "bg-[#ff5a5f] rotate-45 text-black" : (theme === "dark" && colorProfile === "neo" ? "bg-[#21caff] text-black" : "bg-[#2ef2a6] text-black")
        )}
        onClick={() => setIsOpen(!isOpen)}
        title="Add block"
        type="button"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}

export function WorkspaceView({ pageId, searchQuery }) {
  const { blocks, pages, renamePage, clipboard, pasteBlock, clearClipboard } = useAppStore();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const page = pages.find((item) => item.id === pageId);
  const pageBlocks = blocks
    .filter((block) => block.pageId === pageId)
    .filter((block) => blockMatchesSearch(block, searchQuery))
    .sort((a, b) => a.order - b.order);

  const activeBlocks = pageBlocks.filter((block) => !block.metadata.archived);
  const archivedBlocks = pageBlocks.filter((block) => block.metadata.archived);

  return (
    <div className="bento-grid">
      <section className="bento-card span-8 bg-[#ffdc4a] p-5 dark:bg-[#1a1500]">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/70 dark:text-[#7a7670]">Active page</p>
        <input
          className="hero-title w-full bg-transparent outline-none"
          onChange={(event) => page && void renamePage(page.id, event.target.value)}
          value={page?.title ?? ""}
        />
        <p className="mt-4 max-w-xl text-sm font-bold text-black/70">

        </p>
      </section>
      <WeatherWidget />
      <section className="span-12 flex flex-col gap-8">
        {activeBlocks.length ? (
          activeBlocks.map((block) => (
            <div key={block.id}>
              <BlockCard block={block} />
            </div>
          ))
        ) : (
          <div className="bento-card bg-[#2ef2a6] p-8 text-center dark:bg-[#0a3d28]">
            <p className="text-2xl font-black">No active blocks match this search.</p>
          </div>
        )}
        <AddBlockMenu pageId={pageId} />

        {clipboard && (
          <div className="bento-card flex items-center justify-between gap-4 border-[3px] border-dashed border-[#21caff] bg-[#e6fbff] p-4 dark:border-[#004d66] dark:bg-[#001a25]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-[#21caff] dark:border-[#1e232a] dark:bg-[#002535]">
                <ClipboardPaste size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-wide text-stone-600 dark:text-[#7a7670]">Clipboard</p>
                <p className="truncate font-bold text-black dark:text-[#c8c3ba]">
                  {clipboard.type === "task" ? clipboard.content.title : clipboard.type === "note" ? (clipboard.content.text?.slice(0, 50) || "Note") : `${clipboard.type.charAt(0).toUpperCase() + clipboard.type.slice(1)} block`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {clipboard.pageId !== pageId && (
                <button
                  className="nb-button primary flex items-center gap-2 px-4 py-2 text-sm font-black"
                  onClick={() => void pasteBlock(pageId)}
                  type="button"
                >
                  <ClipboardPaste size={16} /> Paste here
                </button>
              )}
              {clipboard.pageId === pageId && (
                <span className="text-xs font-black text-stone-400 dark:text-[#5a5650]">
                  Navigate to another page to paste
                </span>
              )}
              <button
                className="icon-button"
                onClick={clearClipboard}
                title="Clear clipboard"
                type="button"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {archivedBlocks.length > 0 && (
          <div className="mt-8">
            <button
              className="flex w-full items-center justify-between rounded-xl border-[3px] border-black bg-[#f1f5ff] p-4 transition-all hover:bg-white dark:border-[#1e232a] dark:bg-[#0c0e11] dark:hover:bg-[#12151a]"
              onClick={() => setIsArchiveOpen(!isArchiveOpen)}
              type="button"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black bg-white dark:border-[#1e232a] dark:bg-[#12151a]">
                  <Archive size={20} />
                </span>
                <div className="text-left">
                  <p className="font-black">Archived Blocks</p>
                  <p className="text-xs font-bold text-stone-500 dark:text-[#7a7670]">{archivedBlocks.length} block{archivedBlocks.length !== 1 && 's'}</p>
                </div>
              </div>
              {isArchiveOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
            
            {isArchiveOpen && (
              <div className="mt-6 flex flex-col gap-6 p-4 rounded-xl border-[3px] border-dashed border-stone-300 dark:border-stone-800">
                {archivedBlocks.map((block) => (
                  <div key={block.id} className="opacity-80 transition-opacity hover:opacity-100">
                    <BlockCard block={block} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
