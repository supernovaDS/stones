import { clsx } from "clsx";

export function HeaderButton({ disabled, icon: Icon, label, onClick }) {
  return (
    <button className="nb-button" disabled={disabled} onClick={onClick} title={label} type="button">
      {Icon ? <Icon size={16} /> : null}<span className="header-btn-label">{label}</span>
    </button>
  );
}

export function IconButton({ danger, icon: Icon, onClick, title, className }) {
  return (
    <button className={clsx("icon-button", danger && "danger", className)} onClick={onClick} title={title} type="button">
      <Icon size={16} />
    </button>
  );
}

export function Metric({ label, value, color }) {
  const colors = {
    blue: "bg-[#e0f2fe] dark:bg-[#0c2540]",
    green: "bg-[#dcfce7] dark:bg-[#0c331e]",
    red: "bg-[#ffe4e6] dark:bg-[#3b0d12]",
    purple: "bg-[#f3e8ff] dark:bg-[#25103c]",
    pink: "bg-[#fce7f3] dark:bg-[#3b0825]",
    teal: "bg-[#ccfbf1] dark:bg-[#072c27]",
    orange: "bg-[#ffedd5] dark:bg-[#381608]"
  };
  return (
    <div className={clsx("bento-card p-3 text-black dark:text-[#c8c3ba]", colors[color] ?? "bg-white dark:bg-[#12151a]")}>
      <p className="text-xs font-black uppercase tracking-wide text-black/60 dark:text-[#7a7670]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
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
export { ContextMenu } from "./ContextMenu";
