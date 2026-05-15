import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { formatShortDate, todayIso, toDateInput, toLocalDateString } from "../../utils/date";
import { shiftMonth, getCalendarDays, priorityDot, blockMatchesSearch } from "../../utils/helpers";

export function CalendarView({ searchQuery }) {
  const { blocks, openTaskModal, setSelectedTask } = useAppStore();
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(todayIso());
  const tasks = blocks.filter((block) => block.type === "task").filter((task) => blockMatchesSearch(task, searchQuery));
  const days = getCalendarDays(cursor);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedTasks = tasks.filter((task) => toDateInput(task.metadata.deadline) === selectedDay);

  return (
    <div className="bento-grid">
      <div className="calendar-header bento-card span-12 flex items-center justify-between gap-3 bg-white border-l-[10px] border-l-[#21caff] p-4 text-black dark:bg-[#12151a] dark:border-l-[#001a25] dark:text-[#c8c3ba]">
        <button className="icon-button" onClick={() => setCursor(shiftMonth(cursor, -1))} type="button"><ChevronLeft size={16} /></button>
        <h3 className="min-w-0 truncate text-center text-3xl font-black max-sm:text-xl">{monthLabel}</h3>
        <button className="icon-button" onClick={() => setCursor(shiftMonth(cursor, 1))} type="button"><ChevronRight size={16} /></button>
      </div>
      <section className="bento-card span-8 grid grid-cols-7 gap-2 p-4 max-sm:gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div className="text-center text-xs font-black uppercase text-stone-700 dark:text-[#7a7670]" key={day}>{day}</div>)}
        {days.map((day) => {
          const key = toLocalDateString(day);
          const dayTasks = tasks.filter((task) => toDateInput(task.metadata.deadline) === key);
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = key === todayIso();
          const isPast = key < todayIso();
          return (
            <button className={clsx(
              "calendar-cell min-h-24 rounded-lg border-[3px] border-black p-2 text-left font-black shadow-[3px_3px_0_#111] transition hover:-translate-y-1 hover:shadow-[5px_5px_0_#111] dark:border-[#1e232a] dark:shadow-[2px_2px_0_#000] dark:hover:shadow-[3px_3px_0_#000] max-sm:min-h-16",
              selectedDay === key 
                ? "calendar-day-selected bg-white border-l-[8px] border-l-[#ffdc4a] text-black dark:bg-[#12151a] dark:border-l-[#3d2800] dark:text-[#c8c3ba]" 
                : isToday
                  ? "calendar-day-today bg-white border-l-[8px] border-l-[#21caff] text-black dark:bg-[#12151a] dark:border-l-[#003d52] dark:text-[#c8c3ba]"
                  : isPast
                    ? "calendar-day-past bg-stone-100 hover:bg-stone-200 text-stone-400 dark:bg-[#0a0c0f] dark:hover:bg-[#12151a] dark:text-[#5a5650]"
                    : "calendar-day-default bg-white hover:bg-[#fff1b8] dark:bg-[#12151a] dark:hover:bg-[#1a1f26]",
              !inMonth && "opacity-45"
            )} key={key} onClick={() => setSelectedDay(key)} type="button">
              <span className="text-sm">{day.getDate()}</span>
              <div className="calendar-dots mt-2 flex flex-wrap gap-1">
                {dayTasks.slice(0, 4).map((task) => <span className={clsx("h-3 w-3 rounded-sm border border-black dark:border-[#1e232a]", priorityDot(task.metadata.priority))} key={task.id} />)}
              </div>
              {dayTasks.length > 4 ? <p className="mt-1 text-xs">+{dayTasks.length - 4}</p> : null}
            </button>
          );
        })}
      </section>
      <aside className="bento-card span-4 bg-white border-l-[10px] border-l-[#ffdc4a] p-4 text-black dark:bg-[#12151a] dark:border-l-[#1a1500] dark:text-[#c8c3ba]">
        <h3 className="mb-3 text-2xl font-black">{formatShortDate(selectedDay)}</h3>
        {selectedDay >= todayIso() && (
          <button className="nb-button action mb-4" onClick={() => void openTaskModal({ deadline: selectedDay, pageId: useAppStore.getState().activePageId })} type="button">
            <Plus size={16} /> Add task for day
          </button>
        )}
        <div className="grid gap-2">
          {selectedTasks.length ? selectedTasks.map((task) => <button className="nb-button min-w-0 justify-start bg-white text-left dark:bg-[#12151a]" key={task.id} onClick={() => setSelectedTask(task.id)} type="button"><span className="min-w-0 truncate">{task.content.title}</span></button>) : <p className="rounded-lg border-[3px] border-black bg-white p-4 text-sm font-black shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[2px_2px_0_#000]">No tasks scheduled.</p>}
        </div>
      </aside>
    </div>
  );
}
