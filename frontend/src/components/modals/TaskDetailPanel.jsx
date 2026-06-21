import { Check, Workflow, X, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { toInputDate } from "../../utils/date";
import { IconButton, Checkbox } from "../ui";
import { getVirtualTasksForDate } from "../../utils/recurrence";

export function TaskDetailPanel() {
  const { addSubtask, blocks, deleteSubtask, pages, selectedTaskId, setActivePage, setSelectedTask, setTaskDependencies, toggleTask, toggleFailTask, updateSubtask, updateTask } = useAppStore();
  const panelRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (panelRef.current && panelRef.current.contains(event.target)) {
        return;
      }
      if (
        event.target.closest('[data-prevent-outside-close="true"]') ||
        event.target.closest('.prevent-outside-close')
      ) {
        return;
      }
      setSelectedTask(undefined);
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [setSelectedTask]);
  
  let task;
  let isVirtual = false;
  if (selectedTaskId && selectedTaskId.startsWith("virtual_")) {
    isVirtual = true;
    const cleaned = selectedTaskId.substring("virtual_".length);
    const lastUnderscore = cleaned.lastIndexOf("_");
    const templateId = cleaned.substring(0, lastUnderscore);
    const dateStr = cleaned.substring(lastUnderscore + 1);
    const virtualTasks = getVirtualTasksForDate(dateStr, blocks);
    task = virtualTasks.find((t) => t.id === selectedTaskId);
  } else {
    task = blocks.find((block) => block.id === selectedTaskId);
  }

  if (!task || task.type !== "task") return null;
  const page = pages.find((item) => item.id === task.pageId);
  const source = blocks.find((block) => block.id === task.sourceBlockId);
  const otherTasks = blocks.filter((block) => block.type === "task" && block.id !== task.id);
  const dependencies = task.content.dependencyIds ?? [];

  return (
    <aside ref={panelRef} className="task-detail-panel flex flex-col fixed inset-y-0 right-0 z-30 w-[430px] max-w-full border-l-[3px] border-black bg-[#fff7e8] shadow-[-4px_0_0_#111] dark:border-[#1e232a] dark:bg-[#0c0e11] dark:shadow-[-3px_0_0_#000]">
      <div className="flex shrink-0 items-center justify-between gap-3 p-5 pb-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-stone-600 dark:text-[#7a7670]">
            {isVirtual ? "Repeating Task Details" : "Task details"}
          </p>
          <h3 className="truncate text-xl font-black">{page?.title ?? (isVirtual ? "Repeating Schedule" : "Workspace")}</h3>
        </div>
        <IconButton icon={X} title="Close details" onClick={() => setSelectedTask(undefined)} />
      </div>
      <div className="grid content-start flex-1 gap-4 overflow-auto p-5 pt-2">
        <label className="grid gap-1 text-sm font-black">
          Title
          <input 
            disabled={isVirtual} 
            className="nb-input w-full px-3 py-2 font-bold disabled:opacity-85" 
            onChange={(event) => void updateTask(task.id, { title: event.target.value })} 
            value={task.content.title} 
          />
        </label>
        <label className="grid gap-1 text-sm font-black">
          Notes
          <textarea 
            disabled={isVirtual} 
            className="nb-textarea w-full min-h-24 px-3 py-2 font-bold disabled:opacity-85" 
            onChange={(event) => void updateTask(task.id, { notes: event.target.value })} 
            value={task.content.notes ?? ""} 
          />
        </label>
        <label className="grid gap-1 text-sm font-black">
          Priority
          <select 
            disabled={isVirtual} 
            className="nb-select w-full px-3 py-2 font-bold disabled:opacity-85" 
            onChange={(event) => void updateTask(task.id, { priority: event.target.value })} 
            value={task.metadata.priority ?? "medium"}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-black">
          Deadline
          <input 
            disabled={isVirtual} 
            className="nb-input w-full px-3 py-2 font-bold disabled:opacity-85" 
            onChange={(event) => void updateTask(task.id, { deadline: event.target.value })} 
            type="datetime-local" 
            value={toInputDate(task.metadata.deadline)} 
          />
        </label>

        {!isVirtual && (
          <label className="grid gap-1 text-sm font-black">
            Reminder
            <input 
              className="nb-input w-full px-3 py-2 font-bold" 
              onChange={(event) => void updateTask(task.id, { reminderAt: event.target.value })} 
              type="datetime-local" 
              value={toInputDate(task.metadata.reminderAt)} 
            />
          </label>
        )}

        {task.metadata.completed && task.metadata.completedAt && (
          <div className="grid gap-1 text-sm font-black bg-emerald-100/50 dark:bg-emerald-950/20 border-2 border-emerald-500 rounded-lg p-3">
            <span className="text-xs text-emerald-800 dark:text-[#6fd09a] uppercase">Completed On</span>
            <span className="text-sm font-bold text-stone-800 dark:text-[#c8c3ba]">
              {new Date(task.metadata.completedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short"
              })}
            </span>
          </div>
        )}
        
        <section className="grid gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black">Subtasks</h4>
            <button className="nb-button min-h-0 px-3 py-1 text-xs" onClick={() => void addSubtask(task.id)} type="button">Add</button>
          </div>
          {(task.content.subtasks ?? []).map((subtask) => (
            <div className="flex items-center gap-2" key={subtask.id}>
              <Checkbox checked={subtask.completed} onChange={(event) => void updateSubtask(task.id, subtask.id, { completed: event.target.checked })} />
              <input className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" onChange={(event) => void updateSubtask(task.id, subtask.id, { text: event.target.value })} value={subtask.text} />
              <IconButton danger icon={X} title="Delete subtask" onClick={() => void deleteSubtask(task.id, subtask.id)} />
            </div>
          ))}
        </section>

        {!isVirtual && otherTasks.length > 0 && (
          <section className="grid gap-2">
            <h4 className="text-sm font-black">Dependencies</h4>
            <div className="max-h-36 overflow-auto rounded-lg border-[3px] border-black bg-white p-2 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]">
              {otherTasks.map((candidate) => (
                <label className="flex items-center gap-2 py-1 text-sm" key={candidate.id}>
                  <Checkbox checked={dependencies.includes(candidate.id)} onChange={(event) => {
                    const next = event.target.checked ? [...dependencies, candidate.id] : dependencies.filter((id) => id !== candidate.id);
                    void setTaskDependencies(task.id, next);
                  }} />
                  {candidate.content.title}
                </label>
              ))}
            </div>
          </section>
        )}
        
        <div className="flex gap-2">
          <button className="nb-button action flex-1" onClick={() => void toggleTask(task.id)} type="button"><Check size={16} />{task.metadata.completed ? "Mark Open" : "Mark Complete"}</button>
          {(!task.metadata.completed || task.metadata.failed) && (
            <button className="nb-button flex-1" onClick={() => void toggleFailTask(task.id)} type="button"><XCircle size={16} />{task.metadata.failed ? "Unfail Task" : "Fail Task"}</button>
          )}
        </div>
        {source?.type === "note" ? <div className="rounded-lg border-[3px] border-black bg-[#fff1b8] p-3 shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000]"><p className="mb-1 text-xs font-black uppercase tracking-wide text-stone-600 dark:text-[#7a7670]">Source note</p><p className="line-clamp-4 text-sm font-bold text-stone-700 dark:text-[#7a7670]">{source.content.text}</p></div> : null}
        {!isVirtual && task.pageId !== "system-calendar" && (
          <button className="nb-button" onClick={() => { setActivePage(task.pageId); setSelectedTask(undefined); }} type="button"><Workflow size={16} />Open Page</button>
        )}
      </div>
    </aside>
  );
}
