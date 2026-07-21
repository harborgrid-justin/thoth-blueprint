/**
 * Terrain, grading, and earthwork math for Thoth Blueprint.
 *
 * A surface is modeled as a regular {@link ElevationGrid} of node elevations.
 * Grids are typically interpolated from surveyed spot elevations, then reshaped
 * by grading operations; the difference between an existing and a proposed grid
 * gives cut/fill volumes. Everything here is pure and framework-agnostic —
 * contours, slope, and volumes are computed, never eyeballed.
 *
 * Elevations (`z`) are in the plan's length {@link Unit}, the same unit as the
 * horizontal coordinates, so slope is a true rise-over-run.
 */

import { bounds, pointInPolygon, distance, length, type Bounds, type Point, type Polygon, type Polyline } from "../spatial/geometry";
import type { SpatialContext } from "../spatial/spatial";

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

/** Read the node elevation at grid indices, clamped to the grid. */
export function nodeHeight(grid: ElevationGrid, c: number, r: number): number {
  const cc = Math.max(0, Math.min(grid.cols - 1, c));
  const rr = Math.max(0, Math.min(grid.rows - 1, r));
  return grid.heights[rr * grid.cols + cc];
}

/** The world-space bounds covered by a grid. */
export function gridBounds(grid: ElevationGrid): Bounds {
  return {
    minX: grid.origin.x,
    minY: grid.origin.y,
    maxX: grid.origin.x + (grid.cols - 1) * grid.cellSize,
    maxY: grid.origin.y + (grid.rows - 1) * grid.cellSize,
  };
}

/** Min and max elevation over all nodes. */
export function elevationRange(grid: ElevationGrid): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const h of grid.heights) {
    if (h < min) {min = h;}
    if (h > max) {max = h;}
  }
  return { min, max };
}

/** Bilinearly interpolate the surface elevation at a world point. */
export function elevationAt(grid: ElevationGrid, p: Point): number {
  const fx = (p.x - grid.origin.x) / grid.cellSize;
  const fy = (p.y - grid.origin.y) / grid.cellSize;
  const c = Math.floor(fx);
  const r = Math.floor(fy);
  const tx = fx - c;
  const ty = fy - r;
  const tl = nodeHeight(grid, c, r);
  const tr = nodeHeight(grid, c + 1, r);
  const bl = nodeHeight(grid, c, r + 1);
  const br = nodeHeight(grid, c + 1, r + 1);
  const top = tl + (tr - tl) * tx;
  const bottom = bl + (br - bl) * tx;
  return top + (bottom - top) * ty;
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

/**
 * Build a regular elevation grid over the given extent by inverse-distance
 * weighting of spot elevations. With no spots, returns a flat base surface.
 */
export function interpolateGrid(
  spots: SpotElevation[],
  extent: Bounds,
  options: InterpolateOptions,
): ElevationGrid {
  const { cellSize, power = 2, base = 0, padding = 0 } = options;
  const minX = extent.minX - padding;
  const minY = extent.minY - padding;
  const width = extent.maxX + padding - minX;
  const height = extent.maxY + padding - minY;
  const cols = Math.max(2, Math.ceil(width / cellSize) + 1);
  const rows = Math.max(2, Math.ceil(height / cellSize) + 1);
  const heights = new Array<number>(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = { x: minX + c * cellSize, y: minY + r * cellSize };
      heights[r * cols + c] = spots.length === 0 ? base : idw(spots, p, power);
    }
  }
  return { origin: { x: minX, y: minY }, cellSize, cols, rows, heights };
}

function idw(spots: SpotElevation[], p: Point, power: number): number {
  let num = 0;
  let den = 0;
  for (const s of spots) {
    const d2 = (s.point.x - p.x) ** 2 + (s.point.y - p.y) ** 2;
    if (d2 < 1e-9) {return s.z;} // exactly on a control point
    const w = 1 / Math.pow(d2, power / 2);
    num += w * s.z;
    den += w;
  }
  return den > 0 ? num / den : 0;
}

// ---------------------------------------------------------------------------
// Contours (marching squares)
// ---------------------------------------------------------------------------

/** Contour line segments at a single elevation level. */
export interface ContourLevel {
  level: number;
  segments: Array<[Point, Point]>;
}

// Segment table keyed by the 4-corner case index (TL=8, TR=4, BR=2, BL=1).
// Each entry lists edge pairs to connect: T(op), R(ight), B(ottom), L(eft).
const MS_TABLE: Record<number, Array<[Edge, Edge]>> = {
  0: [],
  1: [["L", "B"]],
  2: [["B", "R"]],
  3: [["L", "R"]],
  4: [["T", "R"]],
  5: [["L", "T"], ["B", "R"]],
  6: [["T", "B"]],
  7: [["L", "T"]],
  8: [["L", "T"]],
  9: [["T", "B"]],
  10: [["L", "B"], ["T", "R"]],
  11: [["T", "R"]],
  12: [["L", "R"]],
  13: [["B", "R"]],
  14: [["L", "B"]],
  15: [],
};

type Edge = "T" | "R" | "B" | "L";

