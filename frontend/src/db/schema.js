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
  }
}

export const db = new StonesDatabase();
