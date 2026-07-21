import type { PaperRect } from "./sheetsize";
import type { Point } from "../../spatial/geometry";

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
  /** Optional rotation of the view about modelCenter, degrees CW. */
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
