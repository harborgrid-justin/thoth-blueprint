import type { Point } from "../../spatial/geometry";

/** A quarter within a section or aliquot part. */
export type Quarter = "NW" | "NE" | "SW" | "SE";

/** Halves used for half-aliquots (e.g. the N1/2). */
export type Half = "N" | "S" | "E" | "W";

export type TownshipDirection = "North" | "South";
export type RangeDirection = "East" | "West";

/** A Township & Range designation (optionally naming the principal meridian). */
export interface TownshipRange {
  township: number;
  townshipDir: TownshipDirection;
  range: number;
  rangeDir: RangeDirection;
  /** Principal meridian, e.g. "Tallahassee" (optional). */
  meridian?: string;
}

/** The corners and controlling points of a section (or any square aliquot). */
export interface SectionFrame {
  nw: Point;
  ne: Point;
  sw: Point;
  se: Point;
  center: Point;
  /** Quarter-corner points on each edge (the section midpoints). */
  north: Point;
  south: Point;
  east: Point;
  west: Point;
  /** Side length in plan units. */
  side: number;
}
