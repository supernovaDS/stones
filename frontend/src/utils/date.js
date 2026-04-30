const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric"
});

const pad = (value) => String(value).padStart(2, "0");

const toLocalDateString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toLocalDateTimeString = (date) =>
  `${toLocalDateString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const applyTimeText = (date, value) => {
  const timeMatch = value.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!timeMatch) return toLocalDateString(date);

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2] ?? 0);
  const period = timeMatch[3]?.toLowerCase();
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  date.setHours(hours, minutes, 0, 0);
  return toLocalDateTimeString(date);
};

export const todayIso = () => toLocalDateString(new Date());

export const formatShortDate = (value) => {
  if (!value) {
    return "No date";
  }

  const dateStr = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return value;

  if (value.includes("T")) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "numeric"
    }).format(date);
  }
  return dateFormatter.format(date);
};

export const isToday = (value) => Boolean(value && value.slice(0, 10) === todayIso());

export const isOverdue = (value) => {
  if (!value) return false;
  const dateStr = value.includes("T") ? value : `${value}T23:59:59`;
  return new Date(dateStr) < new Date();
};

export const toInputDate = (value) => {
  if (!value) return "";
  if (value.length === 10) return `${value}T12:00`;
  return value.slice(0, 16);
};

export const toDateInput = (value) => {
  if (!value) return "";
  return value.slice(0, 10);
};

export const normalizeDateText = (value) => {
  if (!value) {
    return undefined;
  }

  const lower = value.toLowerCase();
  const now = new Date();

  if (lower.includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return applyTimeText(tomorrow, value);
  }

  if (lower.includes("today") || lower.includes("tonight")) {
    return applyTimeText(now, value);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 16);
  }

  return undefined;
};

export const addDays = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
};

export const todayPageTitle = () => `Daily - ${todayIso()}`;

export const nextRecurringDate = (deadline, recurrence, interval = 1) => {
  if (!deadline || recurrence === "none") {
    return undefined;
  }

  const datePart = deadline.slice(0, 10);

  if (recurrence === "daily") {
    return addDays(datePart, 1);
  }

  if (recurrence === "weekly") {
    return addDays(datePart, 7);
  }

  if (recurrence === "weekdays") {
    let next = addDays(datePart, 1);
    while ([0, 6].includes(new Date(`${next}T00:00:00`).getDay())) {
      next = addDays(next, 1);
    }
    return next;
  }

  if (recurrence === "monthly") {
    const date = new Date(`${datePart}T00:00:00`);
    date.setMonth(date.getMonth() + 1);
    return toLocalDateString(date);
  }

  if (recurrence === "custom") {
    return addDays(datePart, Math.max(1, Number(interval || 1)));
  }

  return undefined;
};
