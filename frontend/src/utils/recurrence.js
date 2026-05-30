import { toLocalDateString, todayIso } from "./date";

// Helper to parse date string safely in local time
function parseLocalDate(dateStr) {
  const parts = dateStr.slice(0, 10).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Checks if a repeating template is scheduled to occur on a given date.
 */
export function isOccurringOnDate(template, dateStr) {
  const startStr = template.metadata?.startDate;
  if (!startStr || dateStr < startStr) return false;

  const endStr = template.metadata?.endDate;
  if (endStr && dateStr > endStr) return false;

  const recurrence = template.metadata?.recurrence || "none";
  if (recurrence === "daily") return true;

  const targetDate = parseLocalDate(dateStr);
  const startDate = parseLocalDate(startStr);

  if (recurrence === "weekdays") {
    const day = targetDate.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  }

  if (recurrence === "weekly") {
    return targetDate.getDay() === startDate.getDay();
  }

  if (recurrence === "monthly") {
    const targetDay = targetDate.getDate();
    const startDay = startDate.getDate();
    if (targetDay === startDay) return true;

    // Last day of the month fallback
    if (startDay > 28) {
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      if (nextDay.getMonth() !== targetDate.getMonth()) {
        return startDay > targetDay;
      }
    }
    return false;
  }

  if (recurrence === "custom") {
    const interval = Math.max(1, Number(template.metadata?.customInterval || 1));
    const unit = template.metadata?.customUnit || "days";

    if (unit === "days") {
      const diffTime = Math.abs(targetDate - startDate);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays % interval === 0;
    }

    if (unit === "weeks") {
      if (targetDate.getDay() !== startDate.getDay()) return false;
      const diffTime = Math.abs(targetDate - startDate);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.round(diffDays / 7);
      return diffWeeks % interval === 0;
    }

    if (unit === "months") {
      const targetDay = targetDate.getDate();
      const startDay = startDate.getDate();
      let dayMatches = targetDay === startDay;

      if (!dayMatches && startDay > 28) {
        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);
        if (nextDay.getMonth() !== targetDate.getMonth()) {
          dayMatches = startDay > targetDay;
        }
      }

      if (!dayMatches) return false;

      const diffMonths =
        (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
        (targetDate.getMonth() - startDate.getMonth());
      return diffMonths >= 0 && diffMonths % interval === 0;
    }
  }

  return false;
}

/**
 * Returns virtual task instances occurring on a specific date.
 */
export function getVirtualTasksForDate(dateStr, blocks) {
  const templates = blocks.filter((b) => b.type === "recurring_template" && !b.deleted);
  const completions = blocks.filter(
    (b) => b.type === "completed_repeat" && b.metadata?.completedDate === dateStr && !b.deleted
  );
  const failures = blocks.filter(
    (b) => b.type === "failed_repeat" && b.metadata?.failedDate === dateStr && !b.deleted
  );
  const instances = blocks.filter(
    (b) => b.type === "recurring_instance" && b.content?.dateStr === dateStr && !b.deleted
  );

  return templates
    .filter((template) => isOccurringOnDate(template, dateStr))
    .map((template) => {
      const isCompleted = completions.some((c) => c.content?.templateId === template.id);
      const isFailed = failures.some((f) => f.content?.templateId === template.id);
      const instance = instances.find((inst) => inst.content?.templateId === template.id);
      const subtasks = instance ? (instance.content?.subtasks || []) : (template.content?.subtasks || []);
      return {
        id: `virtual_${template.id}_${dateStr}`,
        isVirtual: true,
        templateId: template.id,
        type: "task",
        content: {
          title: template.content?.title || "Untitled task",
          notes: template.content?.notes || "",
          subtasks: subtasks
        },
        metadata: {
          deadline: dateStr + (template.metadata?.deadlineTime ? `T${template.metadata.deadlineTime}` : ""),
          completed: isCompleted,
          failed: isFailed,
          priority: template.metadata?.priority || "medium",
          isRepeated: true
        }
      };
    });
}

/**
 * Scans relevant dates based on the filter and returns all matching virtual tasks.
 */
export function getVirtualTasksForFilter(filter, blocks) {
  const todayStr = todayIso();
  const templates = blocks.filter((b) => b.type === "recurring_template" && !b.deleted);

  if (filter === "today") {
    return getVirtualTasksForDate(todayStr, blocks);
  }

  if (filter === "overdue") {
    // Scan past 30 days (excluding today)
    const list = [];
    for (let i = 30; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = toLocalDateString(date);
      const dayTasks = getVirtualTasksForDate(dateStr, blocks);
      list.push(...dayTasks.filter((t) => !t.metadata.completed && !t.metadata.failed));
    }
    return list;
  }

  if (filter === "upcoming") {
    // Scan next 14 days starting tomorrow
    const list = [];
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = toLocalDateString(date);
      const dayTasks = getVirtualTasksForDate(dateStr, blocks);
      list.push(...dayTasks.filter((t) => !t.metadata.completed && !t.metadata.failed));
    }
    return list;
  }

  if (filter === "done") {
    // Return all completed repeat instances
    const completions = blocks.filter((b) => b.type === "completed_repeat" && !b.deleted);
    return completions.map((c) => {
      const template = templates.find((t) => t.id === c.content?.templateId);
      const dateStr = c.metadata?.completedDate;
      const instance = blocks.find(
        (b) => b.type === "recurring_instance" && b.content?.templateId === c.content?.templateId && b.content?.dateStr === dateStr && !b.deleted
      );
      const subtasks = instance ? (instance.content?.subtasks || []) : (template?.content?.subtasks || []);
      return {
        id: `virtual_${c.content?.templateId}_${dateStr}`,
        isVirtual: true,
        templateId: c.content?.templateId,
        type: "task",
        content: {
          title: template?.content?.title || "Recurring Task",
          notes: template?.content?.notes || "",
          subtasks: subtasks
        },
        metadata: {
          deadline: dateStr + (template?.metadata?.deadlineTime ? `T${template.metadata.deadlineTime}` : ""),
          completed: true,
          completedAt: c.metadata?.completedAt,
          priority: template?.metadata?.priority || "medium",
          isRepeated: true
        }
      };
    });
  }

  if (filter === "failed") {
    // Return all failed repeat instances
    const failures = blocks.filter((b) => b.type === "failed_repeat" && !b.deleted);
    return failures.map((f) => {
      const template = templates.find((t) => t.id === f.content?.templateId);
      const dateStr = f.metadata?.failedDate;
      const instance = blocks.find(
        (b) => b.type === "recurring_instance" && b.content?.templateId === f.content?.templateId && b.content?.dateStr === dateStr && !b.deleted
      );
      const subtasks = instance ? (instance.content?.subtasks || []) : (template?.content?.subtasks || []);
      return {
        id: `virtual_${f.content?.templateId}_${dateStr}`,
        isVirtual: true,
        templateId: f.content?.templateId,
        type: "task",
        content: {
          title: template?.content?.title || "Recurring Task",
          notes: template?.content?.notes || "",
          subtasks: subtasks
        },
        metadata: {
          deadline: dateStr + (template?.metadata?.deadlineTime ? `T${template.metadata.deadlineTime}` : ""),
          completed: false,
          failed: true,
          failedAt: f.metadata?.failedAt,
          priority: template?.metadata?.priority || "medium",
          isRepeated: true
        }
      };
    });
  }

  if (filter === "open") {
    const todayTasks = getVirtualTasksForDate(todayStr, blocks).filter((t) => !t.metadata.completed && !t.metadata.failed);
    const overdueTasks = getVirtualTasksForFilter("overdue", blocks);
    return [...todayTasks, ...overdueTasks];
  }

  if (filter === "high") {
    const openTasks = getVirtualTasksForFilter("open", blocks);
    return openTasks.filter((t) => t.metadata.priority === "high");
  }

  if (filter === "all") {
    const open = getVirtualTasksForFilter("open", blocks);
    const upcoming = getVirtualTasksForFilter("upcoming", blocks);
    const done = getVirtualTasksForFilter("done", blocks);
    const failed = getVirtualTasksForFilter("failed", blocks);
    return [...open, ...upcoming, ...done, ...failed];
  }

  return [];
}

