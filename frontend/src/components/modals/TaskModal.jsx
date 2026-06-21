import { useState } from "react";

export function TaskModal({ initialParams, onClose, onSubmit }) {
  const [title, setTitle] = useState(initialParams?.title ?? "");
  const [notes, setNotes] = useState(initialParams?.notes ?? "");
  const [priority, setPriority] = useState(initialParams?.priority ?? "medium");
  const [deadline, setDeadline] = useState(initialParams?.deadline ?? "");
  const [time, setTime] = useState(initialParams?.time ?? "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        notes: notes.trim(),
        priority,
        deadline: deadline ? (time ? `${deadline}T${time}` : `${deadline}T23:59`) : undefined,
        pageId: initialParams?.pageId,
        sourceBlockId: initialParams?.sourceBlockId
      });
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-3xl font-black">New Task</h3>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1 text-sm font-black">
            Title
            <input autoFocus className="nb-input px-3 py-2 font-bold" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-black">
            Description (optional)
            <textarea className="nb-textarea min-h-[90px] px-3 py-2 font-bold" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <label className="grid gap-1 text-sm font-black">
              Priority
              <select className="nb-select px-3 py-2 font-bold" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black">
              Deadline
              <input type="date" className="nb-input px-3 py-2 font-bold" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </label>
            <label className="col-span-2 grid gap-1 text-sm font-black max-sm:col-span-1">
              Time (optional)
              <input type="time" className="nb-input px-3 py-2 font-bold" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="nb-button flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="nb-button action flex-1">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}
