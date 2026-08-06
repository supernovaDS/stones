import { db } from "../../db/schema";
import { enqueueMutation } from "../../sync/syncQueue";
import { downloadText, slugify } from "../../utils/helpers";
import {
  createId,
  normalizeBlock,
  nowIso,
  pushUndoSnapshot,
  replaceWorkspaceData,
  resetUndoDebounce,
  sortBlocks,
  sortSections
} from "../storeHelpers";

export const createRecoverySlice = (set, get) => ({
  undoStack: [],
  diaryUndoStack: [],
  recentlyDeleted: [],
  deletedPagesBin: [],
  clipboard: [],

  undoLastChange: async () => {
    const isDiary = get().view === "diary";
    const stackKey = isDiary ? "diaryUndoStack" : "undoStack";
    const stack = get()[stackKey];
    const [snapshot, ...rest] = stack;
    if (!snapshot) return;

    try {
      await replaceWorkspaceData(snapshot.data);
      set({
        ...snapshot.data,
        blocks: sortBlocks((snapshot.data.blocks ?? []).map(normalizeBlock)),
        sections: sortSections(snapshot.data.sections ?? []),
        [stackKey]: rest,
        selectedTaskId: undefined
      });
      resetUndoDebounce();
      get().setNotification(`Undid ${snapshot.label}`);
    } catch (err) {
      console.error("Undo failed:", err);
      get().setNotification(`Undo failed: ${err.message}`);
    }
  },

  restoreDeletedItem: async (itemId) => {
    const item = get().recentlyDeleted.find((entry) => entry.id === itemId);
    if (!item) return;

    pushUndoSnapshot(get, set, `restore ${item.label}`);
    if (item.type === "block") {
      await db.blocks.put(item.payload.block);
      await enqueueMutation("block", item.payload.block.id, "upsert", item.payload.block);
      set((state) => ({
        blocks: sortBlocks([...state.blocks, normalizeBlock(item.payload.block)]),
        recentlyDeleted: state.recentlyDeleted.filter((entry) => entry.id !== itemId)
      }));
    }
    if (item.type === "page") {
      await db.transaction("rw", db.pages, db.blocks, async () => {
        await db.pages.put(item.payload.page);
        await db.blocks.bulkPut(item.payload.blocks ?? []);
      });
      set((state) => ({
        pages: [...state.pages, item.payload.page],
        blocks: sortBlocks([
          ...state.blocks,
          ...(item.payload.blocks ?? []).map(normalizeBlock)
        ]),
        recentlyDeleted: state.recentlyDeleted.filter((entry) => entry.id !== itemId)
      }));
    }
    if (item.type === "section") {
      await db.transaction("rw", db.sections, db.pages, db.blocks, async () => {
        await db.sections.put(item.payload.section);
        await db.pages.bulkPut(item.payload.pages ?? []);
        await db.blocks.bulkPut(item.payload.blocks ?? []);
      });
      set((state) => ({
        sections: sortSections([...state.sections, item.payload.section]),
        pages: [...state.pages, ...(item.payload.pages ?? [])],
        blocks: sortBlocks([
          ...state.blocks,
          ...(item.payload.blocks ?? []).map(normalizeBlock)
        ]),
        recentlyDeleted: state.recentlyDeleted.filter((entry) => entry.id !== itemId)
      }));
    }
    get().setNotification(`${item.label} restored`);
  },

  dismissDeletedItem: (itemId) =>
    set((state) => ({
      recentlyDeleted: state.recentlyDeleted.filter((entry) => entry.id !== itemId)
    })),

  clearDeletedPagesBin: async () => {
    await db.settings.put({ key: "deletedPagesBin", value: [] });
    set({ deletedPagesBin: [] });
    get().setNotification("Trash bin cleared");
  },

  restorePageFromBin: async (binId) => {
    const entry = (get().deletedPagesBin || []).find((b) => b.id === binId);
    if (!entry) return;

    pushUndoSnapshot(get, set, `restore page ${entry.page?.title}`);

    await db.transaction("rw", db.pages, db.blocks, async () => {
      await db.pages.put(entry.page);
      if (entry.blocks && entry.blocks.length > 0) {
        await db.blocks.bulkPut(entry.blocks);
      }
    });

    await enqueueMutation("page", entry.page.id, "upsert", entry.page);
    for (const b of entry.blocks || []) {
      await enqueueMutation("block", b.id, "upsert", b);
    }

    const newBin = (get().deletedPagesBin || []).filter((b) => b.id !== binId);
    await db.settings.put({ key: "deletedPagesBin", value: newBin });

    set((state) => ({
      pages: [...state.pages, entry.page],
      blocks: sortBlocks([
        ...state.blocks,
        ...(entry.blocks || []).map(normalizeBlock)
      ]),
      activePageId: entry.page.id,
      deletedPagesBin: newBin
    }));

    get().setNotification(`Page "${entry.page?.title}" restored`);
  },

  permanentlyDeleteFromBin: async (binId) => {
    const newBin = (get().deletedPagesBin || []).filter((b) => b.id !== binId);
    await db.settings.put({ key: "deletedPagesBin", value: newBin });
    set({ deletedPagesBin: newBin });
    get().setNotification("Page permanently deleted");
  },

  exportBackup: () => {
    const payload = {
      workspaces: get().workspaces,
      sections: get().sections,
      pages: get().pages,
      blocks: get().blocks,
      version: 1,
      exportedAt: nowIso()
    };
    downloadText(
      `stones-backup-${nowIso().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
    get().setNotification("Backup exported");
  },

  importBackup: async (file) => {
    if (!file) return;
    try {
      const rawText = await file.text();
      const payload = JSON.parse(rawText);

      if (!Array.isArray(payload.workspaces) || !Array.isArray(payload.pages) || !Array.isArray(payload.blocks)) {
        throw new Error("Invalid backup file structure.");
      }

      pushUndoSnapshot(get, set, "import backup");
      await replaceWorkspaceData(payload);

      for (const w of payload.workspaces) await enqueueMutation("workspace", w.id, "upsert", w);
      for (const s of payload.sections ?? []) await enqueueMutation("section", s.id, "upsert", s);
      for (const p of payload.pages) await enqueueMutation("page", p.id, "upsert", p);
      for (const b of payload.blocks) await enqueueMutation("block", b.id, "upsert", b);

      set({
        workspaces: payload.workspaces,
        sections: sortSections(payload.sections ?? []),
        pages: payload.pages,
        blocks: sortBlocks((payload.blocks ?? []).map(normalizeBlock)),
        activePageId: payload.pages[0]?.id
      });

      get().setNotification("Backup imported successfully");
    } catch (err) {
      console.error("Backup import failed:", err);
      get().setNotification(`Import failed: ${err.message}`);
    }
  }
});
