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

import type { Bounds, Point } from "./geometry";
import { boundsCenter } from "./geometry";
import { scaleRatio } from "./drafting";
import type { PaperRect, PaperUnit } from "./sheetsize";
import { METERS_PER_UNIT, type Unit } from "./spatial";

const METERS_PER_PAPER_UNIT: Record<PaperUnit, number> = {
  in: 0.0254,
  mm: 0.001,
};

/** The kind of drawing a viewport frames. */
export type ViewKind =
  | "plan"
  | "detail"
  | "section"
  | "elevation"
  | "schedule"
  | "keymap"
  | "3d"
  | "legend"
  | "titleblock"
  | "index";

/** A rectangular window on a sheet showing the model at a scale. */
export interface SheetViewport {
  id: string;
  kind: ViewKind;
  /** The rectangle on the sheet, in the sheet's paper unit. */
  sheetRect: PaperRect;
  /** Named drawing scale id (from ./drafting), or "as-shown" to fit. */
  scaleId: string;
  /** Model point centred in the viewport. */
  modelCenter: Point;
  /** Optional rotation of the view about {@link modelCenter}, degrees CW. */
  rotationDeg?: number;
  /** View number shown in the viewport title bubble (e.g. 3). */
  viewNumber?: number;
  label?: string;
}

/** A model→paper projection plus the resolved paper-units-per-model-unit scale. */
export interface ViewportTransform {
  project: (p: Point) => Point;
  /** Paper units (the sheet's unit) per one model unit. */
  scalePx: number;
}

/**
 * Paper units per one model unit for a named scale, given the model's length
 * unit and the sheet's paper unit. A drawing scale is a dimensionless real-to-
 * paper ratio (e.g. 1"=20' → 240, 1:100 → 100); this reconciles the unit
 * families through metres so the result is unambiguous.
 */
export function paperPerModel(scaleId: string, modelUnit: Unit, paperUnit: PaperUnit): number {
  const ratio = scaleRatio(scaleId); // real-world length ÷ paper length, dimensionless
  return METERS_PER_UNIT[modelUnit] / (ratio * METERS_PER_PAPER_UNIT[paperUnit]);
}

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
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const project = (p: Point): Point => {
    const dx = (p.x - vp.modelCenter.x) * s;
    const dy = (p.y - vp.modelCenter.y) * s;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  };
  return { project, scalePx: s };
}

/**
 * A projection that fits `modelBounds` into the viewport rect (ignoring the
 * named scale) — for key maps, index thumbnails, and "as-shown" windows.
 */
export function fitViewportTransform(rect: PaperRect, modelBounds: Bounds, pad = 0.06): ViewportTransform {
  const bw = Math.max(modelBounds.maxX - modelBounds.minX, 1e-6);
  const bh = Math.max(modelBounds.maxY - modelBounds.minY, 1e-6);
  const iw = rect.w * (1 - pad * 2);
  const ih = rect.h * (1 - pad * 2);
  const s = Math.min(iw / bw, ih / bh);
  const c = boundsCenter(modelBounds);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const project = (p: Point): Point => ({ x: cx + (p.x - c.x) * s, y: cy + (p.y - c.y) * s });
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
  const sorted = candidates
    .map((id) => ({ id, s: paperPerModel(id, modelUnit, paperUnit) }))
    .sort((a, b) => b.s - a.s);
  for (const { id, s } of sorted) {
    if (bw * s <= rect.w && bh * s <= rect.h) return id;
  }
  return sorted.length ? sorted[sorted.length - 1].id : candidates[0];
}

// --- view references --------------------------------------------------------

/** A section-cut mark: a cut line with a bubble tag referencing another view. */
export interface SectionMark {
  id: string;
  /** Tag shown in the bubble, e.g. "A" or "1". */
  tag: string;
  /** The cut line in model space. */
  atLine: [Point, Point];
  /** Direction the section looks (unit vector); defaults perpendicular to the cut. */
  gaze?: Point;
  /** Sheet number the section is drawn on, e.g. "A-301". */
  targetSheet: string;
  /** View number on that sheet. */
  targetView?: number;
}

/** An interior/exterior elevation mark (a bubble with a pointing arrow). */
export interface ElevationMark {
  id: string;
  tag: string;
  position: Point;
  /** Direction the elevation faces (unit vector). */
  gaze: Point;
  targetSheet: string;
  targetView?: number;
}

/** A detail callout: a boundary (circle/rect) around an area, tagged to a detail. */
export interface DetailMark {
  id: string;
  tag: string;
  /** Centre of the callout in model space. */
  center: Point;
  /** Callout radius in model units. */
  radius: number;
  targetSheet: string;
  targetView?: number;
}

/** A match line: where a plan continues on an adjoining sheet. */
export interface MatchLine {
  id: string;
  atLine: [Point, Point];
  adjoiningSheet: string;
  label?: string;
}

/** Unit perpendicular (left normal) of a directed segment, in the −Y-north frame. */
export function sectionGaze(mark: SectionMark): Point {
  if (mark.gaze) return mark.gaze;
  const [a, b] = mark.atLine;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Left normal of the cut direction.
  return { x: -dy / len, y: dx / len };
}
