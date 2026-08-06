import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { clsx } from "clsx";
import { Plus, FileText, Link, Image as ImageIcon } from "lucide-react";

export function DiaryAddBlockMenu({ pageId }) {
  const { addNoteBlock, addLinkBlock, addImageBlock, theme } = useAppStore();
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
      label: "Note",
      icon: FileText,
      color: "bg-[#ffdc4a] dark:bg-[#3d2800]",
      action: () => {
        void addNoteBlock(pageId);
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
      icon: ImageIcon,
      color: "bg-[#ff5a5f] dark:bg-[#3d1215]",
      action: handleImageClick
    }
  ];

  return (
    <div className="relative flex flex-col items-center py-4">
      {isOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div className="absolute bottom-20 z-50 grid w-64 grid-cols-2 gap-2 rounded-xl border-[3px] border-black bg-white p-3 shadow-[6px_6px_0_#111] animate-in fade-in slide-in-from-bottom-2 duration-150 dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[4px_4px_0_#000]">
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
          isOpen ? "bg-[#ff5a5f] rotate-45 text-black" : (theme === "dark" ? "bg-[#21caff] text-black" : "bg-[#a78bfa] text-black")
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
