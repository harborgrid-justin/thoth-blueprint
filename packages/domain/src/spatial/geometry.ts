import type { Point, Bounds, Polyline, Polygon } from "./types";
export type { Point, Bounds, Polyline, Polygon };

/**
 * Geometry primitives and pure functions for Thoth Blueprint.
 *
 * Framework-agnostic. All coordinates are plain plan-space numbers; their
 * real-world meaning comes from an accompanying {@link SpatialContext}
 * (see ./spatial.ts). Nothing here does I/O or touches a framework.
 */

/** A named tolerance for geometric comparisons — never use bare magic numbers. */
export const GEOMETRY_EPSILON = 1e-9;

/** Euclidean distance between two points, in plan units. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Add two points as vectors. */
export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract `b` from `a` as vectors. */
export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scale a point/vector by a scalar. */
export function scale(p: Point, k: number): Point {
  return { x: p.x * k, y: p.y * k };
}

/** Vector length (magnitude). */
export function length(v: Point): number {
  return Math.hypot(v.x, v.y);
}

/** Return `v` scaled to unit length, or the zero vector if `v` is ~zero. */
export function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y);
  if (len < GEOMETRY_EPSILON) {return { x: 0, y: 0 };}
  return { x: v.x / len, y: v.y / len };
}

/** Dot product of two vectors. */
export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

/** 2D cross product (z-component of the 3D cross), useful for orientation. */
export function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

/**
 * Signed area of a polygon via the shoelace formula. Positive for a
 * counter-clockwise ring, negative for clockwise (in a standard math frame).
 */
export function signedArea(polygon: Polygon): number {
  const n = polygon.length;
  if (n < 3) {return 0;}
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Absolute area of a polygon in plan units², regardless of winding order. */
export function area(polygon: Polygon): number {
  return Math.abs(signedArea(polygon));
}

/** `true` if the ring is wound counter-clockwise. */
export function isCounterClockwise(polygon: Polygon): boolean {
  return signedArea(polygon) > 0;
}

/** Return a copy of the ring wound counter-clockwise. */
export function ensureCounterClockwise(polygon: Polygon): Polygon {
  return isCounterClockwise(polygon) ? polygon.slice() : polygon.slice().reverse();
}

/** Total length of a polyline in plan units. */
export function polylineLength(line: Polyline): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    total += distance(line[i - 1], line[i]);
  }
  return total;
}

/** Perimeter of a closed polygon in plan units (includes the closing edge). */
export function perimeter(polygon: Polygon): number {
  const n = polygon.length;
  if (n < 2) {return 0;}
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += distance(polygon[i], polygon[(i + 1) % n]);
  }
  return total;
}

/** Area-weighted centroid of a polygon. Falls back to the vertex mean if degenerate. */
export function centroid(polygon: Polygon): Point {
  const n = polygon.length;
  if (n === 0) {return { x: 0, y: 0 };}
  if (n < 3) {return vertexMean(polygon);}

  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const p0 = polygon[i];
    const p1 = polygon[(i + 1) % n];
    const f = p0.x * p1.y - p1.x * p0.y;
    cx += (p0.x + p1.x) * f;
    cy += (p0.y + p1.y) * f;
    a += f;
  }
  a *= 0.5;
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

function vertexMean(points: Point[]): Point {
  if (points.length === 0) {return { x: 0, y: 0 };}
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < points.length; i++) {
    sx += points[i].x;
    sy += points[i].y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

/** Axis-aligned bounding box of a set of points. Returns a zero box if empty. */
export function bounds(points: Point[]): Bounds {
  if (points.length === 0) {return { minX: 0, minY: 0, maxX: 0, maxY: 0 };}
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) {minX = p.x;}
    if (p.y < minY) {minY = p.y;}
    if (p.x > maxX) {maxX = p.x;}
    if (p.y > maxY) {maxY = p.y;}
  }
  return { minX, minY, maxX, maxY };
}

/** Merge several bounds into one that contains them all. */
export function unionBounds(boxes: Bounds[]): Bounds | null {
  if (boxes.length === 0) {return null;}
  let minX = boxes[0].minX;
  let minY = boxes[0].minY;
  let maxX = boxes[0].maxX;
  let maxY = boxes[0].maxY;
  for (let i = 1; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.minX < minX) {minX = b.minX;}
    if (b.minY < minY) {minY = b.minY;}
    if (b.maxX > maxX) {maxX = b.maxX;}
    if (b.maxY > maxY) {maxY = b.maxY;}
  }
  return { minX, minY, maxX, maxY };
}

