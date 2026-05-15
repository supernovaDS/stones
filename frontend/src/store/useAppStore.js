import { create } from "zustand";
import { db } from "../db/schema";
import { deleteTaskImage, uploadTaskImage } from "../services/imageUploadService";
import { enqueueMutation } from "../sync/syncQueue";
import {
  nextRecurringDate,
  normalizeDateText,
  todayIso,
  todayPageTitle
} from "../utils/date";

const createId = (prefix) =>
  `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;

const nowIso = () => new Date().toISOString();
const sortBlocks = (blocks) => [...blocks].sort((a, b) => a.order - b.order);
const sortSections = (sections) =>
  [...sections].sort((a, b) => a.order - b.order);

const defaultTheme = () => localStorage.getItem("stones-theme") ?? "light";
const defaultColorProfile = () => localStorage.getItem("stones-color-profile") ?? "neo";

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
  const page = {
    id: createId("page"),
    workspaceId: workspace.id,
    sectionId: section.id,
    title: "Today",
    createdAt,
    updatedAt: createdAt
  };
  const note = {
    id: createId("block"),
    pageId: page.id,
    type: "note",
    order: 1,
    content: {
      text: "Capture rough thoughts here, then turn them into tasks when they become actionable."
    },
    metadata: { createdAt, updatedAt: createdAt }
  };
  const task = {
    id: createId("block"),
    pageId: page.id,
    type: "task",
    order: 2,
    content: {
      title: "Build the first offline workspace flow",
      notes: "",
      subtasks: [],
      dependencyIds: []
    },
    metadata: {
      priority: "high",
      deadline: todayIso(),
      completed: false,
      recurrence: "none",
      createdAt,
      updatedAt: createdAt
    }
  };

  return { workspace, section, page, blocks: [note, task] };
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
  recentlyDeleted: [],
  theme: defaultTheme(),
  colorProfile: defaultColorProfile(),

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

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
        db.pages,
        db.blocks,
        async () => {
          await db.workspaces.add(seed.workspace);
          await db.sections.add(seed.section);
          await db.pages.add(seed.page);
          await db.blocks.bulkAdd(seed.blocks);
        }
      );

      workspaces = [seed.workspace];
      sections = [seed.section];
      pages = [seed.page];
      blocks = seed.blocks;
    }

    if (sections.length === 0 && workspaces[0]) {
      const createdAt = nowIso();
      const section = {
        id: createId("section"),
        workspaceId: workspaces[0].id,
        title: "General",
        order: 1,
        createdAt,
        updatedAt: createdAt
      };
      pages = pages.map((page) => ({ ...page, sectionId: section.id }));
      await db.transaction("rw", db.sections, db.pages, async () => {
        await db.sections.add(section);
        await db.pages.bulkPut(pages);
      });
      sections = [section];
    }

    set({
      workspaces,
      sections: sortSections(sections),
      pages,
      blocks: sortBlocks(blocks.map(normalizeBlock)),
      activePageId: pages[0]?.id,
      loading: false
    });
  },

  syncDbUpdates: async () => {
    const [workspaces, sections, pages, blocks] = await Promise.all([
      db.workspaces.toArray(),
      db.sections.toArray(),
      db.pages.toArray(),
      db.blocks.toArray()
    ]);
    set({
      workspaces,
      sections: sortSections(sections),
      pages,
      blocks: sortBlocks(blocks.map(normalizeBlock)),
      activePageId: get().activePageId || pages[0]?.id
    });
  },

  setView: (view) => set({ view }),
  setActivePage: (pageId) => set({ activePageId: pageId, view: "workspace" }),
  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),
  openTaskModal: (params = {}) => set({ taskModalParams: params }),
  closeTaskModal: () => set({ taskModalParams: null }),
  setTheme: (theme) => {
    localStorage.setItem("stones-theme", theme);
    set({ theme });
  },
  setColorProfile: (colorProfile) => {
    localStorage.setItem("stones-color-profile", colorProfile);
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

  undoLastChange: async () => {
    const [snapshot, ...rest] = get().undoStack;
    if (!snapshot) return;

    await replaceWorkspaceData(snapshot.data);
    set({
      ...snapshot.data,
      blocks: sortBlocks((snapshot.data.blocks ?? []).map(normalizeBlock)),
      sections: sortSections(snapshot.data.sections ?? []),
      undoStack: rest,
      selectedTaskId: undefined
    });
    get().setNotification(`Undid ${snapshot.label}`);
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

  createSection: async () => {
    const workspaceId = get().workspaces[0]?.id;
    if (!workspaceId) return;

    pushUndoSnapshot(get, set, "create section");
    const createdAt = nowIso();
    const section = {
      id: createId("section"),
      workspaceId,
      title: "New section",
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
    await db.sections.update(sectionId, { title, updatedAt });
    const updated = get().sections.find((s) => s.id === sectionId);
    if (updated) await enqueueMutation("section", sectionId, "upsert", { ...updated, title, updatedAt });
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === sectionId ? { ...section, title, updatedAt } : section
      )
    }));
  },

  createPage: async (sectionId = get().sections[0]?.id, title = "Untitled page") => {
    const workspaceId = get().workspaces[0]?.id;
    if (!workspaceId) return;

    pushUndoSnapshot(get, set, "create page");
    const createdAt = nowIso();
    const page = {
      id: createId("page"),
      workspaceId,
      sectionId,
      title,
      createdAt,
      updatedAt: createdAt
    };

    await db.pages.add(page);
    await enqueueMutation("page", page.id, "upsert", page);
    set((state) => ({
      pages: [...state.pages, page],
      activePageId: page.id,
      view: "workspace"
    }));
    get().setNotification(`Page "${title}" created`);
  },

  movePageToSection: async (pageId, sectionId) => {
    const updatedAt = nowIso();
    await db.pages.update(pageId, { sectionId, updatedAt });
    const page = get().pages.find((p) => p.id === pageId);
    if (page) await enqueueMutation("page", pageId, "upsert", { ...page, sectionId, updatedAt });
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId ? { ...page, sectionId } : page
      )
    }));
  },

  openTodayPage: async () => {
    const state = get();
    const workspaceId = state.workspaces[0]?.id;
    if (!workspaceId) return;

    const title = todayPageTitle();
    const existing = state.pages.find((page) => page.title === title);
    if (existing) {
      set({ activePageId: existing.id, view: "workspace" });
      return;
    }

    pushUndoSnapshot(get, set, "create daily page");
    const createdAt = nowIso();
    const page = {
      id: createId("page"),
      workspaceId,
      sectionId: state.sections[0]?.id,
      title,
      createdAt,
      updatedAt: createdAt
    };
    const note = {
      id: createId("block"),
      pageId: page.id,
      type: "note",
      order: 1,
      content: { text: "Plan the day here." },
      metadata: { createdAt, updatedAt: createdAt }
    };

    await db.transaction("rw", db.pages, db.blocks, async () => {
      await db.pages.add(page);
      await db.blocks.add(note);
    });
    await enqueueMutation("page", page.id, "upsert", page);
    await enqueueMutation("block", note.id, "upsert", note);

    set((current) => ({
      pages: [...current.pages, page],
      blocks: sortBlocks([...current.blocks, note]),
      activePageId: page.id,
      view: "workspace"
    }));
  },

  renamePage: async (pageId, title) => {
    const updatedAt = nowIso();
    await db.pages.update(pageId, { title, updatedAt });
    const page = get().pages.find((p) => p.id === pageId);
    if (page) await enqueueMutation("page", pageId, "upsert", { ...page, title, updatedAt });
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId ? { ...page, title, updatedAt } : page
      )
    }));
  },

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

  addLinkBlock: async (pageId = get().activePageId) =>
    addBlock(get, set, pageId, "link", {
      title: "Useful link",
      url: "https://example.com",
      description: ""
    }),

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
    await db.blocks.put(updatedBlock);
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    set((state) => ({
      blocks: state.blocks.map((item) =>
        item.id === blockId ? updatedBlock : item
      )
    }));
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

    await db.blocks.put(updatedBlock);
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    set((state) => ({
      blocks: sortBlocks(
        state.blocks.map((item) =>
          item.id === blockId ? updatedBlock : item
        )
      )
    }));
  },

  addSubtask: async (taskId) => {
    const task = get().blocks.find((block) => block.id === taskId);
    if (!task || task.type !== "task") return;
    await get().updateTask(taskId, {
      subtasks: [
        ...(task.content.subtasks ?? []),
        { id: createId("subtask"), text: "New subtask", completed: false }
      ]
    });
  },

  updateSubtask: async (taskId, subtaskId, patch) => {
    const task = get().blocks.find((block) => block.id === taskId);
    if (!task || task.type !== "task") return;
    await get().updateTask(taskId, {
      subtasks: (task.content.subtasks ?? []).map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, ...patch } : subtask
      )
    });
  },

  deleteSubtask: async (taskId, subtaskId) => {
    const task = get().blocks.find((block) => block.id === taskId);
    if (!task || task.type !== "task") return;
    await get().updateTask(taskId, {
      subtasks: (task.content.subtasks ?? []).filter(
        (subtask) => subtask.id !== subtaskId
      )
    });
  },

  setTaskDependencies: async (taskId, dependencyIds) =>
    get().updateTask(taskId, { dependencyIds }),

  toggleTask: async (blockId) => {
    const updatedAt = nowIso();
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block || block.type !== "task") return;

    const dependencies = block.content.dependencyIds ?? [];
    const blocked = dependencies.some((dependencyId) => {
      const dependency = get().blocks.find((item) => item.id === dependencyId);
      return dependency?.type === "task" && !dependency.metadata.completed;
    });
    if (!block.metadata.completed && blocked) {
      set({ error: "Complete dependent tasks before closing this task." });
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
    const nextTask = completed
      ? makeNextRecurringTask(block, updatedAt, get)
      : undefined;

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

  deleteSection: async (sectionId) => {
    if (!window.confirm("Are you sure you want to delete this section and all its pages?")) return;
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
    const deletedItem = makeDeletedItem("section", section.title, {
      section,
      pages,
      blocks
    });
    set((state) => ({
      sections: state.sections.filter((item) => item.id !== sectionId),
      pages: state.pages.filter((page) => page.sectionId !== sectionId),
      blocks: state.blocks.filter((block) => !pageIds.has(block.pageId)),
      activePageId: pageIds.has(state.activePageId) ? state.pages.find((page) => page.sectionId !== sectionId)?.id : state.activePageId,
      recentlyDeleted: [deletedItem, ...state.recentlyDeleted].slice(0, 12)
    }));
  },

  deletePage: async (pageId) => {
    if (!window.confirm("Are you sure you want to delete this page?")) return;
    const page = get().pages.find((item) => item.id === pageId);
    if (!page) return;
    const blocks = get().blocks.filter((block) => block.pageId === pageId);

    pushUndoSnapshot(get, set, "delete page");
    await db.transaction("rw", db.pages, db.blocks, async () => {
      await db.pages.delete(pageId);
      await Promise.all(blocks.map((block) => db.blocks.delete(block.id)));
    });
    await enqueueMutation("page", pageId, "delete", page);
    await Promise.all(blocks.map((block) => enqueueMutation("block", block.id, "delete", block)));
    const deletedItem = makeDeletedItem("page", page.title, { page, blocks });
    set((state) => ({
      pages: state.pages.filter((item) => item.id !== pageId),
      blocks: state.blocks.filter((block) => block.pageId !== pageId),
      activePageId: state.activePageId === pageId ? state.pages.find((item) => item.id !== pageId)?.id : state.activePageId,
      recentlyDeleted: [deletedItem, ...state.recentlyDeleted].slice(0, 12)
    }));
    get().setNotification(`Page "${page.title}" deleted`);
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
      { block }
    );
    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== blockId),
      selectedTaskId:
        state.selectedTaskId === blockId ? undefined : state.selectedTaskId,
      recentlyDeleted: [deletedItem, ...state.recentlyDeleted].slice(0, 12)
    }));
    get().setNotification("Block deleted");
  },

  convertNoteToTask: async (blockId) => {
    const note = get().blocks.find((block) => block.id === blockId);
    if (!note || note.type !== "note" || !note.content.text.trim()) return;

    get().openTaskModal({
      title: note.content.text.trim().split("\n")[0],
      priority: "medium",
      sourceBlockId: note.id,
      pageId: note.pageId
    });
  },

  convertTextToTask: async (blockId, text) => {
    const note = get().blocks.find((block) => block.id === blockId);
    const title = text?.trim();
    if (!note || note.type !== "note" || !title) return;

    get().openTaskModal({
      title: title.split("\n")[0],
      priority: "medium",
      sourceBlockId: note.id,
      pageId: note.pageId
    });
  },

  exportBackup: () => ({
    version: 2,
    exportedAt: nowIso(),
    workspaces: get().workspaces,
    sections: get().sections,
    pages: get().pages,
    blocks: get().blocks
  }),

  exportPageMarkdown: (pageId = get().activePageId) => {
    const state = get();
    const page = state.pages.find((item) => item.id === pageId);
    if (!page) return "";

    const lines = [`# ${page.title}`, ""];
    const pageBlocks = sortBlocks(
      state.blocks.filter((block) => block.pageId === page.id)
    );

    for (const block of pageBlocks) {
      if (block.type === "note") lines.push(block.content.text || "", "");
      if (block.type === "task") {
        const checked = block.metadata.completed ? "x" : " ";
        const meta = [
          block.metadata.priority,
          block.metadata.deadline,
          block.metadata.recurrence && block.metadata.recurrence !== "none"
            ? `repeats ${block.metadata.recurrence}`
            : undefined
        ]
          .filter(Boolean)
          .join(", ");
        lines.push(
          `- [${checked}] ${block.content.title}${meta ? ` (${meta})` : ""}`
        );
        for (const subtask of block.content.subtasks ?? []) {
          lines.push(`  - [${subtask.completed ? "x" : " "}] ${subtask.text}`);
        }
      }
      if (block.type === "checklist") {
        for (const item of block.content.items ?? []) {
          lines.push(`- [${item.completed ? "x" : " "}] ${item.text}`);
        }
      }
      if (block.type === "code") {
        lines.push(
          `\`\`\`${block.content.language ?? ""}`,
          block.content.code ?? "",
          "```",
          ""
        );
      }
      if (block.type === "link") {
        lines.push(`[${block.content.title}](${block.content.url})`, "");
      }
      if (block.type === "image") {
        lines.push(`![${block.content.caption ?? block.content.name ?? "image"}]()`, "");
      }
    }

    return lines.join("\n");
  },

  importBackup: async (payload) => {
    pushUndoSnapshot(get, set, "import backup");
    await db.transaction(
      "rw",
      db.workspaces,
      db.sections,
      db.pages,
      db.blocks,
      async () => {
        await db.workspaces.clear();
        await db.sections.clear();
        await db.pages.clear();
        await db.blocks.clear();
        await db.workspaces.bulkAdd(payload.workspaces ?? []);
        await db.sections.bulkAdd(payload.sections ?? []);
        await db.pages.bulkAdd(payload.pages ?? []);
        await db.blocks.bulkAdd(payload.blocks ?? []);
      }
    );

    set({
      workspaces: payload.workspaces ?? [],
      sections: sortSections(payload.sections ?? []),
      pages: payload.pages ?? [],
      blocks: sortBlocks((payload.blocks ?? []).map(normalizeBlock)),
      activePageId: payload.pages?.[0]?.id,
      view: "workspace",
      recentlyDeleted: [],
      selectedTaskId: undefined,
      aiReview: undefined
    });
  },

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

