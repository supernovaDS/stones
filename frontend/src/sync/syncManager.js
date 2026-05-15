import { db } from "../db/schema";
import { supabase } from "../lib/supabaseClient";
import { toRemoteRecord, fromRemoteRecord, tableName } from "./entityAdapter";
import { mirrorExistingData } from "./syncQueue";

const RETRY_BASE_MS = 15_000;
const listeners = new Set();

let status = {
  phase: navigator.onLine ? "idle" : "offline",
  pendingCount: 0,
  lastSyncedAt: null,
  error: "",
  isOnline: navigator.onLine
};
let debounceTimer = null;
let inFlight = null;

function emit(patch) {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener(status));
}

async function refreshPendingCount() {
  const pendingCount = await db.sync_queue.where("status").equals("pending").count();
  emit({ pendingCount });
}

async function markQueueError(item, error) {
  const attempts = Number(item.attempts ?? 0) + 1;
  const delay = Math.min(RETRY_BASE_MS * 2 ** Math.min(attempts, 6), 10 * 60_000);
  await db.sync_queue.update(item.id, {
    attempts,
    status: "pending",
    error: error.message || String(error),
    updatedAt: new Date().toISOString(),
    nextAttemptAt: new Date(Date.now() + delay).toISOString()
  });
}

// ── Push: process the sync queue ──────────────────────────────

async function processQueue(userId) {
  const now = new Date().toISOString();
  const items = await db.sync_queue
    .where("status")
    .equals("pending")
    .filter((item) => !item.nextAttemptAt || item.nextAttemptAt <= now)
    .sortBy("createdAt");

  if (items.length === 0) return;

  for (const item of items) {
    try {
      // Get the latest local version of the entity
      const localTable = dexieTable(item.entity);
      const currentLocal = localTable ? await localTable.get(item.entityId) : null;
      const payload = currentLocal || item.payload;

      // Mark delete if operation is delete
      const finalPayload = {
        ...payload,
        deleted: item.operation === "delete" ? true : Boolean(payload?.deleted)
      };

      const record = toRemoteRecord(item.entity, finalPayload, userId);
      const table = tableName(item.entity);

      const { error } = await supabase.from(table).upsert(record, { onConflict: "id" });
      if (error) throw error;

      // Mark as synced
      await db.transaction("rw", db.sync_queue, db.sync_meta, async () => {
        await db.sync_queue.delete(item.id);
        await db.sync_meta.put({
          id: item.entityId,
          entity: item.entity,
          synced_at: now
        });
      });
    } catch (error) {
      await markQueueError(item, error);
      throw error;
    }
  }
}

// ── Pull: fetch remote data and merge locally ─────────────────

async function pullRemote(userId) {
  await pullEntity("workspace", userId);
  await pullEntity("section", userId);
  await pullEntity("page", userId);
  await pullEntity("block", userId);
}

async function pullEntity(entity, userId) {
  const table = tableName(entity);
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("updated_at", { ascending: true });

  if (error) throw error;
  if (!data?.length) return;

  const localTable = dexieTable(entity);
  if (!localTable) return;

  // Get pending queue items for this entity type so we can skip conflicts
  const pendingItems = await db.sync_queue
    .where("entity")
    .equals(entity)
    .filter((item) => item.status === "pending")
    .toArray();
  const pendingIds = new Set(pendingItems.map((item) => item.entityId));
  // Collect IDs that have a pending DELETE so we never re-create them
  const pendingDeleteIds = new Set(
    pendingItems.filter((item) => item.operation === "delete").map((item) => item.entityId)
  );

  const tablesToUse = [localTable, db.sync_meta];
  await db.transaction("rw", tablesToUse, async () => {
    for (const remote of data) {
      // Never re-create something we're about to delete
      if (pendingDeleteIds.has(remote.id)) continue;

      const localRecord = await localTable.get(remote.id);
      const localUpdatedAt = getLocalUpdatedAt(entity, localRecord);
      const remoteUpdatedAt = remote.updated_at || remote.created_at;

      // Conflict resolution: if local has pending changes and is newer, skip
      if (pendingIds.has(remote.id) && localUpdatedAt && localUpdatedAt > remoteUpdatedAt) {
        continue;
      }

      // Convert remote record to local format and save
      const newLocal = fromRemoteRecord(entity, remote);
      await localTable.put(newLocal);
      await db.sync_meta.put({ id: remote.id, entity, synced_at: remoteUpdatedAt });
    }
  });
}

// ── Helpers ────────────────────────────────────────────────────

function dexieTable(entity) {
  const map = {
    workspace: db.workspaces,
    section: db.sections,
    page: db.pages,
    block: db.blocks
  };
  return map[entity] ?? null;
}

function getLocalUpdatedAt(entity, localRecord) {
  if (!localRecord) return null;
  if (entity === "block") {
    return localRecord.metadata?.updatedAt;
  }
  return localRecord.updatedAt;
}

// ── Public API ─────────────────────────────────────────────────

export const syncManager = {
  subscribe(listener) {
    listeners.add(listener);
    listener(status);
    void refreshPendingCount();
    return () => listeners.delete(listener);
  },

  schedule(userId, delay = 800) {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      void this.syncNow(userId);
    }, delay);
  },

  async syncNow(userId) {
    if (!supabase || !userId) {
      emit({ phase: "local", isOnline: navigator.onLine });
      return;
    }
    if (!navigator.onLine) {
      emit({ phase: "offline", isOnline: false });
      return;
    }
    if (inFlight) return inFlight;

    inFlight = (async () => {
      emit({ phase: "syncing", error: "", isOnline: true });
      try {
        await mirrorExistingData(userId);
        await processQueue(userId);
        await pullRemote(userId);
        await refreshPendingCount();
        emit({
          phase: "synced",
          lastSyncedAt: new Date().toISOString(),
          error: "",
          isOnline: true
        });
      } catch (error) {
        console.error("[Sync Error]", error);
        await refreshPendingCount();
        emit({
          phase: "error",
          error: error.message || "Sync failed.",
          isOnline: navigator.onLine
        });
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }
};
