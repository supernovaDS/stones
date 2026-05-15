import { db } from "../db/schema";

const nowIso = () => new Date().toISOString();

/**
 * Enqueue a mutation for any entity type into the sync queue.
 * @param {"workspace"|"section"|"page"|"block"} entity
 * @param {string} entityId
 * @param {"upsert"|"delete"} operation
 * @param {object} payload - the full local record snapshot
 */
export async function enqueueMutation(entity, entityId, operation, payload) {
  if (!entity || !entityId) return;

  await db.sync_queue.add({
    entity,
    entityId,
    operation,
    payload: { ...payload, deleted: operation === "delete" ? true : Boolean(payload?.deleted) },
    status: "pending",
    attempts: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    nextAttemptAt: nowIso()
  });

  window.dispatchEvent(new CustomEvent("stones-sync-requested"));
}

/**
 * Scan all local data and enqueue anything that hasn't been synced yet.
 * Called once at the start of each sync cycle to catch any items
 * that were created while offline or before sync was configured.
 */
export async function mirrorExistingData(userId) {
  if (!userId) return;

  const syncedIds = new Set(
    (await db.sync_meta.toArray()).map((m) => m.id)
  );

  const workspaces = await db.workspaces.toArray();
  const sections = await db.sections.toArray();
  const pages = await db.pages.toArray();
  const blocks = await db.blocks.toArray();

  const toEnqueue = [];

  for (const ws of workspaces) {
    if (!syncedIds.has(ws.id)) {
      toEnqueue.push({ entity: "workspace", entityId: ws.id, payload: ws });
    }
  }
  for (const sec of sections) {
    if (!syncedIds.has(sec.id)) {
      toEnqueue.push({ entity: "section", entityId: sec.id, payload: sec });
    }
  }
  for (const page of pages) {
    if (!syncedIds.has(page.id)) {
      toEnqueue.push({ entity: "page", entityId: page.id, payload: page });
    }
  }
  for (const block of blocks) {
    if (!syncedIds.has(block.id)) {
      toEnqueue.push({ entity: "block", entityId: block.id, payload: block });
    }
  }

  if (toEnqueue.length === 0) return;

  await db.transaction("rw", db.sync_queue, async () => {
    for (const item of toEnqueue) {
      await db.sync_queue.add({
        entity: item.entity,
        entityId: item.entityId,
        operation: "upsert",
        payload: item.payload,
        status: "pending",
        attempts: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        nextAttemptAt: nowIso()
      });
    }
  });
}