/**
 * Returns past virtual task occurrences for statistics and streak checking.
 */
export function getHistoryVirtualTasks(blocks, limitDays = 30) {
  const list = [];
  const templates = blocks.filter((b) => b.type === "recurring_template" && !b.deleted);
  const completions = blocks.filter((b) => b.type === "completed_repeat" && !b.deleted);
  const failures = blocks.filter((b) => b.type === "failed_repeat" && !b.deleted);

  templates.forEach((template) => {
    const startStr = template.metadata?.startDate;
    if (!startStr) return;

    const start = parseLocalDate(startStr);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - limitDays);

    const scanStart = start > thirtyDaysAgo ? start : thirtyDaysAgo;
    const scanEnd = new Date(); // up to today

    for (let d = new Date(scanStart); d <= scanEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateString(d);
      if (isOccurringOnDate(template, dateStr)) {
        const comp = completions.find(
          (c) => c.content?.templateId === template.id && c.metadata?.completedDate === dateStr
        );
        const fail = failures.find(
          (f) => f.content?.templateId === template.id && f.metadata?.failedDate === dateStr
        );
        const instance = blocks.find(
          (b) => b.type === "recurring_instance" && b.content?.templateId === template.id && b.content?.dateStr === dateStr && !b.deleted
        );
        const subtasks = instance ? (instance.content?.subtasks || []) : (template.content?.subtasks || []);
        list.push({
          id: `virtual_${template.id}_${dateStr}`,
          isVirtual: true,
          type: "task",
          content: {
            title: template.content?.title || "Untitled task",
            notes: template.content?.notes || "",
            subtasks: subtasks
          },
          metadata: {
            deadline: dateStr + (template.metadata?.deadlineTime ? `T${template.metadata.deadlineTime}` : ""),
            completed: !!comp,
            completedAt: comp ? comp.metadata?.completedAt : undefined,
            failed: !!fail,
            failedAt: fail ? fail.metadata?.failedAt : undefined,
            priority: template.metadata?.priority || "medium",
            isRepeated: true
          }
        });
      }
    }
  });

  return list;
}