/**
 * Generate contour line segments at every multiple of `interval` between the
 * surface's min and max elevation, using marching squares.
 */
export function contourLevels(grid: ElevationGrid, interval: number): ContourLevel[] {
  if (interval <= 0) {return [];}
  const { min, max } = elevationRange(grid);
  const levels: ContourLevel[] = [];
  const start = Math.ceil(min / interval) * interval;
  for (let level = start; level < max; level += interval) {
    const segments: Array<[Point, Point]> = [];
    for (let r = 0; r < grid.rows - 1; r++) {
      for (let c = 0; c < grid.cols - 1; c++) {
        marchCell(grid, c, r, level, segments);
      }
    }
    if (segments.length) {levels.push({ level: round(level), segments });}
  }
  return levels;
}

function marchCell(
  grid: ElevationGrid,
  c: number,
  r: number,
  level: number,
  out: Array<[Point, Point]>,
) {
  const tl = nodeHeight(grid, c, r);
  const tr = nodeHeight(grid, c + 1, r);
  const br = nodeHeight(grid, c + 1, r + 1);
  const bl = nodeHeight(grid, c, r + 1);
  const idx = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
  const pairs = MS_TABLE[idx];
  if (pairs.length === 0) {return;}

  const xL = grid.origin.x + c * grid.cellSize;
  const xR = xL + grid.cellSize;
  const yT = grid.origin.y + r * grid.cellSize;
  const yB = yT + grid.cellSize;

  const point = (edge: Edge): Point => {
    switch (edge) {
      case "T":
        return { x: lerp(xL, xR, frac(tl, tr, level)), y: yT };
      case "B":
        return { x: lerp(xL, xR, frac(bl, br, level)), y: yB };
      case "L":
        return { x: xL, y: lerp(yT, yB, frac(tl, bl, level)) };
      case "R":
        return { x: xR, y: lerp(yT, yB, frac(tr, br, level)) };
    }
  };

  for (const [a, b] of pairs) {out.push([point(a), point(b)]);}
}

function frac(a: number, b: number, level: number): number {
  const d = b - a;
  return Math.abs(d) < 1e-12 ? 0.5 : (level - a) / d;
}

/**
 * Stitch a level's segments into continuous polylines for clean rendering and
 * labeling. Endpoints within `eps` world units are treated as the same vertex.
 */
export function stitchContours(segments: Array<[Point, Point]>, eps = 1e-4): Polyline[] {
  const key = (p: Point) => `${Math.round(p.x / eps)}:${Math.round(p.y / eps)}`;
  const remaining = segments.map((s) => [...s] as [Point, Point]);
  const polylines: Polyline[] = [];

  while (remaining.length) {
    const [a, b] = remaining.pop()!;
    const line: Polyline = [a, b];
    let extended = true;
    while (extended) {
      extended = false;
      const tail = line[line.length - 1];
      const head = line[0];
      for (let i = 0; i < remaining.length; i++) {
        const [s0, s1] = remaining[i];
        if (key(s0) === key(tail)) {
          line.push(s1);
        } else if (key(s1) === key(tail)) {
          line.push(s0);
        } else if (key(s0) === key(head)) {
          line.unshift(s1);
        } else if (key(s1) === key(head)) {
          line.unshift(s0);
        } else {
          continue;
        }
        remaining.splice(i, 1);
        extended = true;
        break;
      }
    }
    polylines.push(line);
  }
  return polylines;
}

// ---------------------------------------------------------------------------
// Slope & aspect
// ---------------------------------------------------------------------------

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

/** Slope and aspect at a grid node, via central differences. */
export function slopeAtNode(grid: ElevationGrid, c: number, r: number): SlopeSample {
  const dzdx = (nodeHeight(grid, c + 1, r) - nodeHeight(grid, c - 1, r)) / (2 * grid.cellSize);
  const dzdy = (nodeHeight(grid, c, r + 1) - nodeHeight(grid, c, r - 1)) / (2 * grid.cellSize);
  const grad = { x: dzdx, y: dzdy };
  const slope = length(grad);
  const aspect =
    slope < 1e-9 ? null : (Math.atan2(grad.x, grad.y) * (180 / Math.PI) + 360) % 360;
  return { slope, percent: slope * 100, degrees: Math.atan(slope) * (180 / Math.PI), aspect };
}

export interface SlopeStats {
  minPercent: number;
  maxPercent: number;
  meanPercent: number;
  /** Fraction of sampled nodes at or below `buildableMaxPercent`. */
  buildableFraction: number;
  samples: number;
}

/**
 * Summarize slope over a grid (optionally clipped to a polygon). `buildable`
 * slopes are those at or below `buildableMaxPercent` (default 15%).
 */
