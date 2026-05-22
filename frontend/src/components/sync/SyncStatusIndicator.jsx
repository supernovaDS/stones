import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

export function SyncStatusIndicator({ status, onSync }) {
  const phase = status?.phase ?? "idle";
  const pending = status?.pendingCount ?? 0;
  const offline = phase === "offline" || status?.isOnline === false;
  const syncing = phase === "syncing";
  const label = offline
    ? "Offline"
    : phase === "local"
      ? "Local"
      : syncing
        ? "Syncing"
        : pending
          ? `${pending} pending`
          : "Synced";
  const Icon = offline ? CloudOff : syncing ? Loader2 : Cloud;

  return (
    <button
      className={clsx(
        "nb-button sync-btn min-h-0 px-3 py-2 text-xs",
        phase === "error" && "danger",
        syncing && "pointer-events-none"
      )}
      onClick={onSync}
      title={status?.error || "Sync now"}
      type="button"
    >
      <Icon className={syncing ? "animate-spin" : ""} size={15} />
      <span className="header-btn-label sync-status-label">{label}</span>
      {!syncing ? <RefreshCw className="sync-refresh-icon" size={13} /> : null}
    </button>
  );
}
