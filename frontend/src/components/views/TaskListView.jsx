import { Trash2, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate } from "../../utils/date";
import { priorityClasses } from "../../utils/constants";
import { Checkbox } from "../ui";
import { useFilteredTasks } from "../../hooks/useFilteredTasks";

export function TaskListView() {
  const { blocks, setRecurringTasksOpen, setEditingRepeatedTaskId } = useAppStore();
  const [filter, setFilter] = useState(() => localStorage.getItem("stones-task-filter") || "open");
  const [sortBy, setSortBy] = useState(() => localStorage.getItem("stones-task-sortby") || "date_scheduled");
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem("stones-task-sortorder") || "asc");

  const handleFilterChange = (val) => {
    setFilter(val);
    localStorage.setItem("stones-task-filter", val);
  };

  const handleSortByChange = (val) => {
    setSortBy(val);
    localStorage.setItem("stones-task-sortby", val);
  };

  const handleSortOrderChange = (val) => {
    setSortOrder(val);
    localStorage.setItem("stones-task-sortorder", val);
  };

  const tasks = useFilteredTasks(blocks, filter, sortBy, sortOrder);

  return (
    <div className="bento-grid">
      <section className="bento-card span-12 bg-white p-4 text-black dark:bg-[#12151a] dark:text-[#c8c3ba]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select 
            className="nb-select h-11 px-3 text-sm font-black capitalize" 
            onChange={(e) => handleFilterChange(e.target.value)} 
            value={filter}
          >
            <option value="open">Open</option>
            <option value="today">Today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="failed">Failed</option>
            <option value="done">Done</option>
            <option value="all">All</option>
          </select>
          <div className="ml-auto flex items-center gap-2 max-sm:w-full max-sm:mt-2">
            <select className="nb-select h-11 px-3 text-sm font-black max-sm:flex-1" onChange={(e) => handleSortByChange(e.target.value)} value={sortBy}>
              <option value="priority">Sort by priority</option>
              <option value="date_completed">Sort by date completed</option>
              <option value="date_scheduled">Sort by date scheduled</option>
            </select>
            <select className="nb-select h-11 px-3 text-sm font-black max-sm:flex-1" onChange={(e) => handleSortOrderChange(e.target.value)} value={sortOrder}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        <div className="grid gap-3">
          {tasks.length ? (
            tasks.map((task) => <TaskListCard key={task.id} task={task} />)
          ) : (
            <p className="rounded-lg border-[3px] border-dashed border-black px-3 py-8 text-center text-sm font-black text-stone-600 dark:border-[#1e232a] dark:text-[#5a5650]">
              No tasks found.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function TaskListCard({ task }) {
  const { deleteBlock, setSelectedTask, toggleTask, toggleFailTask } = useAppStore();
  
  const handleTitleClick = () => {
    setSelectedTask(task.id);
  };

  return (
    <article className="bento-card grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-3 max-sm:grid-cols-[auto_1fr_auto]">
      <Checkbox checked={task.metadata.completed} onChange={() => void toggleTask(task.id)} />
      {task.isVirtual ? (
        <div className="min-w-0 text-left select-none">
          <span className={clsx("block truncate font-semibold", task.metadata.completed && "text-stone-400 line-through dark:text-[#5a5650]", task.metadata.failed && "text-red-500 line-through dark:text-red-400")}>{task.content.title || "Untitled task"}</span>
          <span className="text-xs text-stone-500 dark:text-[#5a5650]">
            {task.metadata.priority ?? "medium"} priority - {formatShortDate(task.metadata.deadline)}
            {task.metadata.completed && task.metadata.completedAt && (
              ` - Completed: ${new Date(task.metadata.completedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}`
            )}
            {" (Repeating)"}
          </span>
        </div>
      ) : (
        <button className="min-w-0 text-left" onClick={handleTitleClick} data-prevent-outside-close="true" type="button">
          <span className={clsx("block truncate font-semibold", task.metadata.completed && "text-stone-400 line-through dark:text-[#5a5650]", task.metadata.failed && "text-red-500 line-through dark:text-red-400")}>{task.content.title || "Untitled task"}</span>
          <span className="text-xs text-stone-500 dark:text-[#5a5650]">
            {task.metadata.priority ?? "medium"} priority - {formatShortDate(task.metadata.deadline)}
            {task.metadata.completed && task.metadata.completedAt && (
              ` - Completed: ${new Date(task.metadata.completedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}`
            )}
          </span>
        </button>
      )}
      <span className={clsx("rounded-md border px-2 py-1 text-xs font-semibold", priorityClasses[task.metadata.priority ?? "medium"])}>{task.metadata.priority ?? "medium"}</span>
      <div className="flex gap-1 max-sm:col-start-3">
        {(!task.metadata.completed || task.metadata.failed) && (
          <button 
            className={clsx(
              "icon-button", 
              task.metadata.failed 
                ? "!bg-[#ff5a5f] !text-black border-black dark:!bg-[#5c1a1d] dark:!text-[#e8a0a2] dark:border-[#1e232a]" 
                : "bg-white text-stone-600 dark:bg-[#12151a] dark:text-[#7a7670]"
            )} 
            onClick={() => void toggleFailTask(task.id)} 
            title={task.metadata.failed ? "Unfail task" : "Fail task"} 
            type="button"
          >
            <XCircle size={15} />
          </button>
        )}
        {!task.isVirtual && (
          <button className="icon-button danger" onClick={() => void deleteBlock(task.id)} title="Delete task" type="button"><Trash2 size={15} /></button>
        )}
      </div>
    </article>
  );
}

