import { Bell, History, RotateCcw, X } from "lucide-react";
import { clsx } from "clsx";
import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate } from "../../utils/date";
import { calculateStreak, heatColor } from "../../utils/helpers";
import { HeaderButton, IconButton, Metric } from "../ui";

export function InsightsView() {
  const {
    blocks,
    dismissDeletedItem,
    recentlyDeleted,
    restoreDeletedItem,
    setNotification,
    undoLastChange,
    undoStack
  } = useAppStore();
  const tasks = blocks.filter((block) => block.type === "task");
  const completed = tasks.filter((task) => task.metadata.completed);
  const streak = useMemo(() => calculateStreak(tasks), [tasks]);
  const completionRate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

  const enableReminders = async () => {
    if (!("Notification" in window)) {
      setNotification("Browser notifications are not supported here.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotification(permission === "granted" ? "Task reminders enabled." : "Reminder permission was not granted.");
  };

  return (
    <div className="bento-grid">
      <div className="span-12 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Metric label="Tasks" value={tasks.length.toString()} color="blue" />
        <Metric label="Completed" value={completed.length.toString()} color="green" />
        <Metric label="Rate" value={`${completionRate}%`} color="purple" />
        <Metric label="Streak" value={`${streak}d`} color="orange" />
      </div>
      <section className="bento-card span-5 bg-[#ffdc4a] p-4 text-black">
        <h3 className="mb-3 text-xl font-black">Workspace Settings</h3>
        <div className="flex flex-wrap gap-2">
          <HeaderButton icon={Bell} label="Enable Reminders" onClick={enableReminders} />
          <HeaderButton disabled={!undoStack.length} icon={RotateCcw} label="Undo Last Change" onClick={() => void undoLastChange()} />
        </div>
      </section>
      <section className="bento-card span-7 p-4">
        <h3 className="mb-3 text-xl font-black">Recovery</h3>
        <div className="grid gap-2">
          {recentlyDeleted.length ? recentlyDeleted.map((item) => (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border-[3px] border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111] dark:border-white dark:bg-[#202020] dark:shadow-[4px_4px_0_#fff]" key={item.id}>
              <History size={16} />
              <span className="min-w-0 flex-1 truncate text-sm font-black">{item.label}</span>
              <span className="text-xs text-stone-500 dark:text-slate-400">{formatShortDate(item.deletedAt)}</span>
              <HeaderButton label="Restore" onClick={() => void restoreDeletedItem(item.id)} />
              <IconButton danger icon={X} title="Dismiss" onClick={() => dismissDeletedItem(item.id)} />
            </div>
          )) : (
            <p className="rounded-lg border-[3px] border-dashed border-black px-3 py-8 text-center text-sm font-black text-stone-600 dark:border-white dark:text-slate-300">
              Deleted pages and blocks will appear here.
            </p>
          )}
        </div>
      </section>
      <section className="bento-card span-12 p-4">
        <h3 className="mb-3 text-xl font-black">Recent Completion</h3>
        <div className="grid grid-cols-14 gap-1">
          {Array.from({ length: 42 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (41 - index));
            const key = date.toISOString().slice(0, 10);
            const count = completed.filter((task) => task.metadata.completedAt?.startsWith(key)).length;
            return <div className={clsx("h-8 rounded border-2 border-black dark:border-white", heatColor(count))} key={key} title={`${key}: ${count} completed`} />;
          })}
        </div>
      </section>
    </div>
  );
}
