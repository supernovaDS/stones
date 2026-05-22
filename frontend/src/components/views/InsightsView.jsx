import { Bell, History, RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate, toLocalDateString } from "../../utils/date";
import { calculateStreak, heatColor, getCalendarDays, shiftMonth } from "../../utils/helpers";
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

  const [heatmapCursor, setHeatmapCursor] = useState(new Date());
  const heatmapDays = useMemo(() => getCalendarDays(heatmapCursor), [heatmapCursor]);
  const heatmapMonthLabel = heatmapCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const enableReminders = async () => {
    setNotification("Task reminders are active within the app.");
  };

  return (
    <div className="bento-grid">
      <div className="span-12 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Metric label="Tasks" value={tasks.length.toString()} color="blue" />
        <Metric label="Completed" value={completed.length.toString()} color="green" />
        <Metric label="Rate" value={`${completionRate}%`} color="purple" />
        <Metric label="Streak" value={`${streak}d`} color="orange" />
      </div>
      <section className="bento-card span-5 bg-white border-l-[10px] border-l-[#ffdc4a] p-4 text-black dark:bg-[#12151a] dark:border-l-[#1a1500] dark:text-[#c8c3ba]">
        <h3 className="mb-3 text-xl font-black">Workspace Settings</h3>
        <div className="flex flex-wrap gap-2">
          <HeaderButton icon={Bell} label="Enable Reminders" onClick={enableReminders} />
          <HeaderButton disabled={!undoStack.length} icon={RotateCcw} label="Undo Last Change" onClick={() => void undoLastChange()} />
        </div>
      </section>
      <section className="bento-card recovery-card span-7 bg-white border-l-[10px] border-l-[#c4a8ff] p-4 text-black dark:bg-[#12151a] dark:border-l-[#1a1040] dark:text-[#c8c3ba]">
        <h3 className="mb-3 text-xl font-black">Recovery</h3>
        <div className="grid gap-2">
          {recentlyDeleted.length ? recentlyDeleted.map((item) => (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border-[3px] border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]" key={item.id}>
              <History size={16} />
              <span className="min-w-0 flex-1 truncate text-sm font-black">{item.label}</span>
              <span className="text-xs text-stone-500 dark:text-[#5a5650]">{formatShortDate(item.deletedAt)}</span>
              <HeaderButton label="Restore" onClick={() => void restoreDeletedItem(item.id)} />
              <IconButton danger icon={X} title="Dismiss" onClick={() => dismissDeletedItem(item.id)} />
            </div>
          )) : (
            <p className="rounded-lg border-[3px] border-dashed border-black px-3 py-8 text-center text-sm font-black text-stone-600 dark:border-[#1e232a] dark:text-[#5a5650]">
              Deleted pages and blocks will appear here.
            </p>
          )}
        </div>
      </section>
      <section className="bento-card span-12 bg-white border-l-[10px] border-l-[#ff5ec4] p-4 text-black dark:bg-[#12151a] dark:border-l-[#3d0030] dark:text-[#c8c3ba]">
        <div className="heatmap-header mb-4 flex items-center justify-between gap-3">
          <h3 className="min-w-0 text-xl font-black">Recent Completions</h3>
          <div className="flex shrink-0 items-center gap-3">
            <button className="icon-button min-h-0 min-w-0" onClick={() => setHeatmapCursor(shiftMonth(heatmapCursor, -1))} type="button"><ChevronLeft size={16} /></button>
            <span className="min-w-0 text-center text-sm font-black">{heatmapMonthLabel}</span>
            <button className="icon-button min-h-0 min-w-0 disabled:opacity-50 disabled:cursor-not-allowed" disabled={(heatmapCursor.getFullYear() * 12 + heatmapCursor.getMonth()) >= (new Date().getFullYear() * 12 + new Date().getMonth())} onClick={() => setHeatmapCursor(shiftMonth(heatmapCursor, 1))} type="button"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="heatmap-grid grid grid-cols-14 gap-1">
          {heatmapDays.map((day) => {
            const key = toLocalDateString(day);
            const count = completed.filter((task) => task.metadata.completedAt?.startsWith(key)).length;
            const inMonth = day.getMonth() === heatmapCursor.getMonth();
            return <div className={clsx("h-8 rounded border-2 border-black dark:border-[#1e232a] transition-colors duration-200", heatColor(count), !inMonth && "opacity-30")} key={key} title={`${key}: ${count} completed`} />;
          })}
        </div>
      </section>
    </div>
  );
}
