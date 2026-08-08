import { db, setActiveDiaryKey, activeDiaryKey as getActiveDiaryKey, originalPagesBulkAdd, originalBlocksBulkPut, setBypassEncryption } from "../db/schema";
import { enqueueMutation } from "../sync/syncQueue";
export { enqueueMutation };

import { nextRecurringDate, todayIso } from "../utils/date";
import { createUuid } from "../utils/ids";
import { decryptString, decryptObject, encryptString, encryptObject, isEncryptedObject, isEncryptedString } from "../utils/crypto";

export const createId = (prefix) => `${prefix}_${createUuid()}`;
export const nowIso = () => new Date().toISOString();
export const sortBlocks = (blocks) => [...blocks].sort((a, b) => a.order - b.order);
export const sortSections = (sections) => [...sections].sort((a, b) => a.order - b.order);

export const defaultTheme = () => localStorage.getItem("stones-theme") ?? "light";
export const defaultSidebarHidden = () => localStorage.getItem("stones-sidebar-hidden") === "true";

export const getUniquePageTitle = (baseTitle, existingPages, excludeId = null) => {
  let title = baseTitle;
  let counter = 1;
  while (existingPages.some((p) => p.title === title && p.id !== excludeId)) {
    title = `${baseTitle} (${counter})`;
    counter++;
  }
  return title;
};

export const seedData = () => {
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

export const deduplicateSections = async (sections) => {
  if (!sections || sections.length <= 1) return sections;
  const seen = new Map();
  const keep = [];
  const removeIds = [];

  for (const sec of sections) {
    const key = `${sec.workspaceId || "default"}_${(sec.title || "").trim().toLowerCase()}`;
    if (seen.has(key)) {
      removeIds.push(sec.id);
    } else {
      seen.set(key, sec);
      keep.push(sec);
    }
  }

  if (removeIds.length > 0) {
    await db.transaction("rw", db.sections, db.pages, async () => {
      for (const id of removeIds) {
        await db.sections.delete(id);
        const orphanPages = await db.pages.where("sectionId").equals(id).toArray();
        const primary = keep[0];
        if (primary) {
          for (const p of orphanPages) {
            await db.pages.update(p.id, { sectionId: primary.id });
          }
        }
      }
    });
  }

  return keep;
};

export const addBlock = async (get, set, pageId, type, content, metadata = {}, extra = {}) => {
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

export const normalizeBlock = (block) => {
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

export const makeNextRecurringTask = (task, createdAt, get) => {
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

export const makeDeletedItem = (type, label, payload, view) => ({
  id: createId("deleted"),
  type,
  label,
  payload,
  view,
  deletedAt: nowIso()
});

let _lastUndoLabel = null;
let _lastUndoTime = 0;
const UNDO_DEBOUNCE_MS = 1000;

export const pushUndoSnapshot = (get, set, label) => {
  const now = Date.now();
  if (label === _lastUndoLabel && now - _lastUndoTime < UNDO_DEBOUNCE_MS) {
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

export const resetUndoDebounce = () => {
  _lastUndoLabel = null;
  _lastUndoTime = 0;
};

export const replaceWorkspaceData = async (data) => {
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
        await originalPagesBulkAdd(pagesToWrite);
        await originalBlocksBulkPut(blocksToWrite);
      }
    );
  } finally {
    setBypassEncryption(false);
  }
};

export const parseVirtualTaskId = (taskId) => {
  if (!taskId.startsWith("virtual_")) return { isVirtual: false };
  const cleaned = taskId.substring("virtual_".length);
  const lastUnderscore = cleaned.lastIndexOf("_");
  if (lastUnderscore === -1) return { isVirtual: false };
  const templateId = cleaned.substring(0, lastUnderscore);
  const dateStr = cleaned.substring(lastUnderscore + 1);
  return { isVirtual: true, templateId, dateStr };
};

export const upsertRecurringInstance = async (templateId, dateStr, subtasksPatch, get, set) => {
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

export const decryptDiaryData = async (pages, blocks, key) => {
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

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const checkAndEndExpiredRecurringTasks = async (blocks) => {
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
