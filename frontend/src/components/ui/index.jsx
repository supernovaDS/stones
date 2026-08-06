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
    yellow: "bg-[#ffdc4a] dark:bg-[#523600]",
    amber: "bg-[#fde047] dark:bg-[#483a00]",
    gold: "bg-[#fef9c3] dark:bg-[#39340b]",
    lemon: "bg-[#fef08a] dark:bg-[#3f3500]",
    cream: "bg-[#fef3c7] dark:bg-[#3b2d08]",
    sunshine: "bg-[#fed7aa] dark:bg-[#402208]",
    mustard: "bg-[#fde68a] dark:bg-[#423105]",

    // Aliases to ensure all color references resolve to yellow shades
    blue: "bg-[#fef9c3] dark:bg-[#39340b]",
    green: "bg-[#fde047] dark:bg-[#483a00]",
    red: "bg-[#fde68a] dark:bg-[#423105]",
    purple: "bg-[#ffdc4a] dark:bg-[#523600]",
    pink: "bg-[#fef08a] dark:bg-[#3f3500]",
    teal: "bg-[#fef3c7] dark:bg-[#3b2d08]",
    orange: "bg-[#fed7aa] dark:bg-[#402208]"
  };
  return (
    <div className={clsx("bento-card p-3 text-black dark:text-[#c8c3ba]", colors[color] ?? "bg-[#ffdc4a] dark:bg-[#523600]")}>
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
