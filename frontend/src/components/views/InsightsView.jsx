import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate, toLocalDateString, toLocalDateFromIso, isOverdue, todayIso } from "../../utils/date";
import { calculateStreak, heatColor, getCalendarDays, shiftMonth } from "../../utils/helpers";
import { Metric } from "../ui";
import { getHistoryVirtualTasks } from "../../utils/recurrence";

export function InsightsView() {
  const {
    blocks,
  } = useAppStore();

  const historyVirtualTasks = useMemo(() => getHistoryVirtualTasks(blocks, 30), [blocks]);

  const tasks = useMemo(() => {
    const realTasks = blocks.filter((block) => block.type === "task");
    return [...realTasks, ...historyVirtualTasks];
  }, [blocks, historyVirtualTasks]);

  const todayStr = useMemo(() => todayIso(), []);

  // Filter tasks to exclude future tasks (upcoming tasks that are not completed or failed)
  const currentAndPastTasks = useMemo(() => {
    return tasks.filter((task) => {
      const isFuture =
        task.metadata.deadline &&
        task.metadata.deadline.slice(0, 10) > todayStr &&
        !task.metadata.completed &&
        !task.metadata.failed;
      return !isFuture;
    });
  }, [tasks, todayStr]);

  const completed = useMemo(() => currentAndPastTasks.filter((task) => task.metadata.completed), [currentAndPastTasks]);
  const completedCount = completed.length;
  const failedCount = useMemo(() => currentAndPastTasks.filter((task) => task.metadata.failed).length, [currentAndPastTasks]);
  const overdueCount = useMemo(() => currentAndPastTasks.filter((task) => !task.metadata.completed && !task.metadata.failed && isOverdue(task.metadata.deadline)).length, [currentAndPastTasks]);

  const streak = useMemo(() => calculateStreak(currentAndPastTasks), [currentAndPastTasks]);
  const completionRate = currentAndPastTasks.length ? Math.round((completedCount / currentAndPastTasks.length) * 100) : 0;
  const failRate = currentAndPastTasks.length ? Math.round((failedCount / currentAndPastTasks.length) * 100) : 0;

  const [heatmapCursor, setHeatmapCursor] = useState(new Date());
  const heatmapDays = useMemo(() => getCalendarDays(heatmapCursor), [heatmapCursor]);
  const heatmapMonthLabel = heatmapCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });


  return (
    <div className="bento-grid">
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
            const count = completed.filter((task) => toLocalDateFromIso(task.metadata.completedAt) === key).length;
            const inMonth = day.getMonth() === heatmapCursor.getMonth();
            return <div className={clsx("h-8 rounded border-2 border-black dark:border-[#1e232a] transition-colors duration-200", heatColor(count), !inMonth && "opacity-30")} key={key} title={`${key}: ${count} completed`} />;
          })}
        </div>
      </section>
      <section className="bento-card span-12 bg-white border-l-[10px] border-l-[#21caff] p-6 text-black dark:bg-[#12151a] dark:border-l-[#002535] dark:text-[#c8c3ba]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-black">Performance Statistics</h3>
          <span className="text-xs font-bold text-stone-500 dark:text-[#7a7670]">
            * Excludes future tasks to keep rates accurate
          </span>
        </div>
        <div className="grid grid-cols-7 gap-4 max-2xl:grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          <Metric label="Tasks" value={currentAndPastTasks.length.toString()} color="blue" />
          <Metric label="Completed" value={completedCount.toString()} color="green" />
          <Metric label="Failed" value={failedCount.toString()} color="red" />
          <Metric label="Completion Rate" value={`${completionRate}%`} color="purple" />
          <Metric label="Fail Rate" value={`${failRate}%`} color="pink" />
          <Metric label="Overdue" value={overdueCount.toString()} color="teal" />
          <Metric label="Streak" value={`${streak}d`} color="orange" />
        </div>
      </section>
    </div>
  );
}
