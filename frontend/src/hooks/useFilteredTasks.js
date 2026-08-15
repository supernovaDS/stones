import { useMemo } from "react";
import { taskMatchesFilter } from "../utils/helpers";
import { getVirtualTasksForFilter } from "../utils/recurrence";

export function useFilteredTasks(blocks, filter, sortBy, sortOrder) {
  const allTasks = useMemo(() => blocks.filter((b) => b.type === "task"), [blocks]);
  const virtualTasks = useMemo(() => getVirtualTasksForFilter(filter, blocks), [filter, blocks]);

  return useMemo(() => {
    const list = [
      ...allTasks.filter((t) => taskMatchesFilter(t, filter)),
      ...virtualTasks
    ];

    return list.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date_scheduled" || sortBy === "date") {
        const aDate = a.metadata.deadline;
        const bDate = b.metadata.deadline;
        if (!aDate && !bDate) {
          comparison = 0;
        } else if (!aDate) {
          comparison = 1;
        } else if (!bDate) {
          comparison = -1;
        } else {
          comparison = aDate.localeCompare(bDate);
        }

        // Secondary sort: Priority descending (high -> medium -> low)
        if (comparison === 0) {
          const priorityWeights = { high: 3, medium: 2, low: 1 };
          const aWeight = priorityWeights[a.metadata.priority] ?? 2;
          const bWeight = priorityWeights[b.metadata.priority] ?? 2;
          comparison = bWeight - aWeight;
        }
      } else if (sortBy === "date_completed") {
        const aDate = a.metadata.completedAt;
        const bDate = b.metadata.completedAt;
        if (!aDate && !bDate) {
          comparison = 0;
        } else if (!aDate) {
          comparison = 1;
        } else if (!bDate) {
          comparison = -1;
        } else {
          comparison = aDate.localeCompare(bDate);
        }
      } else if (sortBy === "priority") {
        const priorityWeights = { high: 3, medium: 2, low: 1 };
        const aWeight = priorityWeights[a.metadata.priority] ?? 2;
        const bWeight = priorityWeights[b.metadata.priority] ?? 2;
        comparison = aWeight - bWeight;

        // Secondary sort: Date ascending (earliest first)
        if (comparison === 0) {
          const aDate = a.metadata.deadline;
          const bDate = b.metadata.deadline;
          if (!aDate && !bDate) {
            comparison = 0;
          } else if (!aDate) {
            comparison = 1;
          } else if (!bDate) {
            comparison = -1;
          } else {
            comparison = aDate.localeCompare(bDate);
          }
        }
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [allTasks, virtualTasks, filter, sortBy, sortOrder]);
}
