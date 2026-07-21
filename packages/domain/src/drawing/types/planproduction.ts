import type { Point } from "../../spatial/geometry";

/** A single rectangular View Frame showing a station range along an alignment. */
export interface ViewFrame {
  id: string;
  name: string;
  stationStart: number;
  stationEnd: number;
  center: Point;
  width: number;       // viewport width in model units
  height: number;      // viewport height in model units
  rotationDeg: number; // clockwise rotation angle in degrees to align viewport
}

/** A match line marking the page break boundary between two adjacent view frames. */
export interface PlanMatchLine {
  id: string;
  station: number;
  cutLine: [Point, Point]; // Left to Right normal cut line segment in model coordinates
  label: string;
}

/** A group organizing view frames and match lines along an alignment. */
export interface ViewFrameGroup {
  id: string;
  name: string;
  alignmentId: string;
  frames: ViewFrame[];
  matchLines: PlanMatchLine[];
}