const createTaskFromExtraction = async (
  task,
  fallbackPageId,
  get,
  set,
  overrides = {}
) => {
  const pageId = task.pageId ?? fallbackPageId;
  if (!pageId) return;
  await addBlock(
    get,
    set,
    pageId,
    "task",
    {
      title: task.title,
      notes: task.notes ?? "",
      subtasks: [],
      dependencyIds: []
    },
    {
      completed: false,
      priority: task.priority ?? "medium",
      deadline: overrides.deadline ?? task.deadline ?? normalizeDateText(task.dueText),
      recurrence: overrides.recurrence ?? "none",
      customRecurrenceInterval: overrides.customRecurrenceInterval ?? 1
    }
  );
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

const parseQuickTask = (input) => {
  let title = input;
  let priority = "medium";
  let recurrence = "none";
  let dueText;
  let deadline;

  const priorityMatch = title.match(/\b(high|medium|low)\b/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase();
    title = title.replace(priorityMatch[0], "").trim();
  }

  const recurrenceMatch = title.match(/\b(daily|weekly)\b/i);
  if (recurrenceMatch) {
    recurrence = recurrenceMatch[1].toLowerCase();
    title = title.replace(recurrenceMatch[0], "").trim();
  }

  if (/\bweekdays\b/i.test(title)) {
    recurrence = "weekdays";
    title = title.replace(/\bweekdays\b/i, "").trim();
  }

  if (/\bmonthly\b/i.test(title)) {
    recurrence = "monthly";
    title = title.replace(/\bmonthly\b/i, "").trim();
  }

  const customMatch = title.match(/\bevery\s+(\d+)\s+days?\b/i);
  let customRecurrenceInterval;
  if (customMatch) {
    recurrence = "custom";
    customRecurrenceInterval = Number(customMatch[1]);
    title = title.replace(customMatch[0], "").trim();
  }

  if (/\btomorrow\b/i.test(title)) {
    dueText = "tomorrow";
    deadline = normalizeDateText(dueText);
    title = title.replace(/\btomorrow\b/i, "").trim();
  } else if (/\btoday\b/i.test(title)) {
    dueText = "today";
    deadline = todayIso();
    title = title.replace(/\btoday\b/i, "").trim();
  }

  const dateMatch = title.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (dateMatch) {
    deadline = dateMatch[0];
    title = title.replace(dateMatch[0], "").trim();
  }

  return {
    title: title.replace(/\s+/g, " ").trim() || input,
    priority,
    dueText,
    deadline,
    recurrence,
    customRecurrenceInterval
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

  return {
    ...task,
    id: createId("block"),
    order,
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

const makeDeletedItem = (type, label, payload) => ({
  id: createId("deleted"),
  type,
  label,
  payload,
  deletedAt: nowIso()
});

const pushUndoSnapshot = (get, set, label) => {
  const state = get();
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
    undoStack: [snapshot, ...current.undoStack].slice(0, 30)
  }));
};

const replaceWorkspaceData = async (data) => {
  await db.transaction(
    "rw",
    db.workspaces,
    db.sections,
    db.pages,
    db.blocks,
    async () => {
      await db.workspaces.clear();
      await db.sections.clear();
      await db.pages.clear();
      await db.blocks.clear();
      await db.workspaces.bulkAdd(data.workspaces ?? []);
      await db.sections.bulkAdd(data.sections ?? []);
      await db.pages.bulkAdd(data.pages ?? []);
      await db.blocks.bulkAdd(data.blocks ?? []);
    }
  );
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
