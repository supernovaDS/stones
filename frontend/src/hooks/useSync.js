import { useEffect, useState } from "react";
import { syncManager } from "../sync/syncManager";

const initialStatus = {
  phase: navigator.onLine ? "idle" : "offline",
  pendingCount: 0,
  lastSyncedAt: null,
  error: "",
  isOnline: navigator.onLine
};

export function useSync(user) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => syncManager.subscribe(setStatus), []);

  useEffect(() => {
    if (!user?.id) return undefined;

    const runSync = () => void syncManager.syncNow(user.id);
    const scheduleSync = () => syncManager.schedule(user.id, 400);

    runSync();
    window.addEventListener("online", scheduleSync);
    window.addEventListener("offline", runSync);
    window.addEventListener("stones-sync-requested", scheduleSync);
    const interval = window.setInterval(scheduleSync, 2 * 60 * 1000);

    return () => {
      window.removeEventListener("online", scheduleSync);
      window.removeEventListener("offline", runSync);
      window.removeEventListener("stones-sync-requested", scheduleSync);
      window.clearInterval(interval);
    };
  }, [user?.id]);

  return {
    ...status,
    syncNow: () => syncManager.syncNow(user?.id)
  };
}
