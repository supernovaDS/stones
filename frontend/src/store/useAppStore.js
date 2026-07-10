import { create } from "zustand";
import { db, setActiveDiaryKey, activeDiaryKey as getActiveDiaryKey, originalPagesBulkAdd, originalBlocksBulkPut, setBypassEncryption } from "../db/schema";
import { deleteTaskImage, uploadTaskImage } from "../services/imageUploadService";
import { enqueueMutation } from "../sync/syncQueue";
import {
  nextRecurringDate,
  normalizeDateText,
  todayIso,
  todayPageTitle
} from "../utils/date";
import { getVirtualTasksForDate } from "../utils/recurrence";
import { createUuid } from "../utils/ids";
import { legacyHashPassword } from "../utils/helpers";
import { deriveHash, deriveKey, decryptString, decryptObject, encryptString, encryptObject, isEncryptedObject, isEncryptedString, getDeterministicSalt } from "../utils/crypto";
import { supabase } from "../lib/supabaseClient";

const createId = (prefix) => `${prefix}_${createUuid()}`;

const nowIso = () => new Date().toISOString();
const sortBlocks = (blocks) => [...blocks].sort((a, b) => a.order - b.order);
const sortSections = (sections) =>
  [...sections].sort((a, b) => a.order - b.order);

const defaultTheme = () => localStorage.getItem("stones-theme") ?? "light";
const defaultColorProfile = () => localStorage.getItem("stones-color-profile") ?? "neo";
const defaultSidebarHidden = () => localStorage.getItem("stones-sidebar-hidden") === "true";
const defaultHideActivePageBlock = () => localStorage.getItem("stones-hide-active-page-block") === "true";
const defaultHideWeatherBlock = () => localStorage.getItem("stones-hide-weather-block") === "true";

const getUniquePageTitle = (baseTitle, existingPages, excludeId = null) => {
  let title = baseTitle;
  let counter = 1;
  while (existingPages.some((p) => p.title === title && p.id !== excludeId)) {
    title = `${baseTitle} (${counter})`;
    counter++;
  }
  return title;
};

const seedData = () => {
  const createdAt = nowIso();
  const workspace = {
    id: createId("workspace"),
    title: "Personal Workspace",
    createdAt
  };
  const section = {
    id: createId("section"),
    workspaceId: workspace.id,
    title: "General",
    order: 1,
    createdAt,
    updatedAt: createdAt
  };
  return { workspace, section };
};

