import type { Point } from "../../spatial/geometry";

/** A Point of Intersection on an alignment; interior PIs may carry a curve. */
export interface AlignmentPI {
  point: Point;
  /** Circular curve radius at this PI, plan units; 0/undefined ⇒ no curve. */
  radius?: number;
}

/** A parallel offset line carried alongside an alignment (pavement edge, R/W…). */
export interface AlignmentOffset {
  /** Signed offset, plan units; + is right of travel, − is left. */
  distance: number;
  kind: "pavement" | "shoulder" | "row" | "ditch";
  label?: string;
}

/** A horizontal alignment definition (the PI chain + its start station). */
export interface HorizontalAlignment {
  id: string;
  name: string;
  pis: AlignmentPI[];
  /** Station at the Point of Beginning (start), plan units (e.g. feet). */
  startStation: number;
  /** Parallel offset lines to generate (edge of pavement, right-of-way, …). */
  offsets?: AlignmentOffset[];
  /** Default Design Speed in mph (e.g. 45) */
  designSpeed?: number;
  /** Station-specific design speeds (e.g., zones) */
  designSpeeds?: { station: number; speed: number }[];
}

/** Resolved circular curve at a PI, with the values a plan sheet lists. */
export interface AlignmentCurve {
  piIndex: number;
  pi: Point;
  /** Point of Curvature (tangent-to-curve) and Point of Tangency (curve-to-tangent). */
  pc: Point;
  pt: Point;
  center: Point;
  radius: number;
  /** Central (deflection) angle, radians and degrees. */
  delta: number;
  deltaDeg: number;
  /** Tangent distance T = R·tan(Δ/2). */
  tangent: number;
  /** Curve (arc) length L = R·Δ. */
  length: number;
  /** External distance E = R(sec(Δ/2) − 1). */
  external: number;
  /** Middle ordinate M = R(1 − cos(Δ/2)). */
  middleOrdinate: number;
  /** Long chord = 2R·sin(Δ/2). */
  chord: number;
  /** Degree of curve (arc definition), degrees per 100 units. */
  degreeOfCurve: number;
  /** Which way the curve turns along the direction of travel. */
  direction: "left" | "right";
  pcStation: number;
  /** Ahead station of the PI, measured along the back tangent (PC + T). */
  piStation: number;
  ptStation: number;
  /** Azimuth of the long chord, degrees clockwise from north. */
  chordBearing: number;
  /** Signed swept angle start→end (radians). */
  sweep: number;
  startAngle: number;
}

/** One element of the traveled centerline: a tangent run or a circular curve. */
export type AlignmentElement =
  | {
      kind: "tangent";
      from: Point;
      to: Point;
      beginStation: number;
      endStation: number;
      length: number;
      /** Azimuth of the tangent, degrees clockwise from north. */
      bearing: number;
    }
  | { kind: "curve"; curve: AlignmentCurve; beginStation: number; endStation: number };

/** A fully-resolved alignment: traveled elements, curve table, and extents. */
export interface ResolvedAlignment {
  name: string;
  elements: AlignmentElement[];
  curves: AlignmentCurve[];
  startStation: number;
  endStation: number;
  length: number;
  pob: Point;
  poe: Point;
}

export interface DesignSpeedCheckResult {
  piIndex: number;
  station: number;
  curveRadius: number;
  requiredRadius: number;
  designSpeed: number;
  isViolation: boolean;
  message: string;
}
