import { db } from "../../db/schema";
import { deleteTaskImage, uploadTaskImage } from "../../services/imageUploadService";
import { enqueueMutation } from "../../sync/syncQueue";
import { nextRecurringDate } from "../../utils/date";
import { getVirtualTasksForDate } from "../../utils/recurrence";
import {
  addBlock,
  createId,
  fileToDataUrl,
  makeDeletedItem,
  makeNextRecurringTask,
  normalizeBlock,
  nowIso,
  parseVirtualTaskId,
  pushUndoSnapshot,
  sortBlocks,
  upsertRecurringInstance
} from "../storeHelpers";

export const createBlockSlice = (set, get) => ({
  blocks: [],

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
        completed: false,
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

  moveBlock: async (blockId, direction) => {
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block) return;

    const pageBlocks = get()
      .blocks.filter((item) => item.pageId === block.pageId)
      .sort((a, b) => a.order - b.order);
    const index = pageBlocks.findIndex((item) => item.id === blockId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pageBlocks.length) return;

    pushUndoSnapshot(get, set, "move block");
    const targetBlock = pageBlocks[targetIndex];
    const updatedAt = nowIso();
    const updatedBlock = {
      ...block,
      order: targetBlock.order,
      metadata: { ...block.metadata, updatedAt }
    };
    const updatedTarget = {
      ...targetBlock,
      order: block.order,
      metadata: { ...targetBlock.metadata, updatedAt }
    };

    await db.transaction("rw", db.blocks, async () => {
      await db.blocks.put(updatedBlock);
      await db.blocks.put(updatedTarget);
    });
    await enqueueMutation("block", updatedBlock.id, "upsert", updatedBlock);
    await enqueueMutation("block", updatedTarget.id, "upsert", updatedTarget);

    set((state) => ({
      blocks: sortBlocks(
        state.blocks.map((item) => {
          if (item.id === updatedBlock.id) return updatedBlock;
          if (item.id === updatedTarget.id) return updatedTarget;
          return item;
        })
      )
    }));
  },

  reorderBlock: async (pageId, sourceIndex, destinationIndex) => {
    if (sourceIndex === destinationIndex) return;
    const pageBlocks = get()
      .blocks.filter((item) => item.pageId === pageId)
      .sort((a, b) => a.order - b.order);
    if (sourceIndex < 0 || sourceIndex >= pageBlocks.length) return;
    if (destinationIndex < 0 || destinationIndex >= pageBlocks.length) return;

    pushUndoSnapshot(get, set, "reorder block");
    const reordered = [...pageBlocks];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);

    const updatedAt = nowIso();
    const updatedBlocks = reordered.map((b, idx) => ({
      ...b,
      order: idx + 1,
      metadata: { ...b.metadata, updatedAt }
    }));

    await db.transaction("rw", db.blocks, async () => {
      for (const b of updatedBlocks) {
        await db.blocks.put(b);
      }
    });

    for (const b of updatedBlocks) {
      await enqueueMutation("block", b.id, "upsert", b);
    }

    set((state) => {
      const updatedMap = new Map(updatedBlocks.map((b) => [b.id, b]));
      return {
        blocks: sortBlocks(state.blocks.map((b) => updatedMap.get(b.id) || b))
      };
    });
  },

  deleteBlock: async (blockId) => {
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block) return;

    pushUndoSnapshot(get, set, `delete ${block.type}`);
    await db.blocks.delete(blockId);
    await enqueueMutation("block", blockId, "delete", block);

    if (block.content?.imageUrl) {
      await deleteTaskImage(block.content.imageUrl);
    }

    const deletedItem = makeDeletedItem(
      "block",
      `Block (${block.type})`,
      { block },
      get().view
    );

    set((state) => ({
      blocks: state.blocks.filter((item) => item.id !== blockId),
      selectedTaskId:
        state.selectedTaskId === blockId ? undefined : state.selectedTaskId,
      recentlyDeleted: [deletedItem, ...state.recentlyDeleted]
    }));
    get().setNotification("Block deleted");
  },

  convertNoteToTask: async (blockId) => {
    const block = get().blocks.find((item) => item.id === blockId);
    if (!block || block.type !== "note") return;

    pushUndoSnapshot(get, set, "convert note to task");
    const updatedAt = nowIso();
    const taskBlock = {
      id: createId("block"),
      pageId: block.pageId,
      type: "task",
      order: block.order + 1,
      sourceBlockId: block.id,
      content: {
        title: block.content.text.slice(0, 80) || "Converted Task",
        notes: block.content.text,
        subtasks: [],
        dependencyIds: []
      },
      metadata: {
        completed: false,
        priority: "medium",
        recurrence: "none",
        createdAt: updatedAt,
        updatedAt
      }
    };

    await db.blocks.add(taskBlock);
    await enqueueMutation("block", taskBlock.id, "upsert", taskBlock);
    set((state) => ({ blocks: sortBlocks([...state.blocks, taskBlock]) }));
    get().setNotification("Converted note to task");
  },

  convertTextToTask: async (text, pageId = get().activePageId) => {
    if (!text || !pageId) return;
    pushUndoSnapshot(get, set, "convert text to task");
    const createdAt = nowIso();
    const order =
      Math.max(
        0,
        ...get()
          .blocks.filter((block) => block.pageId === pageId)
          .map((block) => block.order)
      ) + 1;

    const taskBlock = {
      id: createId("block"),
      pageId,
      type: "task",
      order,
      content: {
        title: text.slice(0, 100),
        notes: text.length > 100 ? text : "",
        subtasks: [],
        dependencyIds: []
      },
      metadata: {
        completed: false,
        priority: "medium",
        recurrence: "none",
        createdAt,
        updatedAt: createdAt
      }
    };

    await db.blocks.add(taskBlock);
    await enqueueMutation("block", taskBlock.id, "upsert", taskBlock);
    set((state) => ({ blocks: sortBlocks([...state.blocks, taskBlock]) }));
    get().setNotification("Task created from text");
  },

  quickAddTask: async (rawText) => {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();
    let priority = "medium";
    if (text.includes("!high")) priority = "high";
    if (text.includes("!low")) priority = "low";

    const cleanTitle = text.replace(/!high|!medium|!low/g, "").trim();

    await get().addTaskBlock({
      title: cleanTitle,
      priority
    });
  },

  toggleRepeatedTaskInstance: async (templateId, dateStr) => {
    pushUndoSnapshot(get, set, "toggle recurring task");
    const existing = get().blocks.find(
      (b) => b.type === "completed_repeat" && b.content?.templateId === templateId && b.metadata?.completedDate === dateStr
    );

    if (existing) {
      await db.blocks.delete(existing.id);
      await enqueueMutation("block", existing.id, "delete", existing);
      set((state) => ({
        blocks: state.blocks.filter((b) => b.id !== existing.id)
      }));
    } else {
      const failed = get().blocks.find(
        (b) => b.type === "failed_repeat" && b.content?.templateId === templateId && b.metadata?.failedDate === dateStr
      );
      if (failed) {
        await db.blocks.delete(failed.id);
        await enqueueMutation("block", failed.id, "delete", failed);
      }

      const updatedAt = nowIso();
      const completionBlock = {
        id: createId("completed_repeat"),
        pageId: "system-recurring",
        type: "completed_repeat",
        order: 0,
        content: { templateId },
        metadata: {
          completedDate: dateStr,
          completedAt: updatedAt,
          createdAt: updatedAt,
          updatedAt
        }
      };

      await db.blocks.add(completionBlock);
      await enqueueMutation("block", completionBlock.id, "upsert", completionBlock);

      set((state) => ({
        blocks: sortBlocks([
          ...state.blocks.filter((b) => !failed || b.id !== failed.id),
          completionBlock
        ])
      }));
    }
  },

  toggleRepeatedTaskInstanceFail: async (templateId, dateStr) => {
    pushUndoSnapshot(get, set, "fail recurring task");
    const existing = get().blocks.find(
      (b) => b.type === "failed_repeat" && b.content?.templateId === templateId && b.metadata?.failedDate === dateStr
    );

    if (existing) {
      await db.blocks.delete(existing.id);
      await enqueueMutation("block", existing.id, "delete", existing);
      set((state) => ({
        blocks: state.blocks.filter((b) => b.id !== existing.id)
      }));
    } else {
      const completed = get().blocks.find(
        (b) => b.type === "completed_repeat" && b.content?.templateId === templateId && b.metadata?.completedDate === dateStr
      );
      if (completed) {
        await db.blocks.delete(completed.id);
        await enqueueMutation("block", completed.id, "delete", completed);
      }

      const updatedAt = nowIso();
      const failureBlock = {
        id: createId("failed_repeat"),
        pageId: "system-recurring",
        type: "failed_repeat",
        order: 0,
        content: { templateId },
        metadata: {
          failedDate: dateStr,
          failedAt: updatedAt,
          createdAt: updatedAt,
          updatedAt
        }
      };

      await db.blocks.add(failureBlock);
      await enqueueMutation("block", failureBlock.id, "upsert", failureBlock);

      set((state) => ({
        blocks: sortBlocks([
          ...state.blocks.filter((b) => !completed || b.id !== completed.id),
          failureBlock
        ])
      }));
    }
  },

  editRepeatedTaskInstance: async (templateId, patch) => {
    const template = get().blocks.find((b) => b.id === templateId && b.type === "recurring_template");
    if (!template) return;

    pushUndoSnapshot(get, set, "edit recurring template");
    const updatedAt = nowIso();

    const updatedTemplate = {
      ...template,
      content: {
        ...template.content,
        title: patch.title !== undefined ? patch.title : template.content.title,
        notes: patch.notes !== undefined ? patch.notes : template.content.notes,
        subtasks: patch.subtasks !== undefined ? patch.subtasks : template.content.subtasks
      },
      metadata: {
        ...template.metadata,
        priority: patch.priority !== undefined ? patch.priority : template.metadata.priority,
        recurrence: patch.recurrence !== undefined ? patch.recurrence : template.metadata.recurrence,
        customInterval: patch.customInterval !== undefined ? patch.customInterval : template.metadata.customInterval,
        customUnit: patch.customUnit !== undefined ? patch.customUnit : template.metadata.customUnit,
        startDate: patch.startDate !== undefined ? patch.startDate : template.metadata.startDate,
        endDate: patch.endDate !== undefined ? patch.endDate : template.metadata.endDate,
        deadlineTime: patch.deadlineTime !== undefined ? patch.deadlineTime : template.metadata.deadlineTime,
        updatedAt
      }
    };

    await db.blocks.put(updatedTemplate);
    await enqueueMutation("block", updatedTemplate.id, "upsert", updatedTemplate);

    set((state) => ({
      blocks: sortBlocks(
        state.blocks.map((b) => (b.id === templateId ? updatedTemplate : b))
      )
    }));
  },

  pauseRepeatedTask: async (templateId) => {
    const template = get().blocks.find((b) => b.id === templateId && b.type === "recurring_template");
    if (!template) return;

    pushUndoSnapshot(get, set, "pause recurring task");
    const updatedAt = nowIso();
    const updatedTemplate = {
      ...template,
      metadata: {
        ...template.metadata,
        status: "paused",
        pausedAt: updatedAt.slice(0, 10),
        updatedAt
      }
    };

    await db.blocks.put(updatedTemplate);
    await enqueueMutation("block", updatedTemplate.id, "upsert", updatedTemplate);

    set((state) => ({
      blocks: sortBlocks(
        state.blocks.map((b) => (b.id === templateId ? updatedTemplate : b))
      )
    }));
  },

  resumeRepeatedTask: async (templateId) => {
    const template = get().blocks.find((b) => b.id === templateId && b.type === "recurring_template");
    if (!template) return;

    pushUndoSnapshot(get, set, "resume recurring task");
    const updatedAt = nowIso();
    const updatedTemplate = {
      ...template,
      metadata: {
        ...template.metadata,
        status: "active",
        pausedAt: undefined,
        updatedAt
      }
    };

    await db.blocks.put(updatedTemplate);
    await enqueueMutation("block", updatedTemplate.id, "upsert", updatedTemplate);

    set((state) => ({
      blocks: sortBlocks(
        state.blocks.map((b) => (b.id === templateId ? updatedTemplate : b))
      )
    }));
  },

  endRepeatedTask: async (templateId) => {
    const template = get().blocks.find((b) => b.id === templateId && b.type === "recurring_template");
    if (!template) return;

    pushUndoSnapshot(get, set, "end recurring task");
    const updatedAt = nowIso();
    const updatedTemplate = {
      ...template,
      metadata: {
        ...template.metadata,
        status: "ended",
        endDate: updatedAt.slice(0, 10),
        updatedAt
      }
    };

    await db.blocks.put(updatedTemplate);
    await enqueueMutation("block", updatedTemplate.id, "upsert", updatedTemplate);

    set((state) => ({
      blocks: sortBlocks(
        state.blocks.map((b) => (b.id === templateId ? updatedTemplate : b))
      )
    }));
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
  },

  addRepeatedTask: async (taskData) => {
    pushUndoSnapshot(get, set, "create recurring task");
    const createdAt = nowIso();
    const templateBlock = {
      id: createId("block"),
      pageId: "system-recurring",
      type: "recurring_template",
      order: 0,
      content: {
        title: taskData.title,
        notes: taskData.notes || "",
        subtasks: taskData.subtasks || []
      },
      metadata: {
        status: "active",
        priority: taskData.priority || "medium",
        recurrence: taskData.recurrence || "daily",
        customInterval: taskData.customInterval,
        customUnit: taskData.customUnit,
        startDate: taskData.startDate || createdAt.slice(0, 10),
        endDate: taskData.endDate || undefined,
        deadlineTime: taskData.deadlineTime || undefined,
        createdAt,
        updatedAt: createdAt
      }
    };

    await db.blocks.add(templateBlock);
    await enqueueMutation("block", templateBlock.id, "upsert", templateBlock);

    set((state) => ({
      blocks: sortBlocks([...state.blocks, templateBlock])
    }));
    get().setNotification("Recurring schedule created");
    return templateBlock;
  },

  updateRepeatedTask: async (templateId, taskData) => {
    return get().editRepeatedTaskInstance(templateId, taskData);
  },

  deleteRepeatedTask: async (templateId, options = {}) => {
    const template = get().blocks.find((b) => b.id === templateId && b.type === "recurring_template");
    if (!template) return;

    pushUndoSnapshot(get, set, "delete recurring task");

    await db.blocks.delete(templateId);
    await enqueueMutation("block", templateId, "delete", template);

    const blocksToRemove = [templateId];

    if (options.completed || options.failed || options.due) {
      const relatedBlocks = get().blocks.filter(
        (b) =>
          (b.type === "completed_repeat" || b.type === "failed_repeat" || b.type === "recurring_instance") &&
          (b.content?.templateId === templateId || b.metadata?.templateId === templateId)
      );

      for (const rel of relatedBlocks) {
        await db.blocks.delete(rel.id);
        await enqueueMutation("block", rel.id, "delete", rel);
        blocksToRemove.push(rel.id);
      }
    }

    const removeSet = new Set(blocksToRemove);
    set((state) => ({
      blocks: state.blocks.filter((b) => !removeSet.has(b.id))
    }));

    get().setNotification("Recurring schedule deleted");
  }
});
