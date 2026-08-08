import Dexie from "dexie";
import { encryptString, encryptObject, isEncryptedString, isEncryptedObject } from "../utils/crypto";

class StonesDatabase extends Dexie {
  constructor() {
    super("stones_workspace_db");
    this.version(1).stores({
      workspaces: "id, createdAt",
      pages: "id, workspaceId, createdAt, updatedAt",
      blocks:
        "id, pageId, type, order, sourceBlockId, metadata.deadline, metadata.completed, metadata.completedAt"
    });
    this.version(2).stores({
      workspaces: "id, createdAt",
      sections: "id, workspaceId, order, createdAt",
      pages: "id, workspaceId, sectionId, createdAt, updatedAt",
      blocks:
        "id, pageId, type, order, sourceBlockId, metadata.deadline, metadata.completed, metadata.completedAt"
    });
    this.version(3).stores({
      workspaces: "id, createdAt",
      sections: "id, workspaceId, order, createdAt",
      pages: "id, workspaceId, sectionId, createdAt, updatedAt",
      blocks:
        "id, pageId, type, order, sourceBlockId, metadata.deadline, metadata.completed, metadata.completedAt",
      tasks:
        "id, remote_id, user_id, sync_status, updated_at, deleted, local_only",
      sync_queue:
        "++id, entity, entityId, operation, status, createdAt, nextAttemptAt, attempts"
    });
    this.version(4).stores({
      workspaces: "id, createdAt",
      sections: "id, workspaceId, order, createdAt",
      pages: "id, workspaceId, sectionId, createdAt, updatedAt",
      blocks:
        "id, pageId, type, order, sourceBlockId, metadata.deadline, metadata.completed, metadata.completedAt",
      tasks:
        "id, remote_id, user_id, sync_status, updated_at, deleted, local_only",
      sync_queue:
        "++id, entity, entityId, operation, status, createdAt, nextAttemptAt, attempts",
      sync_meta: "id, entity, synced_at"
    });
    this.version(5).stores({
      workspaces: "id, createdAt",
      sections: "id, workspaceId, order, createdAt",
      pages: "id, workspaceId, sectionId, createdAt, updatedAt",
      blocks:
        "id, pageId, type, order, sourceBlockId, metadata.deadline, metadata.completed, metadata.completedAt",
      tasks:
        "id, remote_id, user_id, sync_status, updated_at, deleted, local_only",
      sync_queue:
        "++id, entity, entityId, operation, status, createdAt, nextAttemptAt, attempts",
      sync_meta: "id, entity, synced_at",
      settings: "key"
    });
    this.version(6).stores({
      tasks: null
    });
  }
}

export const db = new StonesDatabase();

export let activeDiaryKey = null;
export function setActiveDiaryKey(key) {
  activeDiaryKey = key;
}

export let bypassEncryption = false;
export function setBypassEncryption(val) {
  bypassEncryption = val;
}

export async function clearLocalWorkspaceData() {
  setActiveDiaryKey(null);
  const tables = db.tables;
  if (tables && tables.length > 0) {
    await db.transaction("rw", tables, async () => {
      for (const table of tables) {
        await table.clear();
      }
    });
  }
  localStorage.removeItem("stones-active-page-id");
  localStorage.removeItem("stones-active-diary-page-id");
  localStorage.removeItem("stones-current-user-id");
}

const originalPagesPut = db.pages.put.bind(db.pages);
const originalPagesAdd = db.pages.add.bind(db.pages);
const originalPagesBulkPut = db.pages.bulkPut.bind(db.pages);
const originalPagesBulkAdd = db.pages.bulkAdd.bind(db.pages);

const originalBlocksPut = db.blocks.put.bind(db.blocks);
const originalBlocksAdd = db.blocks.add.bind(db.blocks);
const originalBlocksBulkPut = db.blocks.bulkPut.bind(db.blocks);

// Expose originals for raw data operations (e.g. undo restore) that handle
// encryption themselves or operate on already-encrypted data.
export { originalPagesBulkAdd, originalPagesBulkPut, originalBlocksBulkPut };

async function encryptPage(page) {
  if (bypassEncryption || !activeDiaryKey || page.workspaceId !== "diary") return page;
  if (isEncryptedString(page.title)) return page; // already encrypted
  const encryptedTitle = await Dexie.waitFor(encryptString(page.title, activeDiaryKey));
  return { ...page, title: encryptedTitle };
}

async function encryptBlock(block) {
  if (bypassEncryption || !activeDiaryKey) return block;
  const page = await db.pages.get(block.pageId);
  if (page?.workspaceId !== "diary") return block;
  if (isEncryptedObject(block.content)) return block; // already encrypted
  const encryptedContent = await Dexie.waitFor(encryptObject(block.content, activeDiaryKey));
  return { ...block, content: encryptedContent };
}

db.pages.put = async function (item, key) {
  return originalPagesPut(await encryptPage(item), key);
};
db.pages.add = async function (item, key) {
  return originalPagesAdd(await encryptPage(item), key);
};
db.pages.bulkPut = async function (items, keys) {
  const encrypted = await Promise.all(items.map(encryptPage));
  return originalPagesBulkPut(encrypted, keys);
};

db.blocks.put = async function (item, key) {
  return originalBlocksPut(await encryptBlock(item), key);
};
db.blocks.add = async function (item, key) {
  return originalBlocksAdd(await encryptBlock(item), key);
};
db.blocks.bulkPut = async function (items, keys) {
  const encrypted = await Promise.all(items.map(encryptBlock));
  return originalBlocksBulkPut(encrypted, keys);
};
