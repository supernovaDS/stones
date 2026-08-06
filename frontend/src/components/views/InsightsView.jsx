import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { useMemo, useState, useRef, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { toLocalDateString, toLocalDateFromIso, isOverdue, todayIso } from "../../utils/date";
import { calculateStreak } from "../../utils/helpers";
import { Metric } from "../ui";
import { getHistoryVirtualTasks } from "../../utils/recurrence";

export function InsightsView() {
  const {
    blocks
  } = useAppStore();

  const [selectedYear, setSelectedYear] = useState("Current");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const historyVirtualTasks = useMemo(() => getHistoryVirtualTasks(blocks, 30), [blocks]);

  const tasks = useMemo(() => {
    const realTasks = blocks.filter((block) => block.type === "task");
    return [...realTasks, ...historyVirtualTasks];
  }, [blocks, historyVirtualTasks]);

  const todayStr = todayIso();

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

  // Pre-compute completions-per-date map to avoid O(n²) .filter() per heatmap cell
  const completionsByDate = useMemo(() => {
    const map = new Map();
    for (const task of completed) {
      const key = toLocalDateFromIso(task.metadata.completedAt);
      if (key) map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [completed]);

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
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
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

  // Build LeetCode-style Month Clusters layout (Chronological order: Oldest on left -> Current on rightmost)
  const monthClusters = useMemo(() => {
    const today = new Date();
    const monthsList = [];

    if (selectedYear === "Current") {
      for (let i = 23; i >= 0; i--) {
        const mDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        monthsList.push({ year: mDate.getFullYear(), month: mDate.getMonth() });
      }
    } else {
      const y = parseInt(selectedYear, 10);
      const maxMonth = (y === today.getFullYear()) ? today.getMonth() : 11;
      for (let m = 0; m <= maxMonth; m++) {
        monthsList.push({ year: y, month: m });
      }
    }

    return monthsList.map(({ year, month }) => {
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const label = firstDay.toLocaleDateString(undefined, { month: "short" });
      const startDayOfWeek = firstDay.getDay();

      const weeks = [];
      let currentWeek = [];

      // Padding before 1st of month
      for (let i = 0; i < startDayOfWeek; i++) {
        currentWeek.push({ isPadding: true, key: `pad-start-${year}-${month}-${i}` });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateKey = toLocalDateString(dateObj);
        const count = completionsByDate.get(dateKey) || 0;
        const isFuture = dateObj > today;

        currentWeek.push({
          isPadding: false,
          date: dateObj,
          key: dateKey,
          count: isFuture ? 0 : count,
          isFuture
        });

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ isPadding: true, key: `pad-end-${year}-${month}-${currentWeek.length}` });
        }
        weeks.push(currentWeek);
      }

      return {
        year,
        month,
        label,
        weeks
      };
    });
  }, [selectedYear, completionsByDate]);

  // Compute ONLY 100% complete month clusters that fit inside the container width
  const visibleMonthClusters = useMemo(() => {
    if (!containerWidth || monthClusters.length === 0) return monthClusters;

    const availableWidth = containerWidth - 32; // p-4 = 32px padding
    let usedWidth = 0;
    const fitMonths = [];

    // Evaluate backwards from current month (right) to oldest (left)
    for (let i = monthClusters.length - 1; i >= 0; i--) {
      const cluster = monthClusters[i];
      const clusterWidth = cluster.weeks.length * 19 - 4; // 15px cell + 4px gap per week
      const gap = fitMonths.length > 0 ? 14 : 0; // 14px gap (gap-3.5)
      const nextUsed = usedWidth + gap + clusterWidth;

      if (nextUsed <= availableWidth) {
        fitMonths.unshift(cluster);
        usedWidth = nextUsed;
      } else {
        break; // Stop! Never include a month that cannot fit 100% completely
      }
    }

    return fitMonths.length > 0 ? fitMonths : [monthClusters[monthClusters.length - 1]];
  }, [monthClusters, containerWidth]);

  const getHeatColor = (count) => {
    if (count === 0) return "bg-[#f4efe4] dark:bg-[#0d1017] border-[1.5px] border-black/60 dark:border-[#2b3342]";
    if (count === 1) return "bg-[#2ef2a6] dark:bg-[#0b643e] border-[1.5px] border-black dark:border-[#1e232a]";
    if (count === 2) return "bg-[#21caff] dark:bg-[#004e6c] border-[1.5px] border-black dark:border-[#1e232a]";
    if (count === 3) return "bg-[#ffdc4a] dark:bg-[#7a6000] border-[1.5px] border-black dark:border-[#1e232a]";
    return "bg-[#ff5ec4] dark:bg-[#a61272] border-[1.5px] border-black dark:border-[#1e232a]";
  };

  return (
    <div className="bento-grid">
      <section className="bento-card hover-static span-12 bg-white p-6 text-black dark:bg-[#12151a] dark:text-[#c8c3ba] flex flex-col min-w-0">
        <div className="heatmap-header mb-6 flex flex-wrap items-center justify-between gap-4 relative z-30">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-black text-black dark:text-[#c8c3ba] whitespace-nowrap inline-flex items-center gap-1.5 leading-none">
              <span className="text-3xl font-black brand-word leading-none">{totalYearCompletions.toLocaleString()}</span> task completions
            </span>
            <span className="text-sm font-bold text-stone-500 dark:text-[#7a7670] whitespace-nowrap leading-none">
              {selectedYear === "Current" ? "in the past year" : `in ${selectedYear}`}
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm font-black text-stone-700 dark:text-[#c8c3ba] shrink-0">
            <div className="whitespace-nowrap">
              <span className="text-stone-400 dark:text-[#5a5650] font-bold">Active days:</span> {activeDaysCount}
            </div>
            <div className="whitespace-nowrap">
              <span className="text-stone-400 dark:text-[#5a5650] font-bold">Current streak:</span> {streak}d
            </div>
            <div className="whitespace-nowrap">
              <span className="text-stone-400 dark:text-[#5a5650] font-bold">Max streak:</span> {maxStreak}d
            </div>
            <div className="relative z-50">
              {isDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              )}
              <button 
                className="nb-button flex items-center gap-1.5 !py-1 !px-3 text-sm font-black relative z-50" 
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                type="button"
              >
                {selectedYear} <ChevronDown size={14} />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-28 rounded-lg border-[3px] border-black bg-white shadow-[3px_3px_0_#111] z-50 overflow-hidden dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[2px_2px_0_#000]">
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

        {/* LeetCode-Style Responsive Month Clusters Container */}
        <div
          ref={containerRef}
          className="overflow-hidden no-scrollbar select-none p-4 rounded-2xl border-[3px] border-black bg-white shadow-[5px_5px_0_#111] dark:border-[#1e232a] dark:bg-[#0d0f12] dark:shadow-[4px_4px_0_#000]"
        >
          <div className="flex w-full items-end justify-end gap-3.5">
            {visibleMonthClusters.map((cluster) => (
                <div
                  key={`${cluster.year}-${cluster.month}`}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  {/* 7-Row Grid of Weeks for this Month */}
                  <div className="flex gap-1">
                    {cluster.weeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="grid grid-rows-7 gap-1">
                        {week.map((day) => {
                          if (day.isPadding) {
                            return (
                              <div
                                key={day.key}
                                className="w-[15px] h-[15px] opacity-0"
                              />
                            );
                          }
                          return (
                            <div
                              key={day.key}
                              className={clsx(
                                "w-[15px] h-[15px] rounded-sm transition-all duration-150 hover:scale-130 hover:z-20 cursor-pointer",
                                getHeatColor(day.count)
                              )}
                              title={`${day.count} task completion${day.count !== 1 ? 's' : ''} on ${day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {/* Centered Month Label below each Cluster */}
                  <span className="text-[11px] font-black uppercase tracking-wider text-center leading-none mt-1 brand-word text-black dark:text-[#c8c3ba]">
                    {cluster.label}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </section>
      <section className="bento-card hover-static span-12 bg-white p-6 text-black dark:bg-[#12151a] dark:text-[#c8c3ba]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-black">Performance Statistics</h3>
        </div>
        <div className="grid grid-cols-7 gap-4 max-2xl:grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          <Metric label="Tasks" value={currentAndPastTasks.length.toString()} color="gold" />
          <Metric label="Completed" value={completedCount.toString()} color="amber" />
          <Metric label="Failed" value={failedCount.toString()} color="mustard" />
          <Metric label="Completion Rate" value={`${completionRate}%`} color="yellow" />
          <Metric label="Fail Rate" value={`${failRate}%`} color="lemon" />
          <Metric label="Overdue" value={overdueCount.toString()} color="cream" />
          <Metric label="Streak" value={`${streak}d`} color="sunshine" />
        </div>
      </section>
    </div>
  );
}
