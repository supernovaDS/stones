import { create } from "zustand";
import { db } from "../db/schema";
import { createUiSlice } from "./slices/uiSlice";
import { createWorkspaceSlice } from "./slices/workspaceSlice";
import { createBlockSlice } from "./slices/blockSlice";
import { createRecoverySlice } from "./slices/recoverySlice";

export const useAppStore = create((set, get) => ({
  ...createUiSlice(set, get),
  ...createWorkspaceSlice(set, get),
  ...createBlockSlice(set, get),
  ...createRecoverySlice(set, get)
}));

// ── Persist activePageId whenever it changes ──
let _prevActivePageId = useAppStore.getState().activePageId;
useAppStore.subscribe((state) => {
  if (state.activePageId !== _prevActivePageId) {
    _prevActivePageId = state.activePageId;
    if (state.activePageId) void db.settings.put({ key: "activePageId", value: state.activePageId });
  }
});
