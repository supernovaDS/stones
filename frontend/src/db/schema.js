import Dexie from "dexie";

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
  }
}

export const db = new StonesDatabase();
