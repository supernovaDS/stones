import { create } from "zustand";
import { db } from "../db/schema";
import { createUiSlice } from "./slices/uiSlice";
import { createDiarySlice } from "./slices/diarySlice";
import { createWorkspaceSlice } from "./slices/workspaceSlice";
import { createBlockSlice } from "./slices/blockSlice";
import { createRecoverySlice } from "./slices/recoverySlice";

export const useAppStore = create((set, get) => ({
  ...createUiSlice(set, get),
  ...createDiarySlice(set, get),
  ...createWorkspaceSlice(set, get),
  ...createBlockSlice(set, get),
  ...createRecoverySlice(set, get)
}));

// ── Persist activePageId & activeDiaryPageId whenever they change ──
let _prevActivePageId = useAppStore.getState().activePageId;
let _prevActiveDiaryPageId = useAppStore.getState().activeDiaryPageId;
useAppStore.subscribe((state) => {
  if (state.activePageId !== _prevActivePageId) {
    _prevActivePageId = state.activePageId;
    if (state.activePageId) void db.settings.put({ key: "activePageId", value: state.activePageId });
  }
  if (state.activeDiaryPageId !== _prevActiveDiaryPageId) {
    _prevActiveDiaryPageId = state.activeDiaryPageId;
    if (state.activeDiaryPageId) void db.settings.put({ key: "activeDiaryPageId", value: state.activeDiaryPageId });
  }
});
