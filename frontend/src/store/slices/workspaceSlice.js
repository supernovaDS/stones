import { db } from "../../db/schema";
import { enqueueMutation } from "../../sync/syncQueue";
import {
  checkAndEndExpiredRecurringTasks,
  createId,
  deduplicateSections,
  defaultSidebarHidden,
  defaultTheme,
  getUniquePageTitle,
  makeDeletedItem,
  normalizeBlock,
  nowIso,
  pushUndoSnapshot,
  seedData,
  sortBlocks,
  sortSections
} from "../storeHelpers";

export const createWorkspaceSlice = (set, get) => ({
  workspaces: [],
  sections: [],
  pages: [],
  view: "workspace",
  activePageId: undefined,
  selectedTaskId: undefined,
  loading: true,
  taskModalParams: null,

  setView: (view) => set({ view }),

  setActivePage: (pageId) => {
    set({ activePageId: pageId });
    get().setView("workspace");
  },

  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),
  openTaskModal: (params = {}) => set({ taskModalParams: params }),
  closeTaskModal: () => set({ taskModalParams: null }),

  initialize: async ({ skipSeed = false } = {}) => {
    set({ loading: true, error: undefined });

    let [workspaces, sections, pages, blocks] = await Promise.all([
      db.workspaces.toArray(),
      db.sections.toArray(),
      db.pages.toArray(),
      db.blocks.toArray()
    ]);

    if (workspaces.length === 0 && !skipSeed) {
      const seed = seedData();
      await db.transaction(
        "rw",
        db.workspaces,
        db.sections,
        async () => {
          await db.workspaces.add(seed.workspace);
          await db.sections.add(seed.section);
        }
      );

      workspaces = [seed.workspace];
      sections = [seed.section];
      pages = [];
      blocks = [];
    }

    sections = await deduplicateSections(sections);

    let sidebarHidden = defaultSidebarHidden();
    let theme = defaultTheme();
    let deletedPagesBin = [];
    let savedActivePageId = null;

    try {
      const sidebarRecord = await db.settings?.get("sidebarHidden");
      if (sidebarRecord) sidebarHidden = sidebarRecord.value;

      const themeRecord = await db.settings?.get("theme");
      if (themeRecord) theme = themeRecord.value;

      const activePageRecord = await db.settings?.get("activePageId");
      if (activePageRecord) savedActivePageId = activePageRecord.value;

      const binRecord = await db.settings?.get("deletedPagesBin");
      if (binRecord) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const parsedBin = Array.isArray(binRecord.value) ? binRecord.value : [];
        const activeBin = parsedBin.filter(item => item.deletedAt >= thirtyDaysAgo);
        
        if (activeBin.length !== parsedBin.length) {
          await db.settings.put({ key: "deletedPagesBin", value: activeBin });
        }
        deletedPagesBin = activeBin;
      }
    } catch (err) {
      console.warn("Failed to load settings:", err);
    }

    const pageIdSet = new Set(pages.map(p => p.id));
    const resolvedActivePageId = (savedActivePageId && pageIdSet.has(savedActivePageId))
      ? savedActivePageId
      : pages[0]?.id;

    const processedBlocks = await checkAndEndExpiredRecurringTasks(blocks);
    set({
      workspaces,
      sections: sortSections(sections),
      pages,
      blocks: sortBlocks(processedBlocks.map(normalizeBlock)),
      activePageId: resolvedActivePageId,
      loading: false,
      sidebarHidden,
      theme,
      deletedPagesBin
    });
  },

  syncDbUpdates: async () => {
    let [dbWorkspaces, dbSections, dbPages, dbBlocks] = await Promise.all([
      db.workspaces.toArray(),
      db.sections.toArray(),
      db.pages.toArray(),
      db.blocks.toArray()
    ]);

    if (dbWorkspaces.length === 0) return;

    dbSections = await deduplicateSections(dbSections);

    dbBlocks = await checkAndEndExpiredRecurringTasks(dbBlocks);

    set((state) => {
      const memWorkspaceMap = new Map(state.workspaces.map((w) => [w.id, w]));
      const memSectionMap = new Map(state.sections.map((s) => [s.id, s]));
      const memPageMap = new Map(state.pages.map((p) => [p.id, p]));
      const memBlockMap = new Map(state.blocks.map((b) => [b.id, b]));

      const mergedWorkspaces = dbWorkspaces.map((dbW) => {
        const memW = memWorkspaceMap.get(dbW.id);
        if (!memW) return dbW;
        if (memW.updatedAt && memW.updatedAt >= (dbW.updatedAt || "")) return memW;
        return dbW;
      });

      const mergedSections = dbSections.map((dbS) => {
        const memS = memSectionMap.get(dbS.id);
        if (!memS) return dbS;
        if (memS.updatedAt && memS.updatedAt >= (dbS.updatedAt || "")) return memS;
        return dbS;
      });

      const mergedPages = dbPages.map((dbP) => {
        const memP = memPageMap.get(dbP.id);
        if (!memP) return dbP;
        if (memP.updatedAt && memP.updatedAt >= (dbP.updatedAt || "")) return memP;
        return dbP;
      });

      const mergedBlocks = dbBlocks.map((dbB) => {
        const memB = memBlockMap.get(dbB.id);
        if (!memB) return normalizeBlock(dbB);
        const memUpdated = memB.metadata?.updatedAt || "";
        const dbUpdated = dbB.metadata?.updatedAt || "";
        if (memUpdated && memUpdated >= dbUpdated) return memB;
        return normalizeBlock(dbB);
      });

      return {
        workspaces: mergedWorkspaces,
        sections: sortSections(mergedSections),
        pages: mergedPages,
        blocks: sortBlocks(mergedBlocks),
        activePageId: state.activePageId || mergedPages[0]?.id
      };
    });
  },

  createSection: async (title = "New section") => {
    const workspaceId = get().workspaces[0]?.id;
    if (!workspaceId) return;

    pushUndoSnapshot(get, set, "create section");
    const createdAt = nowIso();
    const section = {
      id: createId("section"),
      workspaceId,
      title,
      order: get().sections.length + 1,
      createdAt,
      updatedAt: createdAt
    };
    await db.sections.add(section);
    await enqueueMutation("section", section.id, "upsert", section);
    set((state) => ({ sections: sortSections([...state.sections, section]) }));
  },

  renameSection: async (sectionId, title) => {
    const updatedAt = nowIso();
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === sectionId ? { ...section, title, updatedAt } : section
      )
    }));
    await db.sections.update(sectionId, { title, updatedAt });
    const updated = get().sections.find((s) => s.id === sectionId);
    if (updated) await enqueueMutation("section", sectionId, "upsert", { ...updated, title, updatedAt });
  },

  deleteSection: async (sectionId) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section) return;

    pushUndoSnapshot(get, set, `delete ${section.title}`);
    const pagesToDelete = get().pages.filter((p) => p.sectionId === sectionId);
    const pageIds = new Set(pagesToDelete.map((p) => p.id));
    const blocksToDelete = get().blocks.filter((b) => pageIds.has(b.pageId));

    await db.transaction("rw", db.sections, db.pages, db.blocks, async () => {
      await db.sections.delete(sectionId);
      for (const p of pagesToDelete) await db.pages.delete(p.id);
      for (const b of blocksToDelete) await db.blocks.delete(b.id);
    });

    await enqueueMutation("section", sectionId, "delete", section);
    for (const p of pagesToDelete) await enqueueMutation("page", p.id, "delete", p);
    for (const b of blocksToDelete) await enqueueMutation("block", b.id, "delete", b);

    const deletedItem = makeDeletedItem(
      "section",
      `Section "${section.title}"`,
      { section, pages: pagesToDelete, blocks: blocksToDelete },
      get().view
    );

    set((state) => ({
      sections: state.sections.filter((s) => s.id !== sectionId),
      pages: state.pages.filter((p) => !pageIds.has(p.id)),
      blocks: state.blocks.filter((b) => !pageIds.has(b.pageId)),
      recentlyDeleted: [deletedItem, ...state.recentlyDeleted]
    }));
  },

  createPage: async (sectionId = null, title = "Untitled page") => {
    const workspaceId = get().workspaces[0]?.id;
    if (!workspaceId) return;

    pushUndoSnapshot(get, set, "create page");
    const createdAt = nowIso();
    const uniqueTitle = getUniquePageTitle(title, get().pages);
    const page = {
      id: createId("page"),
      workspaceId,
      sectionId,
      title: uniqueTitle,
      createdAt,
      updatedAt: createdAt
    };

    await db.pages.add(page);
    await enqueueMutation("page", page.id, "upsert", page);
    set((state) => ({
      pages: [...state.pages, page],
      activePageId: page.id
    }));
    get().setView("workspace");
    get().setNotification(`Page "${title}" created`);
  },

  movePageToSection: async (pageId, sectionId) => {
    const updatedAt = nowIso();
    await db.pages.update(pageId, { sectionId, updatedAt });
    const page = get().pages.find((p) => p.id === pageId);
    if (page) await enqueueMutation("page", pageId, "upsert", { ...page, sectionId, updatedAt });
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId ? { ...page, sectionId, updatedAt } : page
      )
    }));
  },

  renamePage: async (pageId, title) => {
    const updatedAt = nowIso();
    const uniqueTitle = getUniquePageTitle(title, get().pages, pageId);
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId ? { ...page, title: uniqueTitle, updatedAt } : page
      )
    }));
    await db.pages.update(pageId, { title: uniqueTitle, updatedAt });
    const page = get().pages.find((p) => p.id === pageId);
    if (page) await enqueueMutation("page", pageId, "upsert", { ...page, title: uniqueTitle, updatedAt });
  },

  deletePage: async (pageId) => {
    const page = get().pages.find((item) => item.id === pageId);
    if (!page) return;

    pushUndoSnapshot(get, set, `delete ${page.title}`);
    const blocksToDelete = get().blocks.filter((item) => item.pageId === pageId);

    await db.transaction("rw", db.pages, db.blocks, async () => {
      await db.pages.delete(pageId);
      for (const block of blocksToDelete) {
        await db.blocks.delete(block.id);
      }
    });

    await enqueueMutation("page", pageId, "delete", page);
    for (const block of blocksToDelete) {
      await enqueueMutation("block", block.id, "delete", block);
    }

    const currentPages = get().pages;
    const remainingPages = currentPages.filter((item) => item.id !== pageId);
    const nextActiveId = remainingPages[0]?.id || null;

    const deletedItem = makeDeletedItem(
      "page",
      `Page "${page.title}"`,
      { page, blocks: blocksToDelete },
      get().view
    );

    const binEntry = {
      id: createId("bin"),
      page,
      blocks: blocksToDelete,
      deletedAt: nowIso()
    };

    const newBin = [binEntry, ...(get().deletedPagesBin || [])];
    await db.settings.put({ key: "deletedPagesBin", value: newBin });

    set((state) => ({
      pages: remainingPages,
      blocks: state.blocks.filter((item) => item.pageId !== pageId),
      activePageId: nextActiveId ?? undefined,
      recentlyDeleted: [deletedItem, ...state.recentlyDeleted],
      deletedPagesBin: newBin
    }));
    get().setNotification(`Page "${page.title}" moved to trash`);
  },

  exportPageMarkdown: (pageId = get().activePageId) => {
    const page = get().pages.find((p) => p.id === pageId);
    if (!page) return "";
    const pageBlocks = get().blocks.filter((b) => b.pageId === pageId);
    return pageBlocks.map((b) => b.content?.text || b.content?.title || "").join("\n\n");
  }
});
