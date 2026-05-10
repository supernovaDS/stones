import { Activity, CalendarDays, ListChecks, Workflow } from "lucide-react";

export const navItems = [
  { id: "workspace", label: "Workspace", icon: Workflow },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "insights", label: "Insights", icon: Activity }
];

export const priorityClasses = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low"
};

export const priorityRail = {
  high: "border-l-[#ff5a5f]",
  medium: "border-l-[#ffb84d]",
  low: "border-l-[#2ef2a6]"
};

export const blockTypeRail = {
  note: "border-l-[#21caff]",
  checklist: "border-l-[#a78bfa]",
  code: "border-l-[#ffdc4a]",
  link: "border-l-[#7c3aed]",
  image: "border-l-[#ff5ec4]"
};
