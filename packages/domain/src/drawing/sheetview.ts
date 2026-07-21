/**
 * Paper-space **viewports** and **view references**.
 *
 * A viewport is a rectangle on a sheet (paper units) that shows a region of the
 * model at a named scale. {@link viewportTransform} produces the model→paper
 * projection a renderer uses — generalizing the ad-hoc `project` closure the
 * plat composer used to inline. View references (section / elevation / detail
 * marks and match lines) tie one sheet's cut to another sheet's drawing.
 *
 * Coordinate convention follows the survey frame: north is −Y, so the transform
 * preserves the Y sense (north stays up) and never flips.
 */

import _ from "lodash";
import { mat2d, vec2 } from "gl-matrix";
import type { Bounds, Point } from "../spatial/geometry";
import { boundsCenter } from "../spatial/geometry";
import type { PaperRect, PaperUnit } from "./types/sheetsize";
import type { Unit } from "../spatial/spatial";
import type {
  ViewKind,
  SheetViewport,
  ViewportTransform,
  SectionMark,
  ElevationMark,
  DetailMark,
  MatchLine,
} from "./types/sheetview";

export type {
  ViewKind,
  SheetViewport,
  ViewportTransform,
  SectionMark,
  ElevationMark,
  DetailMark,
  MatchLine,
};

import { paperPerModel } from "./common/units";

export { paperPerModel };

/**
 * The projection for a viewport at its named scale, centred on its model
 * centre. If `scaleId` is "as-shown", the caller should use
 * {@link fitViewportTransform} instead.
 */
export function viewportTransform(
  vp: SheetViewport,
  modelUnit: Unit,
  paperUnit: PaperUnit,
): ViewportTransform {
  const s = paperPerModel(vp.scaleId, modelUnit, paperUnit);
  const cx = vp.sheetRect.x + vp.sheetRect.w / 2;
  const cy = vp.sheetRect.y + vp.sheetRect.h / 2;
  const rot = ((vp.rotationDeg ?? 0) * Math.PI) / 180;

  const m = mat2d.create();
  mat2d.translate(m, m, [cx, cy]);
  mat2d.rotate(m, m, rot);
  mat2d.scale(m, m, [s, s]);
  mat2d.translate(m, m, [-vp.modelCenter.x, -vp.modelCenter.y]);

  const project = (p: Point): Point => {
    const out = vec2.create();
    vec2.transformMat2d(out, [p.x, p.y], m);
    return { x: out[0], y: out[1] };
  };
  return { project, scalePx: s };
}

/**
 * A projection that fits `modelBounds` into the viewport rect (ignoring the
 * named scale) — for key maps, index thumbnails, and "as-shown" windows.
 */
export function fitViewportTransform(
  rect: PaperRect,
  modelBounds: Bounds,
  pad = 0.06,
): ViewportTransform {
  const bw = Math.max(modelBounds.maxX - modelBounds.minX, 1e-6);
  const bh = Math.max(modelBounds.maxY - modelBounds.minY, 1e-6);
  const iw = rect.w * (1 - pad * 2);
  const ih = rect.h * (1 - pad * 2);
  const s = Math.min(iw / bw, ih / bh);
  const c = boundsCenter(modelBounds);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const project = (p: Point): Point => ({
    x: cx + (p.x - c.x) * s,
    y: cy + (p.y - c.y) * s,
  });
  return { project, scalePx: s };
}

/**
 * Pick the largest named scale from `candidates` at which `modelBounds` still
 * fits inside `rect`. Returns the first (largest-scale) that fits, else the last
 * (smallest-scale) candidate.
 */
export function fitScale(
  candidates: string[],
  modelBounds: Bounds,
  rect: PaperRect,
  modelUnit: Unit,
  paperUnit: PaperUnit,
): string {
  const bw = Math.max(modelBounds.maxX - modelBounds.minX, 1e-6);
  const bh = Math.max(modelBounds.maxY - modelBounds.minY, 1e-6);
  // Larger paperPerModel ⇒ bigger drawing; iterate from biggest to smallest.
  const sorted = _.orderBy(
    candidates.map((id) => ({
      id,
      s: paperPerModel(id, modelUnit, paperUnit),
    })),
    ["s"],
    ["desc"],
  );
  for (const { id, s } of sorted) {
    if (bw * s <= rect.w && bh * s <= rect.h) {
      return id;
    }
  }
  return sorted.length ? sorted[sorted.length - 1].id : candidates[0];
}

// --- view references --------------------------------------------------------

/** Unit perpendicular (left normal) of a directed segment, in the −Y-north frame. */
export function sectionGaze(mark: SectionMark): Point {
  if (mark.gaze) {
    return mark.gaze;
  }
  const [a, b] = mark.atLine;
  const v = vec2.fromValues(b.x - a.x, b.y - a.y);
  const len = vec2.len(v) || 1;
  // Left normal of the cut direction.
  return { x: -v[1] / len, y: v[0] / len };
}
