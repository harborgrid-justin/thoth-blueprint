import type { Point } from "../../spatial/geometry";

/** A Point of Vertical Intersection (PVI) in a vertical design profile. */
export interface VerticalPVI {
  station: number;
  elevation: number;
  /** Vertical curve length (parabolic curve), in plan units. 0/undefined implies a grade break point without curve. */
  curveLength?: number;
}

/** A Vertical Design Profile aligned to a horizontal baseline. */
export interface VerticalProfile {
  id: string;
  name: string;
  alignmentId: string;
  pvis: VerticalPVI[];
}

/** Resolved vertical curve parameters at a PVI. */
export interface ResolvedVerticalCurve {
  pviStation: number;
  pviElevation: number;
  startStation: number;
  endStation: number;
  startElevation: number;
  endElevation: number;
  gradeIn: number;
  gradeOut: number;
  curveLength: number;
  /** K-value = Curve Length / Percentage Grade Change (used for sight distance checks). */
  kValue: number;
  /** Equation of the parabola: y = ax^2 + bx + c where x is distance from curve start. */
  a: number;
  b: number;
  c: number;
}

/** A single offset-elevation coordinate point in a cross-section slice. */
export interface CrossSectionPoint {
  offset: number;
  elevation: number;
}

/** Bounded cross-section data at a specific station. */
export interface CrossSection {
  station: number;
  centerpoint: Point;
  existingPoints: CrossSectionPoint[];
  proposedPoints: CrossSectionPoint[];
}
