import { Info, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { toLocalDateString, toLocalDateFromIso, isOverdue, todayIso } from "../../utils/date";
import { calculateStreak } from "../../utils/helpers";
import { Metric } from "../ui";
import { getHistoryVirtualTasks } from "../../utils/recurrence";

export function InsightsView() {
  const {
    blocks,
  } = useAppStore();

  const [selectedYear, setSelectedYear] = useState("Current");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  // Build the list of selectable years from completions history + current year
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const taskYears = completed
      .map(t => t.metadata.completedAt ? new Date(t.metadata.completedAt).getFullYear() : null)
      .filter(Boolean);
    const uniqueYears = Array.from(new Set([currentYear, ...taskYears])).sort((a, b) => b - a);
    return ["Current", ...uniqueYears.map(String)];
  }, [completed]);

  // Determine the start and end of the filter range
  const { yearStart, yearEnd } = useMemo(() => {
    if (selectedYear === "Current") {
      const d = new Date();
      d.setDate(d.getDate() - 364);
      return { yearStart: d, yearEnd: new Date() };
    } else {
      const y = parseInt(selectedYear, 10);
      return {
        yearStart: new Date(y, 0, 1),
        yearEnd: new Date(y, 11, 31, 23, 59, 59)
      };
    }
  }, [selectedYear]);

  // Filter completions in the active range
  const yearTasks = useMemo(() => {
    return completed.filter((task) => {
      if (!task.metadata.completedAt) return false;
      const date = new Date(task.metadata.completedAt);
      return date >= yearStart && date <= yearEnd;
    });
  }, [completed, yearStart, yearEnd]);

  const totalYearCompletions = yearTasks.length;

  const activeDaysCount = useMemo(() => {
    const uniqueDays = new Set(
      yearTasks.map((task) => toLocalDateFromIso(task.metadata.completedAt))
    );
    return uniqueDays.size;
  }, [yearTasks]);

  const maxStreak = useMemo(() => {
    const completedDays = Array.from(
      new Set(
        yearTasks
          .map((task) => toLocalDateFromIso(task.metadata.completedAt))
          .filter(Boolean)
      )
    ).sort();

    if (!completedDays.length) return 0;

    let maxRun = 0;
    let currentRun = 0;
    let prevDate = null;

    for (const dateStr of completedDays) {
      const currentDate = new Date(dateStr);
      if (prevDate) {
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentRun += 1;
        } else if (diffDays > 1) {
          if (currentRun > maxRun) maxRun = currentRun;
          currentRun = 1;
        }
      } else {
        currentRun = 1;
      }
      prevDate = currentDate;
    }
    if (currentRun > maxRun) maxRun = currentRun;
    return maxRun;
  }, [yearTasks]);

  // Generate month blocks with appropriate padding days
  const monthBlocks = useMemo(() => {
    const today = new Date();
    const blocksList = [];

    if (selectedYear === "Current") {
      const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      for (let i = 0; i < 12; i++) {
        const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
        blocksList.push({
          year: date.getFullYear(),
          month: date.getMonth(),
          label: date.toLocaleDateString(undefined, { month: "short" })
        });
      }
    } else {
      const y = parseInt(selectedYear, 10);
      for (let m = 0; m < 12; m++) {
        const date = new Date(y, m, 1);
        if (y === today.getFullYear() && m > today.getMonth()) {
          continue;
        }
        blocksList.push({
          year: y,
          month: m,
          label: date.toLocaleDateString(undefined, { month: "short" })
        });
      }
    }

    return blocksList.map(({ year, month, label }) => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay();

      const daysArr = [];

      for (let i = 0; i < firstDayOfWeek; i++) {
        daysArr.push({ isPadding: true, key: `pad-start-${year}-${month}-${i}` });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        daysArr.push({
          isPadding: false,
          date,
          key: toLocalDateString(date)
        });
      }

      const remainder = daysArr.length % 7;
      if (remainder !== 0) {
        const paddingNeeded = 7 - remainder;
        for (let i = 0; i < paddingNeeded; i++) {
          daysArr.push({ isPadding: true, key: `pad-end-${year}-${month}-${i}` });
        }
      }

      return {
        label,
        year,
        month,
        days: daysArr
      };
    });
  }, [selectedYear]);

  const getHeatColor = (count) => {
    if (count === 0) return "bg-[#ebedf0] dark:bg-[#2d2d2d]";
    if (count === 1) return "bg-[#9be9a8] dark:bg-[#0e4429]";
    if (count === 2) return "bg-[#40c463] dark:bg-[#006d32]";
    if (count === 3) return "bg-[#30a14e] dark:bg-[#26a641]";
    return "bg-[#216e39] dark:bg-[#39d353]";
  };

  return (
    <div className="bento-grid">
      <section className="bento-card hover-static span-12 bg-white p-6 text-black dark:bg-[#12151a] dark:text-[#c8c3ba] flex flex-col min-w-0">
        <div className="heatmap-header mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black text-black dark:text-[#c8c3ba]">
              <span className="text-2xl font-black">{totalYearCompletions.toLocaleString()}</span> task completions
            </span>
            <span className="text-sm font-medium text-stone-500 dark:text-[#7a7670]">
              {selectedYear === "Current" ? "in the past one year" : `in ${selectedYear}`}
            </span>
            <div className="text-stone-400 dark:text-[#5a5650] cursor-help flex items-center" title="Future tasks are not counted.">
              <Info size={14} />
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-black text-stone-700 dark:text-[#c8c3ba] max-sm:text-xs">
            <div>
              <span className="text-stone-400 dark:text-[#5a5650] font-bold">Total active days:</span> {activeDaysCount}
            </div>
            <div>
              <span className="text-stone-400 dark:text-[#5a5650] font-bold">Max streak:</span> {maxStreak}
            </div>
            <div className="relative">
              <button 
                className="nb-button flex items-center gap-1.5 !py-1 !px-3 text-sm font-bold" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                type="button"
              >
                {selectedYear} <ChevronDown size={14} />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-28 rounded-lg border-[3px] border-black bg-white shadow-[3px_3px_0_#111] z-50 overflow-hidden dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[2px_2px_0_#000]">
                  {years.map((y) => (
                    <button
                      key={y}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-sm font-black hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors",
                        selectedYear === y && "bg-[#ffdc4a] dark:bg-[#523600] text-black dark:text-[#c8c3ba]"
                      )}
                      onClick={() => {
                        setSelectedYear(y);
                        setIsDropdownOpen(false);
                      }}
                      type="button"
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin select-none">
          {monthBlocks.map((block) => (
            <div key={`${block.year}-${block.month}`} className="flex flex-col items-center">
              <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
                {block.days.map((day) => {
                  if (day.isPadding) {
                    return <div key={day.key} className="w-[11px] h-[11px] opacity-0" />;
                  }
                  const dateKey = day.key;
                  const count = completed.filter((task) => toLocalDateFromIso(task.metadata.completedAt) === dateKey).length;
                  return (
                    <div 
                      className={clsx(
                        "w-[11px] h-[11px] rounded-[2px] transition-colors duration-200 border border-black/5 dark:border-white/5", 
                        getHeatColor(count)
                      )} 
                      key={dateKey} 
                      title={`${count} task completion${count !== 1 ? 's' : ''} on ${day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] mt-2 font-bold text-stone-500 dark:text-[#7a7670] leading-none">
                {block.label}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="bento-card hover-static span-12 bg-white p-6 text-black dark:bg-[#12151a] dark:text-[#c8c3ba]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-black">Performance Statistics</h3>
          <button 
            className="icon-button !h-8 !w-8 text-stone-500 dark:text-[#7a7670] flex items-center justify-center cursor-help"
            title="Future tasks are not counted towards statistics"
            type="button"
          >
            <Info size={16} />
          </button>
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
