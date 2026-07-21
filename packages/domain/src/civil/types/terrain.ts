import type { Point } from "../../spatial/geometry";

/** A surveyed elevation at a point (a spot grade / benchmark). */
export interface SpotElevation {
  point: Point;
  z: number;
}

/**
 * A regular grid of node elevations. Node (c, r) sits at world coordinate
 * `origin + (c·cellSize, r·cellSize)`; `heights` is row-major with length
 * `cols · rows`.
 */
export interface ElevationGrid {
  origin: Point;
  cellSize: number;
  cols: number;
  rows: number;
  heights: number[];
}

export interface InterpolateOptions {
  /** Grid resolution (world units between nodes). */
  cellSize: number;
  /** Inverse-distance-weighting power. */
  power?: number;
  /** Base elevation used when there are no spots. */
  base?: number;
  /** Padding added around the spots' bounds. */
  padding?: number;
}

/** Contour line segments at a single elevation level. */
export interface ContourLevel {
  level: number;
  segments: Array<[Point, Point]>;
}

export interface SlopeSample {
  /** Rise over run (dimensionless). */
  slope: number;
  /** Slope as a percentage. */
  percent: number;
  /** Slope in degrees. */
  degrees: number;
  /** Downslope compass aspect in degrees (0 = north/−Y), or null if flat. */
  aspect: number | null;
}

export interface SlopeStats {
  minPercent: number;
  maxPercent: number;
  meanPercent: number;
  /** Fraction of sampled nodes at or below `buildableMaxPercent`. */
  buildableFraction: number;
  samples: number;
}

/** Earthwork volumes between an existing and a proposed surface. */
export interface Earthwork {
  /** Excavation volume (proposed below existing), plan units³. */
  cut: number;
  /** Placement volume (proposed above existing), plan units³. */
  fill: number;
  /** fill − cut. Positive means net import of material. */
  net: number;
  cutCubicMeters: number;
  fillCubicMeters: number;
  netCubicMeters: number;
  /** Horizontal area considered, m². */
  areaSquareMeters: number;
  /** True when cut and fill are within `balanceTolerance` of each other. */
  balanced: boolean;
}