export const useAppStore = create((set, get) => ({
  workspaces: [],
  sections: [],
  pages: [],
  blocks: [],
  view: "workspace",
  loading: true,
  error: undefined,
  settingsOpen: false,
  selectedTaskId: undefined,
  notification: undefined,
  taskModalParams: null,
  undoStack: [],
  diaryUndoStack: [],
  recentlyDeleted: [],
  clipboard: [],
  theme: defaultTheme(),
  colorProfile: defaultColorProfile(),
  contextMenu: { visible: false, x: 0, y: 0, blockId: null },
  deletedPagesBin: [],

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  showContextMenu: (x, y, blockId) => set({ contextMenu: { visible: true, x, y, blockId } }),
  hideContextMenu: () => set({ contextMenu: { visible: false, x: 0, y: 0, blockId: null } }),
  recurringTasksOpen: false,
  setRecurringTasksOpen: (recurringTasksOpen) => set({ recurringTasksOpen }),
  recycleBinOpen: false,
  setRecycleBinOpen: (recycleBinOpen) => set({ recycleBinOpen }),
  recoveryOpen: false,
  setRecoveryOpen: (recoveryOpen) => set({ recoveryOpen }),
  sidebarHidden: defaultSidebarHidden(),
  setSidebarHidden: async (sidebarHidden) => {
    localStorage.setItem("stones-sidebar-hidden", String(sidebarHidden));
    await db.settings.put({ key: "sidebarHidden", value: sidebarHidden });
    set({ sidebarHidden });
  },
  hideActivePageBlock: defaultHideActivePageBlock(),
  setHideActivePageBlock: async (hideActivePageBlock) => {
    localStorage.setItem("stones-hide-active-page-block", String(hideActivePageBlock));
    await db.settings.put({ key: "hideActivePageBlock", value: hideActivePageBlock });
    set({ hideActivePageBlock });
  },
  hideWeatherBlock: defaultHideWeatherBlock(),
  setHideWeatherBlock: async (hideWeatherBlock) => {
    localStorage.setItem("stones-hide-weather-block", String(hideWeatherBlock));
    await db.settings.put({ key: "hideWeatherBlock", value: hideWeatherBlock });
    set({ hideWeatherBlock });
  },
  editingRepeatedTaskId: null,
  setEditingRepeatedTaskId: (editingRepeatedTaskId) => set({ editingRepeatedTaskId }),

  // ── Diary Feature ───────────────────────────────────────────────
  diaryPasswordHash: null,
  diaryKey: null,
  diaryAuthenticated: false,
  activeDiaryPageId: null,

  setDiaryPassword: async (password) => {
    let userId = "local";
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) userId = session.user.id;
    }
    
    const salt = getDeterministicSalt(userId);
    const hash = await deriveHash(password, salt);
    const key = await deriveKey(password, salt);
    
    await db.settings.put({ key: "diaryPasswordHash", value: hash });
    await db.settings.put({ key: "diarySalt", value: salt });
    
    setActiveDiaryKey(key);

    // Encrypt any existing data by reading and writing it back
    // (the monkey-patched db.put automatically encrypts if activeDiaryKey is set)
    const diaryPages = await db.pages.filter(p => p.workspaceId === "diary").toArray();
    for (const p of diaryPages) {
       await db.pages.put(p);
    }
    const diaryPageIds = new Set(diaryPages.map(p => p.id));
    const diaryBlocks = await db.blocks.filter(b => diaryPageIds.has(b.pageId)).toArray();
    for (const b of diaryBlocks) {
       await db.blocks.put(b);
    }

    set({ diaryPasswordHash: hash, diaryKey: key, diaryAuthenticated: true });
  },

  authenticateDiary: async (password) => {
    const { diaryPasswordHash, pages, blocks } = get();
    
    let isMatch = false;
    let salt = null;

    let userId = "local";
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) userId = session.user.id;
    }
    const defaultSalt = getDeterministicSalt(userId);

    let saltRecord = await db.settings.get("diarySalt");
    salt = saltRecord?.value || defaultSalt;

    const hash = await deriveHash(password, salt);
    const legacyHash = await legacyHashPassword(password);

    if (diaryPasswordHash) {
      if (hash === diaryPasswordHash) {
        isMatch = true;
      } else if (legacyHash === diaryPasswordHash) {
        // Transparently upgrade legacy hash
        isMatch = true;
        await db.settings.put({ key: "diaryPasswordHash", value: hash });
        await db.settings.put({ key: "diarySalt", value: salt });
        set({ diaryPasswordHash: hash });
      }
    } else {
      // If diaryPasswordHash is null, but we have synced pages, we try to derive the key and decrypt
      const diaryPages = pages.filter(p => p.workspaceId === "diary");
      if (diaryPages.length > 0) {
        const testKey = await deriveKey(password, salt);
        // Find an encrypted page to test decryption
        const encryptedPage = diaryPages.find(p => isEncryptedString(p.title));
        const encryptedBlock = blocks.find(b => {
          const p = pages.find(page => page.id === b.pageId);
          return p?.workspaceId === "diary" && isEncryptedObject(b.content);
        });

        if (encryptedPage || encryptedBlock) {
          try {
            if (encryptedPage) {
              await decryptString(encryptedPage.title, testKey);
            } else {
              await decryptObject(encryptedBlock.content, testKey);
            }
            isMatch = true;
            // Success! Save hash and salt locally
            await db.settings.put({ key: "diaryPasswordHash", value: hash });
            await db.settings.put({ key: "diarySalt", value: salt });
            set({ diaryPasswordHash: hash });
          } catch (e) {
            isMatch = false;
          }
        } else {
          // If no encrypted pages/blocks are found, we cannot verify the password.
          // Return false. The UI will force the user to setup a new password instead.
          isMatch = false;
        }
      }
    }

    if (isMatch && salt) {
      const key = await deriveKey(password, salt);
      setActiveDiaryKey(key);
      
      const { pages: newPages, blocks: newBlocks } = await decryptDiaryData(pages, blocks, key);
      
      set({ diaryAuthenticated: true, diaryKey: key, pages: newPages, blocks: newBlocks });
      return true;
    }
    return false;
  },

  setActiveDiaryPage: (pageId) => set({ activeDiaryPageId: pageId }),

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

    // Removed forced section migration since sections are now optional.
    
    // Load other settings
    let diaryHash = null;
    let sidebarHidden = defaultSidebarHidden();
    let hideActivePageBlock = defaultHideActivePageBlock();
    let hideWeatherBlock = defaultHideWeatherBlock();
    let colorProfile = defaultColorProfile();
    let theme = defaultTheme();
    let deletedPagesBin = [];

    try {
      const hashRecord = await db.settings?.get("diaryPasswordHash");
      if (hashRecord) diaryHash = hashRecord.value;

      const sidebarRecord = await db.settings?.get("sidebarHidden");
      if (sidebarRecord) sidebarHidden = sidebarRecord.value;

      const hideActivePageRecord = await db.settings?.get("hideActivePageBlock");
      if (hideActivePageRecord) hideActivePageBlock = hideActivePageRecord.value;

      const hideWeatherRecord = await db.settings?.get("hideWeatherBlock");
      if (hideWeatherRecord) hideWeatherBlock = hideWeatherRecord.value;

      const colorProfileRecord = await db.settings?.get("colorProfile");
      if (colorProfileRecord) colorProfile = colorProfileRecord.value;

      const themeRecord = await db.settings?.get("theme");
      if (themeRecord) theme = themeRecord.value;

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

    const processedBlocks = await checkAndEndExpiredRecurringTasks(blocks);
    set({
      workspaces,
      sections: sortSections(sections),
      pages,
      blocks: sortBlocks(processedBlocks.map(normalizeBlock)),
      activePageId: pages[0]?.id,
      loading: false,
      diaryPasswordHash: diaryHash,
      sidebarHidden,
      hideActivePageBlock,
      hideWeatherBlock,
      colorProfile,
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

    // If there are no workspaces after a sync completes, this is a brand new user.
    // Seed default workspace and section so they don't start with a blank app.
    if (dbWorkspaces.length === 0) {
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

      // Re-read arrays from Dexie
      [dbWorkspaces, dbSections] = await Promise.all([
        db.workspaces.toArray(),
        db.sections.toArray()
      ]);

      // Enqueue sync mutations to push the seed records to Supabase
      void enqueueMutation("workspace", seed.workspace.id, "upsert", seed.workspace);
      void enqueueMutation("section", seed.section.id, "upsert", seed.section);
    }

    const { diaryKey } = get();
    if (diaryKey) {
      const decrypted = await decryptDiaryData(dbPages, dbBlocks, diaryKey);
      dbPages = decrypted.pages;
      dbBlocks = decrypted.blocks;
    }

    dbBlocks = await checkAndEndExpiredRecurringTasks(dbBlocks);

    set((state) => {
      // Build lookup maps from current in-memory state
      const memWorkspaceMap = new Map(state.workspaces.map((w) => [w.id, w]));
      const memSectionMap = new Map(state.sections.map((s) => [s.id, s]));
      const memPageMap = new Map(state.pages.map((p) => [p.id, p]));
      const memBlockMap = new Map(state.blocks.map((b) => [b.id, b]));

      // Merge workspaces: take DB version only if it's newer
      const mergedWorkspaces = dbWorkspaces.map((dbW) => {
        const memW = memWorkspaceMap.get(dbW.id);
        if (!memW) return dbW;
        // If in-memory is same age or newer, keep it
        if (memW.updatedAt && memW.updatedAt >= (dbW.updatedAt || "")) return memW;
        return dbW;
      });

      // Merge sections
      const mergedSections = dbSections.map((dbS) => {
        const memS = memSectionMap.get(dbS.id);
        if (!memS) return dbS;
        if (memS.updatedAt && memS.updatedAt >= (dbS.updatedAt || "")) return memS;
        return dbS;
      });

      // Merge pages
      const mergedPages = dbPages.map((dbP) => {
        const memP = memPageMap.get(dbP.id);
        if (!memP) return dbP;
        if (memP.updatedAt && memP.updatedAt >= (dbP.updatedAt || "")) return memP;
        return dbP;
      });

      // Merge blocks: use metadata.updatedAt for comparison
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

  setView: (view) => {
    if (view !== "diary") {
      const wasDiary = get().view === "diary";
      // When leaving diary, purge diary undo stack and diary deleted items for privacy
      const diaryUndoStack = wasDiary ? [] : get().diaryUndoStack;
      const recentlyDeleted = wasDiary
        ? get().recentlyDeleted.filter((s) => s.view !== "diary")
        : get().recentlyDeleted;
      set({ view, diaryAuthenticated: false, diaryUndoStack, recentlyDeleted });
    } else {
      set({ view });
    }
  },
  setActivePage: (pageId) => {
    set({ activePageId: pageId });
    get().setView("workspace");
  },
  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),
  openTaskModal: (params = {}) => set({ taskModalParams: params }),
  closeTaskModal: () => set({ taskModalParams: null }),
  setTheme: async (theme) => {
    localStorage.setItem("stones-theme", theme);
    await db.settings.put({ key: "theme", value: theme });
    set({ theme });
  },
  setColorProfile: async (colorProfile) => {
    localStorage.setItem("stones-color-profile", colorProfile);
    await db.settings.put({ key: "colorProfile", value: colorProfile });
    set({ colorProfile });
  },
  setNotification: (msg) => {
    set({ notification: msg });
    setTimeout(() => {
      if (useAppStore.getState().notification === msg) {
        set({ notification: undefined });
      }
    }, 3000);
  },
  setError: (msg) => {
    set({ error: msg });
    if (msg) {
      setTimeout(() => {
        if (useAppStore.getState().error === msg) {
          set({ error: undefined });
        }
      }, 3000);
    }
  },

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
      // Reset debounce so the next edit after undo creates a fresh snapshot
      _lastUndoLabel = null;
      _lastUndoTime = 0;
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

  addDiaryPage: async (title) => {
    pushUndoSnapshot(get, set, "create diary page");
    const createdAt = nowIso();
    const uniqueTitle = getUniquePageTitle(title, get().pages);
    const page = {
      id: createId("page"),
      workspaceId: "diary",
      sectionId: null,
      title: uniqueTitle,
      createdAt,
      updatedAt: createdAt
    };

    await db.pages.add(page);
    // Sync logic might not apply to local-only diary, but adding it just in case
    await enqueueMutation("page", page.id, "upsert", page);
    set((state) => ({
      pages: [...state.pages, page],
      activeDiaryPageId: page.id
    }));
    get().setNotification(`Diary page "${title}" created`);
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

  addTitleBlock: async (pageId = get().activePageId) =>
    addBlock(get, set, pageId, "title", { text: "" }),

  addNoteBlock: async (pageId = get().activePageId) =>
    addBlock(get, set, pageId, "note", { text: "" }),

  addTaskBlock: async (taskData) => {
    const pageId = taskData.pageId || get().activePageId;
    if (!pageId) return;
    return addBlock(
      get,
      set,
      pageId,
      "task",
      { title: taskData.title, notes: taskData.notes || "", subtasks: [], dependencyIds: [] },
      { completed: false, priority: taskData.priority || "medium", recurrence: "none", deadline: taskData.deadline },
      { sourceBlockId: taskData.sourceBlockId }
    );
  },

  addChecklistBlock: async (pageId = get().activePageId) =>
    addBlock(get, set, pageId, "checklist", {
      items: [{ id: createId("item"), text: "Checklist item", completed: false }]
    }),

  addCodeBlock: async (pageId = get().activePageId) =>
    addBlock(get, set, pageId, "code", {
      language: "javascript",
      code: "// Write code here"
    }),

  addLinkBlock: async (pageId = get().activePageId) => {
    const linkId = createId("link-item");
    return addBlock(get, set, pageId, "link", {
      title: "Useful link",
      url: "https://example.com",
      links: [{ id: linkId, title: "Useful link", url: "https://example.com" }]
    });
  },

  addImageBlock: async (file, pageId = get().activePageId) => {
    if (!file || !pageId) return;
    const dataUrl = await fileToDataUrl(file);
    await addBlock(get, set, pageId, "image", {
      name: file.name,
      dataUrl,
      caption: ""
    });
  },

  updateBlockContent: async (blockId, patch) => {
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block) return;

    pushUndoSnapshot(get, set, `edit ${block.type}`);
    const updatedAt = nowIso();
    const updatedBlock = {
      ...block,
      content: { ...block.content, ...patch },
      metadata: { ...block.metadata, updatedAt }
    };
    set((state) => ({
      blocks: state.blocks.map((item) =>
        item.id === blockId ? updatedBlock : item
      )
    }));
    await db.blocks.put(updatedBlock);
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
  },

  updateNote: async (blockId, text) => get().updateBlockContent(blockId, { text }),

  updateTask: async (blockId, patch) => {
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block || block.type !== "task") return;

    pushUndoSnapshot(get, set, "edit task");
    const updatedAt = nowIso();
    const contentPatch = {};
    for (const key of ["title", "notes", "subtasks", "dependencyIds"]) {
      if (key in patch) contentPatch[key] = patch[key];
    }
    const metadataPatch = {};
    for (const key of [
      "priority",
      "recurrence",
      "deadline",
      "endDate",
      "scheduledDate",
      "scheduledStart",
      "scheduledEnd",
      "reminderAt",
      "customRecurrenceInterval"
    ]) {
      if (key in patch) {
        metadataPatch[key] = patch[key] || undefined;
      }
    }
    if ("customRecurrenceInterval" in metadataPatch) {
      metadataPatch.customRecurrenceInterval = Math.max(
        1,
        Number(metadataPatch.customRecurrenceInterval ?? 1)
      );
    }
    if ("recurrence" in metadataPatch) {
      metadataPatch.recurrence = metadataPatch.recurrence || "none";
    }

    const updatedBlock = {
      ...block,
      content: { ...block.content, ...contentPatch },
      metadata: {
        ...block.metadata,
        ...metadataPatch,
        updatedAt
      }
    };

    set((state) => ({
      blocks: sortBlocks(
        state.blocks.map((item) =>
          item.id === blockId ? updatedBlock : item
        )
      )
    }));
    await db.blocks.put(updatedBlock);
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
  },

  addSubtask: async (taskId) => {
    let task;
    const { isVirtual, templateId, dateStr } = parseVirtualTaskId(taskId);

    if (isVirtual) {
      const virtualTasks = getVirtualTasksForDate(dateStr, get().blocks);
      task = virtualTasks.find((t) => t.id === taskId);
    } else {
      task = get().blocks.find((block) => block.id === taskId);
    }
    
    if (!task || task.type !== "task") return;
    
    const nextSubtasks = [
      ...(task.content.subtasks ?? []),
      { id: createId("subtask"), text: "New subtask", completed: false }
    ];

    if (isVirtual) {
      await upsertRecurringInstance(templateId, dateStr, nextSubtasks, get, set);
    } else {
      await get().updateTask(taskId, {
        subtasks: nextSubtasks
      });
    }
  },

  updateSubtask: async (taskId, subtaskId, patch) => {
    let task;
    const { isVirtual, templateId, dateStr } = parseVirtualTaskId(taskId);
    if (isVirtual) {
      const virtualTasks = getVirtualTasksForDate(dateStr, get().blocks);
      task = virtualTasks.find(t => t.id === taskId);
    } else {
      task = get().blocks.find((block) => block.id === taskId);
    }
    
    if (!task || task.type !== "task") return;
    
    const nextSubtasks = (task.content.subtasks ?? []).map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, ...patch } : subtask
    );

    if (isVirtual) {
      await upsertRecurringInstance(templateId, dateStr, nextSubtasks, get, set);

      const hasIncompleteSubtasks = nextSubtasks.some((s) => !s.completed);
      if (hasIncompleteSubtasks && task.metadata.completed) {
        await get().toggleTask(taskId);
      } else if (!hasIncompleteSubtasks && !task.metadata.completed && nextSubtasks.length > 0) {
        await get().toggleTask(taskId);
      }
    } else {
      await get().updateTask(taskId, {
        subtasks: nextSubtasks
      });

      const hasIncompleteSubtasks = nextSubtasks.some((s) => !s.completed);
      if (hasIncompleteSubtasks && task.metadata.completed) {
        await get().toggleTask(taskId);
      } else if (!hasIncompleteSubtasks && !task.metadata.completed && nextSubtasks.length > 0) {
        await get().toggleTask(taskId);
      }
    }
  },

  deleteSubtask: async (taskId, subtaskId) => {
    let task;
    const { isVirtual, templateId, dateStr } = parseVirtualTaskId(taskId);
    if (isVirtual) {
      const virtualTasks = getVirtualTasksForDate(dateStr, get().blocks);
      task = virtualTasks.find(t => t.id === taskId);
    } else {
      task = get().blocks.find((block) => block.id === taskId);
    }
    
    if (!task || task.type !== "task") return;
    
    const nextSubtasks = (task.content.subtasks ?? []).filter(
      (subtask) => subtask.id !== subtaskId
    );

    if (isVirtual) {
      await upsertRecurringInstance(templateId, dateStr, nextSubtasks, get, set);
    } else {
      await get().updateTask(taskId, {
        subtasks: nextSubtasks
      });
    }
  },

  setTaskDependencies: async (taskId, dependencyIds) =>
    get().updateTask(taskId, { dependencyIds }),

  toggleTask: async (blockId) => {
    const { isVirtual, templateId, dateStr } = parseVirtualTaskId(blockId);
    if (isVirtual) {
      await get().toggleRepeatedTaskInstance(templateId, dateStr);
      return;
    }
    const updatedAt = nowIso();
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block || block.type !== "task") return;
    if (block.metadata.failed) {
      get().setError("Cannot complete a failed task. Unfail it first.");
      return;
    }

    const dependencies = block.content.dependencyIds ?? [];
    const blocked = dependencies.some((dependencyId) => {
      const dependency = get().blocks.find((item) => item.id === dependencyId);
      return dependency?.type === "task" && !dependency.metadata.completed;
    });
    if (!block.metadata.completed && blocked) {
      get().setError("Complete dependent tasks before closing this task.");
      return;
    }

    const subtasks = block.content.subtasks ?? [];
    const hasIncompleteSubtasks = subtasks.some((s) => !s.completed);
    if (!block.metadata.completed && hasIncompleteSubtasks) {
      get().setError("Complete all subtasks before closing this task.");
      return;
    }

    pushUndoSnapshot(get, set, "toggle task");
    const completed = !block.metadata.completed;
    const updatedBlock = {
      ...block,
      metadata: {
        ...block.metadata,
        completed,
        completedAt: completed ? updatedAt : undefined,
        updatedAt
      }
    };
    let nextTask = undefined;
    if (completed) {
      // Only create a recurring copy if one doesn't already exist
      // (prevents duplicates when un-checking then re-checking)
      const recurrence = block.metadata.recurrence ?? "none";
      if (recurrence !== "none") {
        const nextDeadline = nextRecurringDate(
          block.metadata.deadline,
          recurrence,
          block.metadata.customRecurrenceInterval
        );
        const endDate = block.metadata.endDate;
        const isAfterEnd = endDate && nextDeadline && nextDeadline.slice(0, 10) > endDate.slice(0, 10);
        
        const alreadyExists = nextDeadline && get().blocks.some(
          (b) =>
            b.type === "task" &&
            b.id !== blockId &&
            b.pageId === block.pageId &&
            b.content.title === block.content.title &&
            b.metadata.recurrence === recurrence &&
            !b.metadata.completed &&
            b.metadata.deadline === nextDeadline
        );
        if (!alreadyExists && !isAfterEnd) {
          nextTask = makeNextRecurringTask(block, updatedAt, get);
        }
      }
    }

    await db.transaction("rw", db.blocks, async () => {
      await db.blocks.put(updatedBlock);
      if (nextTask) await db.blocks.add(nextTask);
    });
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    if (nextTask) await enqueueMutation("block", nextTask.id, "upsert", nextTask);
    set((state) => ({
      error: undefined,
      blocks: sortBlocks(
        state.blocks
          .map((item) => (item.id === blockId ? updatedBlock : item))
          .concat(nextTask ? [nextTask] : [])
      )
    }));
  },

  toggleFailTask: async (blockId) => {
    const { isVirtual, templateId, dateStr } = parseVirtualTaskId(blockId);
    if (isVirtual) {
      await get().toggleRepeatedTaskInstanceFail(templateId, dateStr);
      return;
    }
    const updatedAt = nowIso();
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block || block.type !== "task") return;

    if (block.metadata.completed && !block.metadata.failed) {
      get().setError("Cannot fail a completed task. Incomplete it first.");
      return;
    }

    pushUndoSnapshot(get, set, "fail task");
    const failed = !block.metadata.failed;
    const updatedBlock = {
      ...block,
      metadata: {
        ...block.metadata,
        failed,
        completed: false, // ensure it's not completed if failed
        completedAt: undefined,
        updatedAt
      }
    };

    await db.blocks.put(updatedBlock);
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    set((state) => ({
      error: undefined,
      blocks: sortBlocks(
        state.blocks.map((item) => (item.id === blockId ? updatedBlock : item))
      )
    }));
  },

  toggleArchiveBlock: async (blockId) => {
    const updatedAt = nowIso();
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block) return;

    pushUndoSnapshot(get, set, "archive block");
    const archived = !block.metadata.archived;
    const updatedBlock = {
      ...block,
      metadata: {
        ...block.metadata,
        archived,
        updatedAt
      }
    };

    await db.blocks.put(updatedBlock);
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    set((state) => ({
      blocks: sortBlocks(
        state.blocks.map((item) => (item.id === blockId ? updatedBlock : item))
      )
    }));
    get().setNotification(archived ? "Block archived" : "Block unarchived");
  },

  addRepeatedTask: async (taskData) => {
    pushUndoSnapshot(get, set, "create repeated task");
    const createdAt = nowIso();
    const newTemplate = {
      id: createId("block"),
      pageId: "system-recurring-templates",
      type: "recurring_template",
      order: 0,
      content: {
        title: taskData.title,
        notes: taskData.notes || "",
        subtasks: taskData.subtasks || []
      },
      metadata: {
        priority: taskData.priority || "medium",
        recurrence: taskData.recurrence || "daily",
        customInterval: taskData.customInterval ? Number(taskData.customInterval) : undefined,
        customUnit: taskData.customUnit || undefined,
        startDate: taskData.startDate || todayIso(),
        endDate: taskData.endDate || undefined,
        deadlineTime: taskData.deadlineTime || undefined,
        createdAt,
        updatedAt: createdAt
      }
    };
    await db.blocks.add(newTemplate);
    await enqueueMutation("block", newTemplate.id, "upsert", newTemplate);
    set((current) => ({ blocks: sortBlocks([...current.blocks, newTemplate]) }));
    get().setNotification("Repeating task created");
  },

  updateRepeatedTask: async (id, taskData) => {
    const template = get().blocks.find(b => b.id === id);
    if (!template) return;
    pushUndoSnapshot(get, set, "update repeated task");
    const updatedAt = nowIso();
    const updatedTemplate = {
      ...template,
      content: {
        ...template.content,
        title: taskData.title,
        notes: taskData.notes || "",
        subtasks: taskData.subtasks || []
      },
      metadata: {
        ...template.metadata,
        priority: taskData.priority || "medium",
        recurrence: taskData.recurrence || "daily",
        customInterval: taskData.customInterval ? Number(taskData.customInterval) : undefined,
        customUnit: taskData.customUnit || undefined,
        startDate: taskData.startDate || template.metadata.startDate,
        endDate: taskData.endDate || undefined,
        deadlineTime: taskData.deadlineTime || undefined,
        updatedAt
      }
    };
    await db.blocks.put(updatedTemplate);
    await enqueueMutation("block", id, "upsert", updatedTemplate);
    set((current) => ({
      blocks: sortBlocks(current.blocks.map(b => b.id === id ? updatedTemplate : b))
    }));
    get().setNotification("Repeating task updated");
  },

  deleteRepeatedTask: async (id, deleteOptions = { completed: false, failed: false, due: false }) => {
    const template = get().blocks.find(b => b.id === id);
    if (!template) return;
    pushUndoSnapshot(get, set, "delete repeated task");

    // If only deleting future tasks, archive the template and stop it today
    if (!deleteOptions.completed && !deleteOptions.failed && !deleteOptions.due) {
      const updatedTemplate = {
        ...template,
        metadata: {
          ...template.metadata,
          isArchived: true,
          endDate: todayIso(),
        }
      };

      await db.transaction("rw", db.blocks, async () => {
        await db.blocks.put(updatedTemplate);
      });
      await enqueueMutation("block", updatedTemplate.id, "update", updatedTemplate);

      set((current) => ({
        blocks: current.blocks.map(b => b.id === updatedTemplate.id ? updatedTemplate : b)
      }));
      get().setNotification("Repeating task deleted from future");
      return;
    }
    
    // Find all completions/failures associated with this template if selected
    const completionsToDelete = deleteOptions.completed 
      ? get().blocks.filter(b => b.type === "completed_repeat" && b.content.templateId === id)
      : [];
      
    const failuresToDelete = deleteOptions.failed 
      ? get().blocks.filter(b => b.type === "failed_repeat" && b.content.templateId === id)
      : [];
      
    // Filter instance subtask lists based on selected options
    const instancesToDelete = get().blocks.filter(b => {
      if (b.type !== "recurring_instance" || b.content.templateId !== id) return false;
      const dateStr = b.content.dateStr;
      
      const isCompleted = get().blocks.some(comp => comp.type === "completed_repeat" && comp.content.templateId === id && comp.metadata.completedDate === dateStr);
      const isFailed = get().blocks.some(fail => fail.type === "failed_repeat" && fail.content.templateId === id && fail.metadata.failedDate === dateStr);
      
      if (isCompleted && deleteOptions.completed) return true;
      if (isFailed && deleteOptions.failed) return true;
      if (!isCompleted && !isFailed && deleteOptions.due) return true;
      
      return false;
    });
    
    await db.transaction("rw", db.blocks, async () => {
      await db.blocks.delete(id);
      for (const comp of completionsToDelete) {
        await db.blocks.delete(comp.id);
      }
      for (const fail of failuresToDelete) {
        await db.blocks.delete(fail.id);
      }
      for (const inst of instancesToDelete) {
        await db.blocks.delete(inst.id);
      }
    });

    await enqueueMutation("block", id, "delete", template);
    for (const comp of completionsToDelete) {
      await enqueueMutation("block", comp.id, "delete", comp);
    }
    for (const fail of failuresToDelete) {
      await enqueueMutation("block", fail.id, "delete", fail);
    }
    for (const inst of instancesToDelete) {
      await enqueueMutation("block", inst.id, "delete", inst);
    }

    const idsToDelete = new Set([
      id,
      ...completionsToDelete.map(c => c.id),
      ...failuresToDelete.map(f => f.id),
      ...instancesToDelete.map(i => i.id)
    ]);
    
    set((current) => ({
      blocks: sortBlocks(current.blocks.filter(b => !idsToDelete.has(b.id)))
    }));
    get().setNotification("Repeating task deleted");
  },

  pauseRepeatedTask: async (id) => {
    const template = get().blocks.find(b => b.id === id);
    if (!template) return;
    pushUndoSnapshot(get, set, "pause repeated task");
    const updatedAt = nowIso();
    const updatedTemplate = {
      ...template,
      metadata: {
        ...template.metadata,
        status: "paused",
        pausedAt: todayIso(),
        updatedAt
      }
    };
    await db.blocks.put(updatedTemplate);
    await enqueueMutation("block", id, "upsert", updatedTemplate);
    set((current) => ({
      blocks: sortBlocks(current.blocks.map(b => b.id === id ? updatedTemplate : b))
    }));
    get().setNotification("Repeating task paused");
  },

  resumeRepeatedTask: async (id) => {
    const template = get().blocks.find(b => b.id === id);
    if (!template) return;
    pushUndoSnapshot(get, set, "resume repeated task");
    const updatedAt = nowIso();
    
    // Remove pausedAt when resuming
    const { pausedAt, ...restMetadata } = template.metadata;
    const updatedTemplate = {
      ...template,
      metadata: {
        ...restMetadata,
        status: "active",
        startDate: todayIso(),
        updatedAt
      }
    };
    await db.blocks.put(updatedTemplate);
    await enqueueMutation("block", id, "upsert", updatedTemplate);
    set((current) => ({
      blocks: sortBlocks(current.blocks.map(b => b.id === id ? updatedTemplate : b))
    }));
    get().setNotification("Repeating task resumed");
  },

  endRepeatedTask: async (id) => {
    const template = get().blocks.find(b => b.id === id);
    if (!template) return;
    pushUndoSnapshot(get, set, "end repeated task");
    const updatedAt = nowIso();
    const updatedTemplate = {
      ...template,
      metadata: {
        ...template.metadata,
        status: "ended",
        endDate: todayIso(),
        updatedAt
      }
    };
    await db.blocks.put(updatedTemplate);
    await enqueueMutation("block", id, "upsert", updatedTemplate);
    set((current) => ({
      blocks: sortBlocks(current.blocks.map(b => b.id === id ? updatedTemplate : b))
    }));
    get().setNotification("Repeating task ended");
  },

  toggleRepeatedTaskInstance: async (templateId, dateStr) => {
    const compId = `comp_${templateId}_${dateStr}`;
    const failId = `fail_${templateId}_${dateStr}`;
    const existing = get().blocks.find(b => b.id === compId);
    const existingFail = get().blocks.find(b => b.id === failId);
    
    // Resolve the virtual task to check its subtasks
    const virtualTasks = getVirtualTasksForDate(dateStr, get().blocks);
    const task = virtualTasks.find(t => t.id === `virtual_${templateId}_${dateStr}`);
    
    if (task && task.metadata.failed) {
      get().setError("Cannot complete a failed task. Unfail it first.");
      return;
    }

    if (!existing && task) {
      // Trying to complete the task
      const hasIncompleteSubtasks = task.content.subtasks?.some(s => !s.completed);
      if (hasIncompleteSubtasks) {
        get().setError("Complete all subtasks before closing this task.");
        return;
      }
    }

    pushUndoSnapshot(get, set, "toggle repeated task instance");
    
    if (existing) {
      await db.blocks.delete(compId);
      await enqueueMutation("block", compId, "delete", existing);
      set((current) => ({
        error: undefined,
        blocks: sortBlocks(current.blocks.filter(b => b.id !== compId))
      }));
    } else {
      const createdAt = nowIso();
      const newCompletion = {
        id: compId,
        pageId: "system-recurring-completions",
        type: "completed_repeat",
        order: 0,
        content: {
          templateId
        },
        metadata: {
          completedDate: dateStr,
          completedAt: createdAt,
          createdAt,
          updatedAt: createdAt
        }
      };
      
      await db.transaction("rw", db.blocks, async () => {
        await db.blocks.add(newCompletion);
        if (existingFail) {
          await db.blocks.delete(failId);
        }
      });
      await enqueueMutation("block", compId, "upsert", newCompletion);
      if (existingFail) {
        await enqueueMutation("block", failId, "delete", existingFail);
      }
      
      set((current) => {
        let nextBlocks = [...current.blocks, newCompletion];
        if (existingFail) {
          nextBlocks = nextBlocks.filter(b => b.id !== failId);
        }
        return { error: undefined, blocks: sortBlocks(nextBlocks) };
      });
    }
  },

  toggleRepeatedTaskInstanceFail: async (templateId, dateStr) => {
    const failId = `fail_${templateId}_${dateStr}`;
    const compId = `comp_${templateId}_${dateStr}`;
    
    const existingFail = get().blocks.find(b => b.id === failId);
    const existingComp = get().blocks.find(b => b.id === compId);
    
    if (existingComp && !existingFail) {
      get().setError("Cannot fail a completed task. Incomplete it first.");
      return;
    }

    pushUndoSnapshot(get, set, "toggle repeated task instance fail");
    
    let newFailure;
    await db.transaction("rw", db.blocks, async () => {
      if (existingFail) {
        await db.blocks.delete(failId);
      } else {
        const createdAt = nowIso();
        newFailure = {
          id: failId,
          pageId: "system-recurring-failures",
          type: "failed_repeat",
          order: 0,
          content: {
            templateId
          },
          metadata: {
            failedDate: dateStr,
            failedAt: createdAt,
            createdAt,
            updatedAt: createdAt
          }
        };
        await db.blocks.add(newFailure);
        if (existingComp) {
          await db.blocks.delete(compId);
        }
      }
    });
    
    if (existingFail) {
      await enqueueMutation("block", failId, "delete", existingFail);
    } else {
      await enqueueMutation("block", failId, "upsert", newFailure);
      if (existingComp) {
        await enqueueMutation("block", compId, "delete", existingComp);
      }
    }
    
    set((current) => {
      let nextBlocks = current.blocks;
      if (existingFail) {
        nextBlocks = nextBlocks.filter(b => b.id !== failId);
      } else {
        nextBlocks = nextBlocks.filter(b => b.id !== compId);
        nextBlocks = [...nextBlocks, newFailure];
      }
      return { blocks: sortBlocks(nextBlocks) };
    });
  },

  moveBlock: async (blockId, direction) => {
    const state = get();
    const block = state.blocks.find((item) => item.id === blockId);
    if (!block) return;

    const pageBlocks = sortBlocks(
      state.blocks.filter((item) => item.pageId === block.pageId)
    );
    const index = pageBlocks.findIndex((item) => item.id === blockId);
    const target = pageBlocks[direction === "up" ? index - 1 : index + 1];
    if (!target) return;

    pushUndoSnapshot(get, set, "move block");
    const updatedBlock = { ...block, order: target.order };
    const updatedTarget = { ...target, order: block.order };
    await db.transaction("rw", db.blocks, async () => {
      await db.blocks.put(updatedBlock);
      await db.blocks.put(updatedTarget);
    });
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    await enqueueMutation("block", updatedTarget.id, "upsert", updatedTarget);

    set((current) => ({
      blocks: sortBlocks(
        current.blocks.map((item) => {
          if (item.id === updatedBlock.id) return updatedBlock;
          if (item.id === updatedTarget.id) return updatedTarget;
          return item;
        })
      )
    }));
  },

  duplicateBlock: async (blockId) => {
    const state = get();
    const block = state.blocks.find((item) => item.id === blockId);
    if (!block) return;

    pushUndoSnapshot(get, set, `duplicate ${block.type}`);
    const pageBlocks = sortBlocks(
      state.blocks.filter((item) => item.pageId === block.pageId)
    );
    const index = pageBlocks.findIndex((item) => item.id === blockId);
    
    const shiftedBlocks = [];
    for (let i = index + 1; i < pageBlocks.length; i++) {
      const b = pageBlocks[i];
      shiftedBlocks.push({
        ...b,
        order: b.order + 1
      });
    }

    const newId = createId(block.type);
    const newBlock = {
      ...block,
      id: newId,
      order: block.order + 1,
      metadata: {
        ...block.metadata,
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    };

    await db.transaction("rw", db.blocks, async () => {
      await db.blocks.add(newBlock);
      if (shiftedBlocks.length > 0) {
        await db.blocks.bulkPut(shiftedBlocks);
      }
    });

    await enqueueMutation("block", newBlock.id, "upsert", newBlock);
    for (const b of shiftedBlocks) {
      await enqueueMutation("block", b.id, "upsert", b);
    }

    set((current) => {
      const shiftedMap = new Map(shiftedBlocks.map(b => [b.id, b]));
      const nextBlocks = current.blocks.map(item => {
        if (shiftedMap.has(item.id)) return shiftedMap.get(item.id);
        return item;
      });
      return {
        blocks: sortBlocks([...nextBlocks, newBlock])
      };
    });
    get().setNotification("Block duplicated");
  },

  deleteSection: async (sectionId) => {
    if (!window.confirm("Are you sure you want to delete this section and all its pages? They will be moved to the Recycle Bin.")) return;
    const section = get().sections.find((item) => item.id === sectionId);
    if (!section) return;
    const pages = get().pages.filter((page) => page.sectionId === sectionId);
    const pageIds = new Set(pages.map((page) => page.id));
    const blocks = get().blocks.filter((block) => pageIds.has(block.pageId));

    pushUndoSnapshot(get, set, "delete section");
    await db.transaction("rw", db.sections, db.pages, db.blocks, async () => {
      await db.sections.delete(sectionId);
      await Promise.all(pages.map((page) => db.pages.delete(page.id)));
      await Promise.all(blocks.map((block) => db.blocks.delete(block.id)));
    });
    await enqueueMutation("section", sectionId, "delete", section);
    await Promise.all(pages.map((page) => enqueueMutation("page", page.id, "delete", page)));
    await Promise.all(blocks.map((block) => enqueueMutation("block", block.id, "delete", block)));

    const binItem = {
      id: section.id,
      title: section.title,
      type: "section",
      workspaceId: section.workspaceId,
      deletedAt: nowIso(),
      payload: { section, pages, blocks }
    };

    const updatedBin = [binItem, ...get().deletedPagesBin];
    await db.settings.put({ key: "deletedPagesBin", value: updatedBin });

    set((state) => {
      const remainingPages = state.pages.filter((page) => page.sectionId !== sectionId);
      return {
        sections: state.sections.filter((item) => item.id !== sectionId),
        pages: remainingPages,
        blocks: state.blocks.filter((block) => !pageIds.has(block.pageId)),
        activePageId: pageIds.has(state.activePageId) ? remainingPages.find((page) => page.workspaceId !== "diary")?.id || null : state.activePageId,
        deletedPagesBin: updatedBin
      };
    });

    get().setNotification(`Section "${section.title}" moved to bin`);
  },

  deletePage: async (pageId) => {
    if (!window.confirm("Are you sure you want to delete this page?")) return;
    const page = get().pages.find((item) => item.id === pageId);
    if (!page) return;
    const blocks = get().blocks.filter((block) => block.pageId === pageId);

    pushUndoSnapshot(get, set, "delete page");

    // Remove from Dexie
    await db.transaction("rw", db.pages, db.blocks, async () => {
      await db.pages.delete(pageId);
      await Promise.all(blocks.map((block) => db.blocks.delete(block.id)));
    });

    // Enqueue delete sync mutations
    await enqueueMutation("page", pageId, "delete", page);
    await Promise.all(blocks.map((block) => enqueueMutation("block", block.id, "delete", block)));

    const binItem = {
      id: page.id,
      title: page.title,
      type: "page",
      workspaceId: page.workspaceId,
      sectionId: page.sectionId,
      deletedAt: nowIso(),
      blocks
    };

    const updatedBin = [binItem, ...get().deletedPagesBin];
    await db.settings.put({ key: "deletedPagesBin", value: updatedBin });

    set((state) => {
      const remainingPages = state.pages.filter((item) => item.id !== pageId);
      const remainingDiaryPages = remainingPages.filter((item) => item.workspaceId === "diary");
      const nextActiveDiaryPageId = state.activeDiaryPageId === pageId ? (remainingDiaryPages[0]?.id || null) : state.activeDiaryPageId;

      return {
        pages: remainingPages,
        blocks: state.blocks.filter((block) => block.pageId !== pageId),
        activePageId: state.activePageId === pageId ? remainingPages.find((item) => item.workspaceId !== "diary")?.id : state.activePageId,
        activeDiaryPageId: nextActiveDiaryPageId,
        deletedPagesBin: updatedBin
      };
    });

    get().setNotification(`Page "${page.title}" moved to bin`);
  },

  restorePageFromBin: async (binItemId) => {
    const binItem = get().deletedPagesBin.find(item => item.id === binItemId);
    if (!binItem) return;

    if (binItem.type === "section") {
      const { section, pages, blocks } = binItem.payload;

      const restoredSection = {
        ...section,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };

      const restoredPages = pages.map(p => ({
        ...p,
        createdAt: nowIso(),
        updatedAt: nowIso()
      }));

      const restoredBlocks = blocks.map(b => ({
        ...b,
        metadata: {
          ...b.metadata,
          updatedAt: nowIso()
        }
      }));

      // Write back to Dexie
      await db.transaction("rw", db.sections, db.pages, db.blocks, async () => {
        await db.sections.put(restoredSection);
        for (const p of restoredPages) {
          await db.pages.put(p);
        }
        for (const b of restoredBlocks) {
          await db.blocks.put(b);
        }
      });

      // Enqueue upsert sync mutations so they sync to other devices
      await enqueueMutation("section", restoredSection.id, "upsert", restoredSection);
      for (const p of restoredPages) {
        await enqueueMutation("page", p.id, "upsert", p);
      }
      for (const b of restoredBlocks) {
        await enqueueMutation("block", b.id, "upsert", b);
      }

      const updatedBin = get().deletedPagesBin.filter(item => item.id !== binItemId);
      await db.settings.put({ key: "deletedPagesBin", value: updatedBin });

      set((state) => {
        const newSections = [...state.sections, restoredSection];
        const newPages = [...state.pages, ...restoredPages];
        const newBlocks = [...state.blocks, ...restoredBlocks];
        
        return {
          sections: newSections,
          pages: newPages,
          blocks: sortBlocks(newBlocks),
          deletedPagesBin: updatedBin,
          activePageId: restoredPages[0]?.id || state.activePageId
        };
      });

      get().setNotification(`Section "${restoredSection.title}" restored`);
    } else {
      const restoredPage = {
        id: binItem.id,
        title: binItem.title,
        workspaceId: binItem.workspaceId,
        sectionId: binItem.sectionId,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };

      const restoredBlocks = binItem.blocks.map(b => ({
        ...b,
        metadata: {
          ...b.metadata,
          updatedAt: nowIso()
        }
      }));

      // Write back to Dexie
      await db.transaction("rw", db.pages, db.blocks, async () => {
        await db.pages.put(restoredPage);
        for (const block of restoredBlocks) {
          await db.blocks.put(block);
        }
      });

      // Enqueue upsert sync mutations so they sync to other devices
      await enqueueMutation("page", restoredPage.id, "upsert", restoredPage);
      for (const block of restoredBlocks) {
        await enqueueMutation("block", block.id, "upsert", block);
      }

      const updatedBin = get().deletedPagesBin.filter(item => item.id !== binItemId);
      await db.settings.put({ key: "deletedPagesBin", value: updatedBin });

      set((state) => {
        const newPages = [...state.pages, restoredPage];
        const newBlocks = [...state.blocks, ...restoredBlocks];
        
        return {
          pages: newPages,
          blocks: sortBlocks(newBlocks),
          deletedPagesBin: updatedBin,
          // If it's workspace, make it active
          activePageId: restoredPage.workspaceId !== "diary" ? restoredPage.id : state.activePageId,
          activeDiaryPageId: restoredPage.workspaceId === "diary" ? restoredPage.id : state.activeDiaryPageId
        };
      });

      get().setNotification(`Page "${restoredPage.title}" restored`);
    }
  },

  permanentlyDeletePageFromBin: async (binItemId) => {
    const binItem = get().deletedPagesBin.find(item => item.id === binItemId);
    if (!binItem) return;

    if (!window.confirm(`Are you sure you want to permanently delete "${binItem.title}"? This cannot be undone.`)) return;

    const updatedBin = get().deletedPagesBin.filter(item => item.id !== binItemId);
    await db.settings.put({ key: "deletedPagesBin", value: updatedBin });

    set({ deletedPagesBin: updatedBin });
    get().setNotification(`"${binItem.title}" permanently deleted`);
  },

  deleteBlock: async (blockId) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block) return;

    pushUndoSnapshot(get, set, `delete ${block.type}`);
    await enqueueMutation("block", blockId, "delete", block);
    if (block.type === "task" && block.content.imageUrl) {
      await deleteTaskImage(block.content.imageUrl);
    }
    await db.blocks.delete(blockId);
    const deletedItem = makeDeletedItem(
      "block",
      block.type === "task" ? block.content.title || "Untitled task" : `${block.type} block`,
      { block },
      get().view
    );
    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== blockId),
      selectedTaskId:
        state.selectedTaskId === blockId ? undefined : state.selectedTaskId,
      recentlyDeleted: [deletedItem, ...state.recentlyDeleted].slice(0, 12)
    }));
    get().setNotification("Block deleted");
  },

  cutBlock: (blockId) => {
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block) return;
    
    const currentClipboard = get().clipboard || [];
    const isCut = currentClipboard.some((b) => b.id === block.id);
    
    if (isCut) {
      const nextClipboard = currentClipboard.filter((b) => b.id !== block.id);
      set({ clipboard: nextClipboard });
      get().setNotification(`${block.type.charAt(0).toUpperCase() + block.type.slice(1)} removed from clipboard`);
    } else {
      const nextClipboard = [...currentClipboard, block];
      set({ clipboard: nextClipboard });
      get().setNotification(`${nextClipboard.length} block(s) cut to clipboard`);
    }
  },

  pasteBlock: async (targetPageId) => {
    const clipboard = get().clipboard || [];
    if (clipboard.length === 0 || !targetPageId) return;

    pushUndoSnapshot(get, set, `paste ${clipboard.length} blocks`);
    const updatedAt = nowIso();
    const state = get();
    
    let baseOrder = Math.max(
      0,
      ...state.blocks
        .filter((b) => b.pageId === targetPageId)
        .map((b) => b.order)
    );

    const movedBlocks = clipboard.map((block, index) => ({
      ...block,
      pageId: targetPageId,
      order: baseOrder + index + 1,
      metadata: { ...block.metadata, updatedAt }
    }));

    await db.transaction("rw", db.blocks, async () => {
      await Promise.all(movedBlocks.map(b => db.blocks.put(b)));
    });
    
    await Promise.all(movedBlocks.map(b => enqueueMutation("block", b.id, "upsert", b)));
    
    set((current) => ({
      blocks: sortBlocks(
        current.blocks.map((item) => {
          const moved = movedBlocks.find(mb => mb.id === item.id);
          return moved ? moved : item;
        })
      ),
      clipboard: []
    }));
    get().setNotification(`${clipboard.length} block(s) pasted`);
  },

  clearClipboard: () => set({ clipboard: [] }),




  uploadTaskAttachment: async (taskId, file, userId) => {
    const block = get().blocks.find((item) => item.id === taskId);
    if (!block || block.type !== "task") return;

    pushUndoSnapshot(get, set, "upload task image");
    const updatedAt = nowIso();
    const imageUrl = await uploadTaskImage({
      file,
      taskId,
      userId,
      oldPath: block.content.imageUrl
    });
    const updatedBlock = {
      ...block,
      content: { ...block.content, imageUrl },
      metadata: { ...block.metadata, updatedAt }
    };
    await db.blocks.put(updatedBlock);
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    set((state) => ({
      blocks: state.blocks.map((item) => (item.id === taskId ? updatedBlock : item))
    }));
    get().setNotification("Image uploaded");
  },

  removeTaskAttachment: async (taskId) => {
    const block = get().blocks.find((item) => item.id === taskId);
    if (!block || block.type !== "task" || !block.content.imageUrl) return;

    pushUndoSnapshot(get, set, "remove task image");
    const updatedAt = nowIso();
    await deleteTaskImage(block.content.imageUrl);
    const updatedBlock = {
      ...block,
      content: { ...block.content, imageUrl: undefined },
      metadata: { ...block.metadata, updatedAt }
    };
    await db.blocks.put(updatedBlock);
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    set((state) => ({
      blocks: state.blocks.map((item) => (item.id === taskId ? updatedBlock : item))
    }));
    get().setNotification("Image removed");
  }
}));

