import { useState, useEffect } from "react";
import { X, Repeat, Pencil, Trash2, Plus, ArrowLeft, Clock, Calendar, ListChecks } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { todayIso, formatShortDate } from "../../utils/date";

export function RecurringTasksModal({ onClose }) {
  const {
    blocks,
    addRepeatedTask,
    updateRepeatedTask,
    deleteRepeatedTask,
    editingRepeatedTaskId,
    setEditingRepeatedTaskId
  } = useAppStore();

  const templates = blocks.filter((b) => b.type === "recurring_template" && !b.deleted);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [recurrence, setRecurrence] = useState("daily");
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState("days");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [subtasks, setSubtasks] = useState([]);

  // Handle opening form for edit or create
  useEffect(() => {
    if (editingRepeatedTaskId) {
      const template = templates.find((t) => t.id === editingRepeatedTaskId);
      if (template) {
        setTitle(template.content.title || "");
        setNotes(template.content.notes || "");
        setPriority(template.metadata?.priority || "medium");
        setRecurrence(template.metadata?.recurrence || "daily");
        setCustomInterval(template.metadata?.customInterval || 1);
        setCustomUnit(template.metadata?.customUnit || "days");
        setStartDate(template.metadata?.startDate || todayIso());
        setEndDate(template.metadata?.endDate || "");
        setDeadlineTime(template.metadata?.deadlineTime || "");
        setSubtasks(template.content?.subtasks || []);
        setIsFormOpen(true);
      }
    } else {
      // Reset form
      setTitle("");
      setNotes("");
      setPriority("medium");
      setRecurrence("daily");
      setCustomInterval(1);
      setCustomUnit("days");
      setStartDate(todayIso());
      setEndDate("");
      setDeadlineTime("");
      setSubtasks([]);
    }
  }, [editingRepeatedTaskId, isFormOpen]);

  const handleOpenCreate = () => {
    setEditingRepeatedTaskId(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRepeatedTaskId(null);
  };

  const handleAddSubtask = () => {
    setSubtasks([...subtasks, { id: `sub_${Date.now()}`, text: "", completed: false }]);
  };

  const handleUpdateSubtask = (id, text) => {
    setSubtasks(subtasks.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const handleDeleteSubtask = (id) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title: title.trim(),
      notes: notes.trim(),
      priority,
      recurrence,
      customInterval: recurrence === "custom" ? Number(customInterval) : undefined,
      customUnit: recurrence === "custom" ? customUnit : undefined,
      startDate,
      endDate: endDate || undefined,
      deadlineTime: deadlineTime || undefined,
      subtasks: subtasks
    };

    if (editingRepeatedTaskId) {
      await updateRepeatedTask(editingRepeatedTaskId, taskData);
    } else {
      await addRepeatedTask(taskData);
    }
    handleCloseForm();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this repeating task template? This will also delete all of its past completion records.")) {
      await deleteRepeatedTask(id);
    }
  };

  // Helper to format nice recurrence schedule labels
  function getRecurrenceLabel(metadata) {
    const rec = metadata?.recurrence || "none";
    if (rec === "daily") return "Daily";
    if (rec === "weekdays") return "Weekdays (Mon-Fri)";
    if (rec === "weekly") {
      const start = metadata.startDate ? new Date(metadata.startDate + "T12:00:00") : null;
      const weekday = start ? start.toLocaleDateString(undefined, { weekday: "long" }) : "";
      return `Weekly on ${weekday || "matching day"}`;
    }
    if (rec === "monthly") {
      const start = metadata.startDate ? new Date(metadata.startDate + "T12:00:00") : null;
      const dayOfMonth = start ? start.getDate() : "";
      return `Monthly on the ${dayOfMonth || "matching day"}`;
    }
    if (rec === "custom") {
      const interval = metadata.customInterval || 1;
      const unit = metadata.customUnit || "days";
      return `Every ${interval} ${interval === 1 ? unit.slice(0, -1) : unit}`;
    }
    return "No repeat";
  }

  // Priority indicator border helper
  const priorityBorderColor = (p) => {
    if (p === "high") return "border-l-[#ff5a5f]";
    if (p === "low") return "border-l-[#2ef2a6]";
    return "border-l-[#ffb84d]";
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card w-[min(90vw,720px)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="text-[#21caff] dark:text-[#00c0ff]" size={24} />
            <h2 className="text-2xl font-black">
              {isFormOpen ? (editingRepeatedTaskId ? "Edit Recurring Task" : "New Recurring Task") : "Recurring Tasks"}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close" type="button">
            <X size={16} />
          </button>
        </div>

        {isFormOpen ? (
          /* CREATE / EDIT FORM VIEW */
          <form id="recurring-form" onSubmit={handleSubmit} className="grid gap-4">
              <label className="grid gap-1 text-sm font-black">
                Title
                <input
                  autoFocus
                  className="nb-input w-full px-3 py-2 font-bold"
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Work out, Water plants"
                  required
                  value={title}
                />
              </label>

              <label className="grid gap-1 text-sm font-black">
                Notes / Subtext (optional)
                <textarea
                  className="nb-textarea w-full min-h-[70px] px-3 py-2 font-bold"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add details about this repeating task..."
                  value={notes}
                />
              </label>

              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <label className="grid gap-1 text-sm font-black">
                  Priority
                  <select
                    className="nb-select w-full px-3 py-2 font-bold"
                    onChange={(e) => setPriority(e.target.value)}
                    value={priority}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-black">
                  Repeat Schedule
                  <select
                    className="nb-select w-full px-3 py-2 font-bold"
                    onChange={(e) => setRecurrence(e.target.value)}
                    value={recurrence}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom Schedule...</option>
                  </select>
                </label>
              </div>

              {recurrence === "custom" && (
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1 p-3 rounded-lg border-2 border-dashed border-black dark:border-[#1e232a] animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="grid gap-1 text-sm font-black">
                    Repeat Every
                    <input
                      className="nb-input w-full px-3 py-2 font-bold"
                      min="1"
                      onChange={(e) => setCustomInterval(Math.max(1, Number(e.target.value)))}
                      required
                      type="number"
                      value={customInterval}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black">
                    Unit
                    <select
                      className="nb-select w-full px-3 py-2 font-bold"
                      onChange={(e) => setCustomUnit(e.target.value)}
                      value={customUnit}
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <label className="grid gap-1 text-sm font-black">
                  Starts On
                  <input
                    className="nb-input w-full px-3 py-2 font-bold"
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    type="date"
                    value={startDate}
                  />
                </label>
                <label className="grid gap-1 text-sm font-black">
                  Ends On (optional)
                  <input
                    className="nb-input w-full px-3 py-2 font-bold"
                    onChange={(e) => setEndDate(e.target.value)}
                    type="date"
                    value={endDate}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <label className="grid gap-1 text-sm font-black">
                  Due Time (optional)
                  <input
                    className="nb-input w-full px-3 py-2 font-bold"
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    type="time"
                    value={deadlineTime}
                  />
                </label>
              </div>

              <div className="grid gap-2 border-t-2 border-dashed border-black dark:border-[#1e232a] pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase">Subtasks</h4>
                  <button
                    className="nb-button min-h-0 px-3 py-1 text-xs"
                    onClick={handleAddSubtask}
                    type="button"
                  >
                    Add Subtask
                  </button>
                </div>
                <div className="grid gap-2 max-h-[160px] overflow-y-auto overflow-x-hidden pr-1">
                  {subtasks.map((sub, idx) => (
                    <div className="flex items-center gap-2" key={sub.id}>
                      <span className="text-xs font-black text-stone-500 dark:text-[#7a7670]">{idx + 1}.</span>
                      <input
                        className="nb-input min-w-0 flex-1 px-3 py-1.5 text-sm font-bold"
                        onChange={(e) => handleUpdateSubtask(sub.id, e.target.value)}
                        placeholder="e.g. Check list, Send report"
                        required
                        type="text"
                        value={sub.text}
                      />
                      <button
                        className="icon-button danger !h-8 !w-8 shrink-0"
                        onClick={() => handleDeleteSubtask(sub.id)}
                        title="Delete subtask"
                        type="button"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {subtasks.length === 0 && (
                    <p className="text-xs text-stone-400 dark:text-[#5a5650] font-black italic">No subtasks defined yet.</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2 pt-4 border-t-2 border-dashed border-stone-200 dark:border-[#1e232a]">
                <button className="nb-button flex-1" onClick={handleCloseForm} type="button">
                  <ArrowLeft size={16} /> Back
                </button>
                <button className="nb-button action flex-1" type="submit">
                  {editingRepeatedTaskId ? "Save Changes" : "Create Schedule"}
                </button>
              </div>
            </form>
          ) : (
            /* LIST VIEW */
            <div className="grid gap-4">
              <button
                className="nb-button action w-full py-3 flex items-center justify-center gap-2 font-black"
                onClick={handleOpenCreate}
                type="button"
              >
                <Plus size={18} /> Create New Repeating Task
              </button>

              <div className="grid gap-3">
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className={`flex items-center justify-between gap-4 p-4 rounded-xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0_#111] dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[3px_3px_0_#000] border-l-[10px] ${priorityBorderColor(template.metadata?.priority)}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-base text-black dark:text-[#c8c3ba] truncate">
                          {template.content.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-[#7a7670] font-bold">
                          <span className="flex items-center gap-1">
                            <Repeat size={12} />
                            {getRecurrenceLabel(template.metadata)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Started {formatShortDate(template.metadata?.startDate)}
                          </span>
                          {template.metadata?.endDate && (
                            <span className="flex items-center gap-1 text-[#ff5a5f] font-black">
                              <Calendar size={12} />
                              Ends {formatShortDate(template.metadata.endDate)}
                            </span>
                          )}
                          {template.metadata?.deadlineTime && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              At {template.metadata.deadlineTime}
                            </span>
                          )}
                          {template.content?.subtasks && template.content.subtasks.length > 0 && (
                            <span className="flex items-center gap-1 text-[#ffb84d] font-black">
                              <ListChecks size={12} />
                              {template.content.subtasks.length} subtasks
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          className="icon-button"
                          onClick={() => setEditingRepeatedTaskId(template.id)}
                          title="Edit template"
                          type="button"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-button danger"
                          onClick={() => void handleDelete(template.id)}
                          title="Delete template"
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border-[3px] border-dashed border-black dark:border-[#1e232a] px-4 py-12 text-center text-stone-600 dark:text-[#7a7670] font-black">
                    No repeating task schedules configured yet.
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