export function slopeStats(
  grid: ElevationGrid,
  options: { region?: Polygon; buildableMaxPercent?: number } = {},
): SlopeStats {
  const { region, buildableMaxPercent = 15 } = options;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let buildable = 0;
  let n = 0;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (region) {
        const p = { x: grid.origin.x + c * grid.cellSize, y: grid.origin.y + r * grid.cellSize };
        if (!pointInPolygon(p, region)) {continue;}
      }
      const pct = slopeAtNode(grid, c, r).percent;
      min = Math.min(min, pct);
      max = Math.max(max, pct);
      sum += pct;
      if (pct <= buildableMaxPercent) {buildable += 1;}
      n += 1;
    }
  }
  if (n === 0) {return { minPercent: 0, maxPercent: 0, meanPercent: 0, buildableFraction: 0, samples: 0 };}
  return {
    minPercent: min,
    maxPercent: max,
    meanPercent: sum / n,
    buildableFraction: buildable / n,
    samples: n,
  };
}

// ---------------------------------------------------------------------------
// Grading & earthwork
// ---------------------------------------------------------------------------

/** Return a copy of `grid` with nodes inside `polygon` set to `targetZ` (a flat pad). */
export function gradePad(grid: ElevationGrid, polygon: Polygon, targetZ: number): ElevationGrid {
  const heights = grid.heights.slice();
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const p = { x: grid.origin.x + c * grid.cellSize, y: grid.origin.y + r * grid.cellSize };
      if (pointInPolygon(p, polygon)) {heights[r * grid.cols + c] = targetZ;}
    }
  }
  return { ...grid, heights };
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

/**
 * Compute cut and fill between two identically-shaped grids by integrating the
 * signed elevation difference over each cell (optionally clipped to a region).
 */
export function cutFill(
  existing: ElevationGrid,
  proposed: ElevationGrid,
  options: { region?: Polygon; spatial?: SpatialContext; balanceTolerance?: number } = {},
): Earthwork {
  const { region, spatial, balanceTolerance = 0.1 } = options;
  const cellArea = existing.cellSize * existing.cellSize;
  let cut = 0;
  let fill = 0;
  let cells = 0;

  for (let r = 0; r < existing.rows - 1; r++) {
    for (let c = 0; c < existing.cols - 1; c++) {
      const center = {
        x: existing.origin.x + (c + 0.5) * existing.cellSize,
        y: existing.origin.y + (r + 0.5) * existing.cellSize,
      };
      if (region && !pointInPolygon(center, region)) {continue;}
      const dz =
        (diff(existing, proposed, c, r) +
          diff(existing, proposed, c + 1, r) +
          diff(existing, proposed, c, r + 1) +
          diff(existing, proposed, c + 1, r + 1)) /
        4;
      const volume = dz * cellArea;
      if (volume > 0) {fill += volume;}
      else {cut += -volume;}
      cells += 1;
    }
  }

  const unitFactor = spatial?.units === "feet" ? 0.3048 : 1;
  const volumeToM3 = unitFactor ** 3;
  const areaToM2 = unitFactor ** 2;
  const net = fill - cut;
  return {
    cut,
    fill,
    net,
    cutCubicMeters: cut * volumeToM3,
    fillCubicMeters: fill * volumeToM3,
    netCubicMeters: net * volumeToM3,
    areaSquareMeters: cells * cellArea * areaToM2,
    balanced: Math.abs(net) <= balanceTolerance * Math.max(cut, fill, 1),
  };
}

function diff(existing: ElevationGrid, proposed: ElevationGrid, c: number, r: number): number {
  return nodeHeight(proposed, c, r) - nodeHeight(existing, c, r);
}

/** Convenience: interpolate an existing surface directly from spots over a boundary. */
export function surfaceFromSpots(
  spots: SpotElevation[],
  extent: Bounds,
  cellSize: number,
  base = 0,
): ElevationGrid {
  return interpolateGrid(spots, extent, { cellSize, base, padding: cellSize });
}

/** Convenience wrapper: bounds of a set of spot elevations. */
export function spotsBounds(spots: SpotElevation[]): Bounds {
  return bounds(spots.map((s) => s.point));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** Traces a downhill path from a starting coordinate on the terrain grid (Water Drop analysis). */
export function traceWaterDropPath(
  grid: ElevationGrid,
  start: Point,
  stepSize: number = 5,
  maxSteps: number = 80
): Point[] {
  const path: Point[] = [start];
  let curr = { ...start };

  for (let i = 0; i < maxSteps; i++) {
    const c = Math.round((curr.x - grid.origin.x) / grid.cellSize);
    const r = Math.round((curr.y - grid.origin.y) / grid.cellSize);

    if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) {
      break;
    }

    const dzdx = (nodeHeight(grid, c + 1, r) - nodeHeight(grid, c - 1, r)) / (2 * grid.cellSize);
    const dzdy = (nodeHeight(grid, c, r + 1) - nodeHeight(grid, c, r - 1)) / (2 * grid.cellSize);

    const grad = { x: dzdx, y: dzdy };
    const lenVal = length(grad);
    if (lenVal < 0.005) {
      break;
    }

    const next = {
      x: curr.x - (grad.x / lenVal) * stepSize,
      y: curr.y - (grad.y / lenVal) * stepSize
    };

    if (distance(next, curr) < 1e-3) {
      break;
    }

    path.push(next);
    curr = next;
  }

  return path;
}
