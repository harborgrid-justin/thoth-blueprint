import type { Point } from "../../spatial/geometry";

/** Arrowhead terminator style. */
export type DimArrow = "arrow" | "tick" | "dot" | "open";

/** How dimension text is displayed. */
export type DimUnit = "ft-in" | "ft-dec" | "in" | "m" | "cm" | "mm";

/** A named dimension style. */
export interface DimensionStyle {
  id: string;
  label: string;
  arrow: DimArrow;
  /** Text height in paper millimetres. */
  textHeight: number;
  /** Decimal precision for the numeric value. */
  precision: number;
  unit: DimUnit;
  /** Gap between the object and the start of the witness line, model units. */
  extensionGap: number;
  /** How far the witness line extends past the dimension line, model units. */
  extensionBeyond: number;
  /** Suppress a trailing "0 in" / trailing zeros. */
  suppressZero: boolean;
  suppressExtension1?: boolean;
  suppressExtension2?: boolean;
  textAlignment?: "horizontal" | "parallel" | "perpendicular";
  secondaryUnit?: DimUnit;
}

interface DimBase {
  id: string;
  styleId: string;
  /** Optional text override (e.g. "EQ", "VIF"); replaces the measured value. */
  textOverride?: string;
}

/** Horizontal or vertical distance between two points. */
export interface LinearDimension extends DimBase {
  kind: "linear";
  a: Point;
  b: Point;
  axis: "horizontal" | "vertical";
  /** Perpendicular offset of the dimension line from the points, model units. */
  offset: number;
}

/** True (aligned) distance between two points. */
export interface AlignedDimension extends DimBase {
  kind: "aligned";
  a: Point;
  b: Point;
  offset: number;
}

/** Angle at `vertex` between rays to `a` and `b`. */
export interface AngularDimension extends DimBase {
  kind: "angular";
  vertex: Point;
  a: Point;
  b: Point;
  /** Radius of the dimension arc, model units. */
  radius: number;
}

/** Radius (or diameter) of an arc/circle. */
export interface RadialDimension extends DimBase {
  kind: "radial";
  center: Point;
  edge: Point;
  diameter?: boolean;
}

/** Ordinate (X or Y offset from a datum). */
export interface OrdinateDimension extends DimBase {
  kind: "ordinate";
  datum: Point;
  point: Point;
  axis: "x" | "y";
  /** Leader length to the text, model units. */
  leader: number;
}

/** Arc length along a curved edge. */
export interface ArcLengthDimension extends DimBase {
  kind: "arclength";
  center: Point;
  start: Point;
  end: Point;
  radius: number;
  offset: number;
}

/** A dimension entity, tagged by kind. All anchor points are in model space. */
export type Dimension =
  | LinearDimension
  | AlignedDimension
  | AngularDimension
  | RadialDimension
  | OrdinateDimension
  | ArcLengthDimension;

/** The drawable pieces of a dimension, in model space (renderer projects them). */
export interface DimensionGeometry {
  /** Line segments (witness lines + dimension line / arc chords). */
  lines: [Point, Point][];
  /** Arrow/tick placements with an outward direction. */
  ticks: { at: Point; dir: Point }[];
  /** Where the measurement text is anchored. */
  textAt: Point;
  /** Text baseline rotation, degrees. */
  textAngleDeg: number;
}

/** The measured value, formatted label, and drawable geometry of a dimension. */
export interface MeasuredDimension {
  value: number;
  label: string;
  geometry: DimensionGeometry;
}
