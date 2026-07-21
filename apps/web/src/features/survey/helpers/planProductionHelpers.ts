import {
  resolveAlignment,
  generateViewFrames,
  createSheetSetFromFrames,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";

export function generatePlanViewFrames({
  alignment,
  site,
  scale,
  overlap,
}: {
  alignment: any;
  site: any;
  scale: string;
  overlap: number;
}) {
  if (!alignment || !site) {
    return null;
  }
  const resolved = resolveAlignment(alignment);
  if (!resolved) {
    return null;
  }

  const w = 30;
  const h = 18;

  const vfg = generateViewFrames(
    resolved,
    alignment.id,
    scale,
    w,
    h,
    site.spatial.units,
    overlap / 100,
  );

  useWorkspaceStore.getState().setViewFrames(vfg.frames, vfg.matchLines);
  return vfg;
}

export function createPlanSheets({
  alignment,
  site,
  scale,
  overlap,
}: {
  alignment: any;
  site: any;
  scale: string;
  overlap: number;
}) {
  if (!alignment || !site) {
    return;
  }
  const resolved = resolveAlignment(alignment);
  if (!resolved) {
    return;
  }

  const w = 30;
  const h = 18;
  const vfg = generateViewFrames(
    resolved,
    alignment.id,
    scale,
    w,
    h,
    site.spatial.units,
    overlap / 100,
  );
  const set = createSheetSetFromFrames(vfg, `Sheet Set - ${alignment.name}`);

  if (useWorkspaceStore.getState().addDrawingSet) {
    useWorkspaceStore.getState().addDrawingSet(set);
  }

  useUiStore.getState().setProductionOpen(false);
  useUiStore.getState().setSheetSetOpen(true);
}
