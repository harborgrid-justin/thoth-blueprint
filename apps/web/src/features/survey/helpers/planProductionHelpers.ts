import {
  createPlanSheets as domainCreatePlanSheets,
  generatePlanViewFrames as domainGeneratePlanViewFrames,
} from "@thoth/domain";
import { useUiStore } from "@/store/uiStore";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function generatePlanViewFrames(args: any) {
  const vfg = domainGeneratePlanViewFrames(args);
  if (vfg) {
    useWorkspaceStore.getState().setViewFrames(vfg.frames, vfg.matchLines);
  }
  return vfg;
}

export function createPlanSheets(args: any) {
  const set = domainCreatePlanSheets(args);
  if (set) {
    if (useWorkspaceStore.getState().addDrawingSet) {
      useWorkspaceStore.getState().addDrawingSet(set);
    }
    useUiStore.getState().setProductionOpen(false);
    useUiStore.getState().setSheetSetOpen(true);
  }
}
