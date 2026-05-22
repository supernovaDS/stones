/**
 * Generic adapter for converting between local Dexie records
 * and remote Supabase records for all entity types.
 */

const nowIso = () => new Date().toISOString();

// ── Local → Remote ─────────────────────────────────────────────

export function toRemoteWorkspace(local, userId) {
  return {
    id: local.id,
    user_id: userId,
    title: local.title ?? "",
    created_at: local.createdAt ?? nowIso(),
    updated_at: local.updatedAt ?? local.createdAt ?? nowIso(),
    deleted: Boolean(local.deleted)
  };
}

export function toRemoteSection(local, userId) {
  return {
    id: local.id,
    user_id: userId,
    workspace_id: local.workspaceId,
    title: local.title ?? "",
    order: local.order ?? 0,
    created_at: local.createdAt ?? nowIso(),
    updated_at: local.updatedAt ?? local.createdAt ?? nowIso(),
    deleted: Boolean(local.deleted)
  };
}

export function toRemotePage(local, userId) {
  return {
    id: local.id,
    user_id: userId,
    workspace_id: local.workspaceId,
    section_id: local.sectionId ?? null,
    title: local.title ?? "",
    created_at: local.createdAt ?? nowIso(),
    updated_at: local.updatedAt ?? local.createdAt ?? nowIso(),
    deleted: Boolean(local.deleted)
  };
}

export function toRemoteBlock(local, userId) {
  return {
    id: local.id,
    user_id: userId,
    page_id: local.pageId,
    type: local.type ?? "note",
    order: local.order ?? 0,
    content: local.content ?? {},
    metadata: local.metadata ?? {},
    source_block_id: local.sourceBlockId ?? null,
    created_at: local.metadata?.createdAt ?? nowIso(),
    updated_at: local.metadata?.updatedAt ?? nowIso(),
    deleted: Boolean(local.deleted)
  };
}

// ── Remote → Local ─────────────────────────────────────────────

export function fromRemoteWorkspace(remote) {
  return {
    id: remote.id,
    title: remote.title ?? "",
    createdAt: remote.created_at,
    updatedAt: remote.updated_at
  };
}

export function fromRemoteSection(remote) {
  return {
    id: remote.id,
    workspaceId: remote.workspace_id,
    title: remote.title ?? "",
    order: remote.order ?? 0,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at
  };
}

export function fromRemotePage(remote) {
  return {
    id: remote.id,
    workspaceId: remote.workspace_id,
    sectionId: remote.section_id,
    title: remote.title ?? "",
    createdAt: remote.created_at,
    updatedAt: remote.updated_at
  };
}

export function fromRemoteBlock(remote) {
  return {
    id: remote.id,
    pageId: remote.page_id,
    type: remote.type ?? "note",
    order: remote.order ?? 0,
    content: remote.content ?? {},
    metadata: {
      ...(remote.metadata ?? {}),
      createdAt: remote.created_at,
      updatedAt: remote.updated_at
    },
    sourceBlockId: remote.source_block_id ?? undefined
  };
}

// ── Dispatcher ─────────────────────────────────────────────────

const converters = {
  workspace: { toRemote: toRemoteWorkspace, fromRemote: fromRemoteWorkspace },
  section: { toRemote: toRemoteSection, fromRemote: fromRemoteSection },
  page: { toRemote: toRemotePage, fromRemote: fromRemotePage },
  block: { toRemote: toRemoteBlock, fromRemote: fromRemoteBlock }
};

export function toRemoteRecord(entity, localRecord, userId) {
  const converter = converters[entity];
  if (!converter) throw new Error(`Unknown entity type: ${entity}`);
  return converter.toRemote(localRecord, userId);
}

export function fromRemoteRecord(entity, remoteRecord) {
  const converter = converters[entity];
  if (!converter) throw new Error(`Unknown entity type: ${entity}`);
  return converter.fromRemote(remoteRecord);
}

/** Supabase table name for a given entity type */
export function tableName(entity) {
  const map = {
    workspace: "workspaces",
    section: "sections",
    page: "pages",
    block: "blocks"
  };
  return map[entity] ?? entity;
}
