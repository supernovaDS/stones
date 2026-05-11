import { Download, FileDown, Printer, Upload } from "lucide-react";
import { useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { todayIso } from "../../utils/date";
import { blockMatchesSearch, slugify, downloadText, printPagePdf } from "../../utils/helpers";
import { BlockCard } from "../blocks";
import { HeaderButton } from "../ui";

export function WorkspaceView({ pageId, searchQuery }) {
  const { blocks, pages, renamePage, exportPageMarkdown, exportBackup, importBackup } = useAppStore();
  const fileInputRef = useRef(null);
  const page = pages.find((item) => item.id === pageId);
  const pageBlocks = blocks
    .filter((block) => block.pageId === pageId)
    .filter((block) => blockMatchesSearch(block, searchQuery))
    .sort((a, b) => a.order - b.order);

  const onMarkdownExport = () => {
    downloadText(`${slugify(page?.title ?? "page")}.md`, exportPageMarkdown(pageId), "text/markdown");
  };

  const onPdfExport = () => {
    printPagePdf(page?.title ?? "Stones page", exportPageMarkdown(pageId));
  };

  const onExport = () => downloadText(`stones-backup-${todayIso()}.json`, JSON.stringify(exportBackup(), null, 2), "application/json");

  const onImport = async (file) => {
    if (!file) return;
    await importBackup(JSON.parse(await file.text()));
  };

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
      <section className="bento-card span-4 bg-[#21caff] p-5 dark:bg-[#001a25]">
        <p className="mb-3 text-xs font-black uppercase tracking-wide text-black/70 dark:text-[#7a7670]">Export and backup</p>
        <div className="flex gap-2 flex-wrap">
          <HeaderButton icon={FileDown} label="MD" onClick={onMarkdownExport} />
          <HeaderButton icon={Printer} label="PDF" onClick={onPdfExport} />
          <HeaderButton icon={Download} label="Backup" onClick={onExport} />
          <HeaderButton icon={Upload} label="Restore" onClick={() => fileInputRef.current?.click()} />
          <input accept="application/json" className="hidden" onChange={(event) => void onImport(event.target.files?.[0])} ref={fileInputRef} type="file" />
        </div>
      </section>
      <section className="span-12 flex flex-col gap-8">
        {pageBlocks.length ? (
          pageBlocks.map((block) => (
            <div key={block.id}>
              <BlockCard block={block} />
            </div>
          ))
        ) : (
          <div className="bento-card bg-[#2ef2a6] p-8 text-center dark:bg-[#0a3d28]">
            <p className="text-2xl font-black">No blocks match this search.</p>
          </div>
        )}
      </section>
    </div>
  );
}
