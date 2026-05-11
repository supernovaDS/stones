import { Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate, isOverdue } from "../../utils/date";
import { priorityRail, priorityClasses } from "../../utils/constants";
import { blockMatchesSearch, taskMatchesFilter, compareTasksByDate, groupTasks } from "../../utils/helpers";
import { InsightCard, Checkbox } from "../ui";

export function TaskListView({ searchQuery }) {
  const { blocks } = useAppStore();
  const [filter, setFilter] = useState("open");
  const [groupMode, setGroupMode] = useState("none");
  const allTasks = blocks.filter((b) => b.type === "task");
  const tasks = allTasks
    .filter((t) => taskMatchesFilter(t, filter))
    .filter((t) => blockMatchesSearch(t, searchQuery))
    .sort(compareTasksByDate);
  const groups = groupTasks(tasks, groupMode);
  const completedCount = allTasks.filter((t) => t.metadata.completed).length;
  const highCount = allTasks.filter((t) => t.metadata.priority === "high" && !t.metadata.completed).length;
  const overdueCount = allTasks.filter((t) => !t.metadata.completed && isOverdue(t.metadata.deadline)).length;

  return (
    <div className="bento-grid">
      <section className="span-12 grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        <InsightCard color="green" label="Completion" value={`${Math.round((completedCount / Math.max(1, allTasks.length)) * 100)}%`} />
        <InsightCard color="orange" label="High Priority" value={highCount.toString()} />
        <InsightCard color="purple" label="Overdue" value={overdueCount.toString()} />
      </section>
      <section className="bento-card span-12 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {["open","today","overdue","upcoming","no-date","high","done","all"].map((item) => (
            <button className={clsx("nb-button min-h-0 px-3 py-2 text-sm capitalize", filter === item ? "primary" : "bg-white dark:bg-[#12151a]")} key={item} onClick={() => setFilter(item)} type="button">{item}</button>
          ))}
          <select className="nb-select ml-auto h-11 px-3 text-sm font-black" onChange={(e) => setGroupMode(e.target.value)} value={groupMode}>
            <option value="none">Sort by date</option>
            <option value="day">Group by day</option>
            <option value="week">Group by week</option>
            <option value="month">Group by month</option>
          </select>
        </div>
        <div className="grid gap-4">
          {groups.map((group) => (
            <section key={group.label}>
              {groupMode !== "none" ? <h3 className="mb-2 text-sm font-semibold text-stone-500 dark:text-[#5a5650]">{group.label}</h3> : null}
              <div className="grid gap-3">{group.tasks.map((task) => <TaskListCard key={task.id} task={task} />)}</div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

function TaskListCard({ task }) {
  const { deleteBlock, setSelectedTask, toggleTask } = useAppStore();
  return (
    <article className={clsx("bento-card grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-l-[10px] p-3 max-sm:grid-cols-[auto_1fr_auto]", priorityRail[task.metadata.priority ?? "medium"])}>
      <Checkbox checked={task.metadata.completed} onChange={() => void toggleTask(task.id)} />
      <button className="min-w-0 text-left" onClick={() => setSelectedTask(task.id)} type="button">
        <span className={clsx("block truncate font-semibold", task.metadata.completed && "text-stone-400 line-through dark:text-[#5a5650]")}>{task.content.title || "Untitled task"}</span>
        <span className="text-xs text-stone-500 dark:text-[#5a5650]">{task.metadata.priority ?? "medium"} priority - {formatShortDate(task.metadata.deadline)}</span>
      </button>
      <span className={clsx("rounded-md border px-2 py-1 text-xs font-semibold", priorityClasses[task.metadata.priority ?? "medium"])}>{task.metadata.priority ?? "medium"}</span>
      <button className="icon-button danger max-sm:col-start-3" onClick={() => void deleteBlock(task.id)} title="Delete task" type="button"><Trash2 size={15} /></button>
    </article>
  );
}
