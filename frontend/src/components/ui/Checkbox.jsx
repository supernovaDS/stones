import { clsx } from "clsx";

export function Checkbox({ checked, onChange, className }) {
  return (
    <label className={clsx("group inline-flex cursor-pointer select-none items-center justify-center", className)}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />
      <div className={clsx(
        "flex h-6 w-6 items-center justify-center rounded-md border-[3px] border-black bg-white shadow-[2px_2px_0_#111] transition-all duration-150 ease-out group-hover:-translate-x-[1px] group-hover:-translate-y-[1px] group-hover:shadow-[3px_3px_0_#111] peer-active:translate-x-[2px] peer-active:translate-y-[2px] peer-active:shadow-none dark:border-[#1e232a] dark:bg-[#12151a] dark:shadow-[2px_2px_0_#000] dark:group-hover:shadow-[3px_3px_0_#000]",
        checked ? "bg-[#2ef2a6] dark:bg-[#0a6b42] dark:border-[#1e232a]" : ""
      )}>
        <svg
          className={clsx(
            "pointer-events-none h-4 w-4 stroke-black stroke-[4] transition-all duration-200 ease-out dark:stroke-[#c8c3ba]",
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    </label>
  );
}
