import { resolveAlignment } from "../../civil/alignment";
import { createSheetSetFromFrames, generateViewFrames } from "../../drawing/planproduction";

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

  return generateViewFrames(
    resolved,
    alignment.id,
    scale,
    w,
    h,
    site.spatial.units,
    overlap / 100,
  );
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
  return createSheetSetFromFrames(vfg, `Sheet Set - ${alignment.name}`);
}