/** Center point of a bounding box. */
export function boundsCenter(b: Bounds): Point {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

/**
 * Point-in-polygon test using the ray-casting (even-odd) rule. Points exactly
 * on an edge are considered inside.
 */
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  const n = polygon.length;
  if (n < 3) {return false;}
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (pointOnSegment(point, pi, pj)) {return true;}
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) {inside = !inside;}
  }
  return inside;
}

/** `true` if `p` lies on the segment `a`–`b` within {@link GEOMETRY_EPSILON}. */
export function pointOnSegment(p: Point, a: Point, b: Point): boolean {
  const crossProduct = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
  if (Math.abs(crossProduct) > GEOMETRY_EPSILON * Math.max(1, distance(a, b))) {return false;}
  const dotProduct = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  if (dotProduct < 0) {return false;}
  const squaredLen = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  return dotProduct <= squaredLen;
}

/** Closest point to `p` on the segment `a`–`b`. */
export function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < GEOMETRY_EPSILON) {return { x: a.x, y: a.y };}

  const apx = p.x - a.x;
  const apy = p.y - a.y;
  let t = (apx * abx + apy * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return { x: a.x + abx * t, y: a.y + aby * t };
}

/**
 * Offset (inset/outset) a simple polygon by `d` plan units. A positive `d`
 * insets a counter-clockwise ring inward — the operation setbacks rely on.
 * This is a straight-skeleton-free approximation adequate for convex-ish
 * planning polygons; returns `null` if the result collapses.
 */
export function offsetPolygon(polygon: Polygon, d: number): Polygon | null {
  const ring = ensureCounterClockwise(polygon);
  const n = ring.length;
  if (n < 3) {return null;}

  const offsetEdges: { p: Point; dir: Point }[] = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const edge = normalize(subtract(b, a));
    // Inward normal for a CCW ring points to the left of the edge direction.
    const normal = { x: -edge.y, y: edge.x };
    offsetEdges.push({
      p: { x: a.x + normal.x * d, y: a.y + normal.y * d },
      dir: edge,
    });
  }

  const result: Polygon = [];
  for (let i = 0; i < n; i++) {
    const prev = offsetEdges[(i - 1 + n) % n];
    const curr = offsetEdges[i];
    const intersection = lineIntersection(prev.p, prev.dir, curr.p, curr.dir);
    if (!intersection) {return null;}
    result.push(intersection);
  }

  // A valid inset keeps the ring's winding and each edge's direction. When the
  // offset consumes the polygon, an edge reverses (an "edge event"): the vector
  // from result[i] to result[i+1] no longer aligns with its source edge.
  for (let i = 0; i < n; i++) {
    const edgeVec = subtract(result[(i + 1) % n], result[i]);
    if (dot(edgeVec, offsetEdges[i].dir) <= GEOMETRY_EPSILON) {return null;}
  }

  if (area(result) < GEOMETRY_EPSILON) {return null;}
  if (isCounterClockwise(result) !== isCounterClockwise(ring)) {return null;}
  return result;
}

/** Intersection of two infinite lines given as point + direction. `null` if parallel. */
function lineIntersection(p1: Point, d1: Point, p2: Point, d2: Point): Point | null {
  const denom = cross(d1, d2);
  if (Math.abs(denom) < GEOMETRY_EPSILON) {return null;}
  const diff = subtract(p2, p1);
  const t = cross(diff, d2) / denom;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

/** Compass bearing (0° = +Y/north, clockwise) from `a` to `b`, in degrees. */
export function bearing(a: Point, b: Point): number {
  const angle = Math.atan2(b.x - a.x, b.y - a.y) * (180 / Math.PI);
  return (angle + 360) % 360;
}

/** Translate every point of a polygon by a vector. */
export function translatePolygon(polygon: Polygon, delta: Point): Polygon {
  return polygon.map((p) => add(p, delta));
}

/** `true` if a polygon is a valid ring (≥3 distinct points, non-zero area). */
export function isValidPolygon(polygon: Polygon): boolean {
  return polygon.length >= 3 && area(polygon) > GEOMETRY_EPSILON;
}