const addBlock = async (get, set, pageId, type, content, metadata = {}, extra = {}) => {
  if (!pageId) return;
  pushUndoSnapshot(get, set, `create ${type}`);
  const state = get();
  const order =
    Math.max(
      0,
      ...state.blocks
        .filter((block) => block.pageId === pageId)
        .map((block) => block.order)
    ) + 1;
  const createdAt = nowIso();
  const block = {
    id: createId("block"),
    pageId,
    type,
    order,
    content,
    metadata: { createdAt, updatedAt: createdAt, ...metadata },
    ...extra
  };
  await db.blocks.add(block);
  await enqueueMutation("block", block.id, "upsert", block);
  set((current) => ({ blocks: sortBlocks([...current.blocks, block]) }));
  get().setNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} added`);
};



const normalizeBlock = (block) => {
  if (block.type !== "task") return block;
  return {
    ...block,
    content: {
      title: block.content.title ?? "",
      notes: block.content.notes ?? "",
      subtasks: block.content.subtasks ?? [],
      dependencyIds: block.content.dependencyIds ?? []
    },
    metadata: {
      recurrence: "none",
      customRecurrenceInterval: 1,
      priority: "medium",
      completed: false,
      ...block.metadata
    }
  };
};

const makeNextRecurringTask = (task, createdAt, get) => {
  const recurrence = task.metadata.recurrence ?? "none";
  const deadline = nextRecurringDate(
    task.metadata.deadline,
    recurrence,
    task.metadata.customRecurrenceInterval
  );
  if (!deadline) return undefined;

  const state = get();
  const order =
    Math.max(
      0,
      ...state.blocks
        .filter((block) => block.pageId === task.pageId)
        .map((block) => block.order)
    ) + 1;

  // Reset subtasks to uncompleted for the new recurring instance
  const resetSubtasks = (task.content.subtasks ?? []).map((subtask) => ({
    ...subtask,
    completed: false
  }));

  return {
    ...task,
    id: createId("block"),
    order,
    content: {
      ...task.content,
      subtasks: resetSubtasks
    },
    metadata: {
      ...task.metadata,
      completed: false,
      completedAt: undefined,
      deadline,
      createdAt,
      updatedAt: createdAt
    }
  };
};

const makeDeletedItem = (type, label, payload, view) => ({
  id: createId("deleted"),
  type,
  label,
  payload,
  view,
  deletedAt: nowIso()
});

// Debounce state for coalescing rapid edits into a single undo entry.
// If the same label fires again within the window, we skip pushing a new
// snapshot so the existing one captures the state before the first keystroke.
let _lastUndoLabel = null;
let _lastUndoTime = 0;
const UNDO_DEBOUNCE_MS = 1000;

const pushUndoSnapshot = (get, set, label) => {
  const now = Date.now();
  // Coalesce rapid identical operations (e.g. typing in a note)
  if (label === _lastUndoLabel && now - _lastUndoTime < UNDO_DEBOUNCE_MS) {
    // Keep the existing snapshot (which has the pre-edit state) — just
    // bump the timestamp so the window extends while the user keeps typing.
    _lastUndoTime = now;
    return;
  }
  _lastUndoLabel = label;
  _lastUndoTime = now;

  const state = get();
  const isDiary = state.view === "diary";
  const stackKey = isDiary ? "diaryUndoStack" : "undoStack";
  const snapshot = {
    id: createId("undo"),
    label,
    createdAt: nowIso(),
    data: {
      workspaces: state.workspaces,
      sections: state.sections,
      pages: state.pages,
      blocks: state.blocks,
      activePageId: state.activePageId,
      view: state.view
    }
  };
  set((current) => ({
    [stackKey]: [snapshot, ...current[stackKey]].slice(0, 30)
  }));
};

const replaceWorkspaceData = async (data) => {
  // Encrypt diary items before writing, since snapshot data is decrypted in memory.
  // We use the original (non-wrapped) Dexie methods to avoid the encryption hooks
  // which call db.pages.get() for every block — causing stack overflow inside a
  // transaction that just cleared and re-added pages.
  const diaryKey = getActiveDiaryKey;
  let pagesToWrite = data.pages ?? [];
  let blocksToWrite = data.blocks ?? [];

  if (diaryKey) {
    const diaryPageIds = new Set(pagesToWrite.filter(p => p.workspaceId === "diary").map(p => p.id));

    pagesToWrite = await Promise.all(pagesToWrite.map(async (p) => {
      if (p.workspaceId === "diary" && !isEncryptedString(p.title)) {
        return { ...p, title: await encryptString(p.title, diaryKey) };
      }
      return p;
    }));

    blocksToWrite = await Promise.all(blocksToWrite.map(async (b) => {
      if (diaryPageIds.has(b.pageId) && !isEncryptedObject(b.content)) {
        return { ...b, content: await encryptObject(b.content, diaryKey) };
      }
      return b;
    }));
  }

  setBypassEncryption(true);
  try {
    await db.transaction(
      "rw",
      db.workspaces,
      db.sections,
      db.pages,
      db.blocks,
      async () => {
        const currentBlocks = await db.blocks.toArray();
        const snapshotBlockIds = new Set(blocksToWrite.map((b) => b.id));

        const blocksToDelete = currentBlocks
          .filter(
            (b) =>
              !snapshotBlockIds.has(b.id) &&
              !["recurring_template", "recurring_instance", "completed_repeat", "failed_repeat"].includes(b.type)
          )
          .map((b) => b.id);

        if (blocksToDelete.length > 0) {
          await db.blocks.bulkDelete(blocksToDelete);
        }

        await db.workspaces.clear();
        await db.sections.clear();
        await db.pages.clear();
        
        await db.workspaces.bulkAdd(data.workspaces ?? []);
        await db.sections.bulkAdd(data.sections ?? []);
        // Use original methods — data is already encrypted above
        await originalPagesBulkAdd(pagesToWrite);
        await originalBlocksBulkPut(blocksToWrite);
      }
    );
  } finally {
    setBypassEncryption(false);
  }
};

const parseVirtualTaskId = (taskId) => {
  if (!taskId.startsWith("virtual_")) return { isVirtual: false };
  const cleaned = taskId.substring("virtual_".length);
  const lastUnderscore = cleaned.lastIndexOf("_");
  if (lastUnderscore === -1) return { isVirtual: false };
  const templateId = cleaned.substring(0, lastUnderscore);
  const dateStr = cleaned.substring(lastUnderscore + 1);
  return { isVirtual: true, templateId, dateStr };
};

const upsertRecurringInstance = async (templateId, dateStr, subtasksPatch, get, set) => {
  const instanceId = `instance_${templateId}_${dateStr}`;
  let instance = get().blocks.find((b) => b.id === instanceId);
  const updatedAt = nowIso();
  if (!instance) {
    instance = {
      id: instanceId,
      pageId: "system-recurring-instances",
      type: "recurring_instance",
      order: 0,
      content: {
        templateId,
        dateStr,
        subtasks: subtasksPatch
      },
      metadata: {
        createdAt: updatedAt,
        updatedAt
      }
    };
  } else {
    instance = {
      ...instance,
      content: {
        ...instance.content,
        subtasks: subtasksPatch
      },
      metadata: {
        ...instance.metadata,
        updatedAt
      }
    };
  }
  await db.blocks.put(instance);
  await enqueueMutation("block", instance.id, "upsert", instance);
  
  set((state) => ({
    blocks: sortBlocks([
      ...state.blocks.filter((b) => b.id !== instanceId),
      instance
    ])
  }));
};

const decryptDiaryData = async (pages, blocks, key) => {
  const newPages = await Promise.all(pages.map(async (p) => {
    if (p.workspaceId === "diary" && isEncryptedString(p.title)) {
      try {
        return { ...p, title: await decryptString(p.title, key) };
      } catch (e) {
        console.error("Failed to decrypt page title", e);
        return p;
      }
    }
    return p;
  }));
  
  const diaryPageIds = new Set(newPages.filter(p => p.workspaceId === "diary").map(p => p.id));
  const newBlocks = await Promise.all(blocks.map(async (b) => {
    if (diaryPageIds.has(b.pageId) && isEncryptedObject(b.content)) {
      try {
        return { ...b, content: await decryptObject(b.content, key) };
      } catch (e) {
        console.error("Failed to decrypt block content", e);
        return b;
      }
    }
    return b;
  }));
  return { pages: newPages, blocks: newBlocks };
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const checkAndEndExpiredRecurringTasks = async (blocks) => {
  const today = todayIso();
  const updatedBlocks = [];
  const templatesToUpdate = [];

  for (const block of blocks) {
    if (block.type === "recurring_template" && !block.deleted) {
      const status = block.metadata?.status || "active";
      const endDate = block.metadata?.endDate;
      if (status !== "ended" && endDate && today > endDate) {
        const updated = {
          ...block,
          metadata: {
            ...block.metadata,
            status: "ended",
            updatedAt: nowIso()
          }
        };
        templatesToUpdate.push(updated);
        updatedBlocks.push(updated);
      } else {
        updatedBlocks.push(block);
      }
    } else {
      updatedBlocks.push(block);
    }
  }

  if (templatesToUpdate.length > 0) {
    await db.transaction("rw", db.blocks, async () => {
      await db.blocks.bulkPut(templatesToUpdate);
    });
    for (const t of templatesToUpdate) {
      await enqueueMutation("block", t.id, "upsert", t);
    }
  }

  return updatedBlocks;
};
