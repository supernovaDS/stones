import { clsx } from "clsx";

export function HeaderButton({ disabled, icon: Icon, label, onClick }) {
  return (
    <button className="nb-button" disabled={disabled} onClick={onClick} type="button">
      {Icon ? <Icon size={16} /> : null}{label}
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
    green: "bg-[#2ef2a6] dark:bg-[#0b5c3e]",
    orange: "bg-[#ffb84d] dark:bg-[#6b4200]",
    red: "bg-[#ff5a5f] dark:bg-[#6b0000]",
    blue: "bg-[#21caff] dark:bg-[#003d54]",
    purple: "bg-[#c4a8ff] dark:bg-[#2d1a6b]",
    pink: "bg-[#ff5ec4] dark:bg-[#6b0050]",
    teal: "bg-[#00e0c6] dark:bg-[#004840]"
  };
  return (
    <div className={clsx("bento-card p-3 text-black dark:text-white", colors[color] ?? "bg-white dark:bg-[#202020]")}>
      <p className="text-xs font-black uppercase tracking-wide text-black/60 dark:text-white/60">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

export function InsightCard({ color, label, value }) {
  const colorClasses = {
    green: "bg-[#2ef2a6] dark:bg-[#0b5c3e]",
    orange: "bg-[#ffb84d] dark:bg-[#6b4200]",
    purple: "bg-[#c4a8ff] dark:bg-[#2d1a6b]",
    blue: "bg-[#21caff] dark:bg-[#003d54]",
    red: "bg-[#ff5a5f] dark:bg-[#6b0000]",
    pink: "bg-[#ff5ec4] dark:bg-[#6b0050]"
  };
  return (
    <div className={clsx("bento-card p-4 text-black dark:text-white", colorClasses[color] ?? "bg-white dark:bg-[#202020]")}>
      <p className="text-sm font-black uppercase tracking-wide text-black/65 dark:text-white/65">{label}</p>
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
      "inline-flex h-9 items-center gap-1 rounded-md border-[3px] border-black px-2 text-xs font-black shadow-[3px_3px_0_#111] dark:border-white dark:shadow-[3px_3px_0_#fff]",
      tone === "red" ? "bg-[#ff5a5f] text-black" : "bg-white text-stone-700 dark:bg-[#202020] dark:text-slate-200"
    )}>
      {children}
    </span>
  );
}

export { Checkbox } from "./Checkbox";
