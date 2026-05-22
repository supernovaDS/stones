import { db } from "../db/schema";

const nowIso = () => new Date().toISOString();

/**
 * Enqueue a mutation for any entity type into the sync queue.
 * Coalesces with any existing pending entry for the same entity+entityId
 * so rapid edits don't create duplicate queue items.
 *
 * @param {"workspace"|"section"|"page"|"block"} entity
 * @param {string} entityId
 * @param {"upsert"|"delete"} operation
 * @param {object} payload - the full local record snapshot
 */
export async function enqueueMutation(entity, entityId, operation, payload) {
  if (!entity || !entityId) return;

  const now = nowIso();
  const finalPayload = {
    ...payload,
    deleted: operation === "delete" ? true : Boolean(payload?.deleted)
  };

  // Look for an existing pending entry for the same entity+entityId
  const existing = await db.sync_queue
    .where("entityId")
    .equals(entityId)
    .filter((item) => item.entity === entity && item.status === "pending")
    .first();

  if (existing) {
    // Coalesce: upgrade to delete if new op is delete, otherwise keep latest payload
    const mergedOperation = operation === "delete" ? "delete" : existing.operation;
    await db.sync_queue.update(existing.id, {
      operation: mergedOperation,
      payload: finalPayload,
      updatedAt: now,
      // Reset retry state so it gets picked up immediately
      attempts: 0,
      nextAttemptAt: now
    });
  } else {
    await db.sync_queue.add({
      entity,
      entityId,
      operation,
      payload: finalPayload,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      nextAttemptAt: now
    });
  }

  window.dispatchEvent(new CustomEvent("stones-sync-requested"));
}

/**
 * Scan all local data and enqueue anything that hasn't been synced yet.
 * Called once at the start of each sync cycle to catch any items
 * that were created while offline or before sync was configured.
 * Skips items that already have a pending queue entry.
 */
export async function mirrorExistingData(userId) {
  if (!userId) return;

  const syncedIds = new Set(
    (await db.sync_meta.toArray()).map((m) => m.id)
  );

  // Also collect IDs that already have pending queue entries to avoid duplicates
  const pendingIds = new Set(
    (await db.sync_queue.where("status").equals("pending").toArray()).map(
      (item) => item.entityId
    )
  );

  const workspaces = await db.workspaces.toArray();
  const sections = await db.sections.toArray();
  const pages = await db.pages.toArray();
  const blocks = await db.blocks.toArray();

  const toEnqueue = [];

  for (const ws of workspaces) {
    if (!syncedIds.has(ws.id) && !pendingIds.has(ws.id)) {
      toEnqueue.push({ entity: "workspace", entityId: ws.id, payload: ws });
    }
  }
  for (const sec of sections) {
    if (!syncedIds.has(sec.id) && !pendingIds.has(sec.id)) {
      toEnqueue.push({ entity: "section", entityId: sec.id, payload: sec });
    }
  }
  for (const page of pages) {
    if (!syncedIds.has(page.id) && !pendingIds.has(page.id)) {
      toEnqueue.push({ entity: "page", entityId: page.id, payload: page });
    }
  }
  for (const block of blocks) {
    if (!syncedIds.has(block.id) && !pendingIds.has(block.id)) {
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
