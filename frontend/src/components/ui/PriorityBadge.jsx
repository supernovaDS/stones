import clsx from "clsx";
import { priorityDot } from "../../utils/helpers";

export function PriorityBadge({ priority = "medium", className = "" }) {
  const dotColor = priorityDot(priority);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-black/80 px-2 py-0.5 text-xs font-black uppercase tracking-wider dark:border-[#2b3342]",
        className
      )}
    >
      <span className={clsx("h-2 w-2 rounded-full border border-black dark:border-stone-700", dotColor)} />
      {priority}
    </span>
  );
}
