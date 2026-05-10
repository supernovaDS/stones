import { formatShortDate, isOverdue, todayIso } from "./date";

// ── Task filtering ──────────────────────────────────────────────

export function taskMatchesFilter(task, filter) {
  if (filter === "open") return !task.metadata.completed;
  if (filter === "done") return task.metadata.completed;
  if (filter === "today") return isToday(task.metadata.deadline);
  if (filter === "overdue") return !task.metadata.completed && isOverdue(task.metadata.deadline);
  if (filter === "upcoming") return !task.metadata.completed && task.metadata.deadline && task.metadata.deadline > todayIso();
  if (filter === "no-date") return !task.metadata.completed && !task.metadata.deadline;
  if (filter === "high") return task.metadata.priority === "high";
  return true;
}

function isToday(value) {
  return Boolean(value && value.slice(0, 10) === todayIso());
}

export function compareTasksByDate(a, b) {
  if (!a.metadata.deadline && !b.metadata.deadline) return 0;
  if (!a.metadata.deadline) return 1;
  if (!b.metadata.deadline) return -1;
  return a.metadata.deadline.localeCompare(b.metadata.deadline);
}

// ── Task grouping ───────────────────────────────────────────────

export function groupTasks(tasks, mode) {
  if (mode === "none") return [{ label: "Tasks", tasks }];
  const groups = new Map();
  for (const task of tasks) {
    const label = groupLabel(task.metadata.deadline, mode);
    groups.set(label, [...(groups.get(label) ?? []), task]);
  }
  return [...groups.entries()].map(([label, groupTasksValue]) => ({ label, tasks: groupTasksValue }));
}

function groupLabel(deadline, mode) {
  if (!deadline) return "No date";
  const date = new Date(`${deadline}T00:00:00`);
  if (mode === "day") return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (mode === "week") {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return `Week of ${formatShortDate(start.toISOString().slice(0, 10))}`;
  }
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// ── Block search ────────────────────────────────────────────────

export function blockMatchesSearch(block, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const content = {
    task: `${block.content.title} ${block.content.notes ?? ""}`,
    note: block.content.text,
    checklist: (block.content.items ?? []).map((item) => item.text).join(" "),
    code: `${block.content.language} ${block.content.code}`,
    link: `${block.content.title} ${block.content.url}`,
    image: `${block.content.name} ${block.content.caption}`
  }[block.type] ?? "";
  return content.toLowerCase().includes(normalized);
}

// ── Calendar helpers ────────────────────────────────────────────

export function getCalendarDays(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function priorityDot(priority) {
  if (priority === "high") return "bg-[#ff9f43]";
  if (priority === "low") return "bg-[#6c63ff]";
  return "bg-[#6fbe44]";
}

// ── Insights helpers ────────────────────────────────────────────

export function heatColor(count) {
  if (count === 0) return "bg-[#eef2ea] dark:bg-slate-800";
  if (count === 1) return "bg-[#dff8d4]";
  if (count === 2) return "bg-[#8bdc65]";
  if (count === 3) return "bg-[#ffb45c]";
  return "bg-[#8f75ff]";
}

export function calculateStreak(tasks) {
  const completedDays = new Set(tasks.map((task) => task.metadata.completedAt?.slice(0, 10)).filter(Boolean));
  let streak = 0;
  const cursor = new Date();
  while (completedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Text / export helpers ───────────────────────────────────────

export function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}

export function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function printPagePdf(title, markdown) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  const body = markdown
    .split(/\r?\n/)
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith("- [")) return `<p>${escapeHtml(line)}</p>`;
      if (!line.trim()) return "<br />";
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Inter,Arial,sans-serif;max-width:760px;margin:48px auto;color:#171717;line-height:1.55}h1{font-size:32px}p{font-size:14px}</style></head><body>${body}<script>window.onload=()=>window.print()</script></body></html>`);
  printWindow.document.close();
}

// ── Markdown rendering ──────────────────────────────────────────

export function getEmbedUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.searchParams.get("v") || parsed.pathname.slice(1);
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname.includes("spotify.com")) {
      if (!url.includes("/embed/")) {
        return url.replace("open.spotify.com", "open.spotify.com/embed");
      }
      return url;
    }
    if (parsed.hostname.includes("instagram.com")) {
      const path = parsed.pathname.replace(/\/$/, "");
      if (path.startsWith("/p/") || path.startsWith("/reel/")) {
        return `https://www.instagram.com${path}/embed`;
      }
    }
    if (parsed.hostname.includes("drive.google.com")) {
      return url.replace("/view", "/preview");
    }
  } catch (err) {
    // invalid URL
  }
  return null;
}

export function extractInternalLinks(text) {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim()).filter(Boolean);
}

// ── Notification helpers ────────────────────────────────────────

export function notifyDueReminders(tasks, setNotification) {
  const now = Date.now();
  const firedKey = "stones-fired-reminders";
  const fired = new Set(JSON.parse(localStorage.getItem(firedKey) ?? "[]"));
  let changed = false;

  for (const task of tasks) {
    if (!task.metadata.reminderAt || fired.has(task.id)) continue;
    const due = new Date(task.metadata.reminderAt).getTime();
    if (Number.isNaN(due) || due > now) continue;

    const title = task.content.title || "Task reminder";
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Stones reminder", {
        body: title,
        icon: "/stones_logo.png"
      });
    } else {
      setNotification(`Reminder: ${title}`);
    }
    fired.add(task.id);
    changed = true;
  }

  if (changed) {
    localStorage.setItem(firedKey, JSON.stringify([...fired].slice(-200)));
  }
}

// ── View title ──────────────────────────────────────────────────

export function viewTitle(view) {
  if (view === "tasks") return "Task list";
  if (view === "calendar") return "Calendar";
  if (view === "insights") return "Insights";
  return "Workspace";
}
