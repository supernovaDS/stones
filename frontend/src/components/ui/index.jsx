import { clsx } from "clsx";

export function HeaderButton({ disabled, icon: Icon, label, onClick }) {
  return (
    <button className="nb-button" disabled={disabled} onClick={onClick} title={label} type="button">
      {Icon ? <Icon size={16} /> : null}<span className="header-btn-label">{label}</span>
    </button>
  );
}

export function IconButton({ danger, icon: Icon, onClick, title }) {
  return (
    <button className={clsx("icon-button", danger && "danger")} onClick={onClick} title={title} type="button">
      <Icon size={16} />
    </button>
  );
}

export function Metric({ label, value, color }) {
  const colors = {
    green: "bg-white border-l-[10px] border-l-[#2ef2a6] dark:bg-[#12151a] dark:border-l-[#0a3d28]",
    orange: "bg-white border-l-[10px] border-l-[#ffb84d] dark:bg-[#12151a] dark:border-l-[#3d2800]",
    red: "bg-white border-l-[10px] border-l-[#ff5a5f] dark:bg-[#12151a] dark:border-l-[#3d1215]",
    blue: "bg-white border-l-[10px] border-l-[#21caff] dark:bg-[#12151a] dark:border-l-[#002535]",
    purple: "bg-white border-l-[10px] border-l-[#c4a8ff] dark:bg-[#12151a] dark:border-l-[#1a1040]",
    pink: "bg-white border-l-[10px] border-l-[#ff5ec4] dark:bg-[#12151a] dark:border-l-[#3d0030]",
    teal: "bg-white border-l-[10px] border-l-[#00e0c6] dark:bg-[#12151a] dark:border-l-[#002e28]"
  };
  return (
    <div className={clsx("bento-card p-3 text-black dark:text-[#c8c3ba]", colors[color] ?? "bg-white dark:bg-[#12151a]")}>
      <p className="text-xs font-black uppercase tracking-wide text-black/60 dark:text-[#7a7670]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

export function InsightCard({ color, label, value }) {
  const colorClasses = {
    green: "bg-white border-l-[10px] border-l-[#2ef2a6] dark:bg-[#12151a] dark:border-l-[#0a3d28]",
    orange: "bg-white border-l-[10px] border-l-[#ffb84d] dark:bg-[#12151a] dark:border-l-[#3d2800]",
    purple: "bg-white border-l-[10px] border-l-[#c4a8ff] dark:bg-[#12151a] dark:border-l-[#1a1040]",
    blue: "bg-white border-l-[10px] border-l-[#21caff] dark:bg-[#12151a] dark:border-l-[#002535]",
    red: "bg-white border-l-[10px] border-l-[#ff5a5f] dark:bg-[#12151a] dark:border-l-[#3d1215]",
    pink: "bg-white border-l-[10px] border-l-[#ff5ec4] dark:bg-[#12151a] dark:border-l-[#3d0030]"
  };
  return (
    <div className={clsx("bento-card p-4 text-black dark:text-[#c8c3ba]", colorClasses[color] ?? "bg-white dark:bg-[#12151a]")}>
      <p className="text-sm font-black uppercase tracking-wide text-black/65 dark:text-[#7a7670]">{label}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
    </div>
  );
}

export function Notice({ children, tone }) {
  return (
    <div className="toast-shell">
      <div className={clsx("toast-popup", tone === "red" && "error")}>{children}</div>
    </div>
  );
}

export function Badge({ children, tone }) {
  return (
    <span className={clsx(
      "inline-flex h-9 items-center gap-1 rounded-md border-[3px] border-black px-2 text-xs font-black shadow-[3px_3px_0_#111] dark:border-[#1e232a] dark:shadow-[3px_3px_0_#000]",
      tone === "red" ? "bg-[#ff5a5f] text-black dark:bg-[#3d1215] dark:text-[#e8a0a2]" : "bg-white text-stone-700 dark:bg-[#12151a] dark:text-[#8a8580]"
    )}>
      {children}
    </span>
  );
}

export { Checkbox } from "./Checkbox";
