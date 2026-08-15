import { db } from "../../db/schema";
import {
  defaultSidebarHidden,
  defaultTheme
} from "../storeHelpers";

export const createUiSlice = (set, get) => ({
  theme: defaultTheme(),
  sidebarHidden: defaultSidebarHidden(),
  settingsOpen: false,
  recurringTasksOpen: false,
  recycleBinOpen: false,
  recoveryOpen: false,
  contextMenu: { visible: false, x: 0, y: 0, blockId: null },
  notification: undefined,
  error: undefined,
  editingRepeatedTaskId: null,

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setRecurringTasksOpen: (recurringTasksOpen) => set({ recurringTasksOpen }),
  setRecycleBinOpen: (recycleBinOpen) => set({ recycleBinOpen }),
  setRecoveryOpen: (recoveryOpen) => set({ recoveryOpen }),
  showContextMenu: (x, y, blockId) => set({ contextMenu: { visible: true, x, y, blockId } }),
  hideContextMenu: () => set({ contextMenu: { visible: false, x: 0, y: 0, blockId: null } }),

  setSidebarHidden: async (sidebarHidden) => {
    localStorage.setItem("stones-sidebar-hidden", String(sidebarHidden));
    await db.settings.put({ key: "sidebarHidden", value: sidebarHidden });
    set({ sidebarHidden });
  },

  setEditingRepeatedTaskId: (editingRepeatedTaskId) => set({ editingRepeatedTaskId }),

  setTheme: async (theme) => {
    localStorage.setItem("stones-theme", theme);
    await db.settings.put({ key: "theme", value: theme });
    set({ theme });
  },

  setNotification: (msg) => {
    set({ notification: msg });
    setTimeout(() => {
      if (get().notification === msg) {
        set({ notification: undefined });
      }
    }, 3000);
  },

  setError: (msg) => {
    set({ error: msg });
    if (msg) {
      setTimeout(() => {
        if (get().error === msg) {
          set({ error: undefined });
        }
      }, 3000);
    }
  }
});
