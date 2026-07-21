import {
  distance,
  dot,
  length,
  closestPointOnSegment,
  bounds,
  type Point,
  type Bounds,
} from "@thoth/domain";

/**
 * Advanced CAD, vector, and snapping mathematics for Thoth Blueprint.
 * Complements the basic spatial functions in the domain package.
 */

/** Angle between two vectors, in radians. */
export function angleBetween(v1: Point, v2: Point): number {
  const d = dot(v1, v2);
  const l1 = length(v1);
  const l2 = length(v2);
  if (l1 < 1e-9 || l2 < 1e-9) {return 0;}
  return Math.acos(Math.max(-1, Math.min(1, d / (l1 * l2))));
}

/** Project vector `v` onto vector `onto`. */
export function projectVector(v: Point, onto: Point): Point {
  const lenSq = onto.x * onto.x + onto.y * onto.y;
  if (lenSq < 1e-9) {return { x: 0, y: 0 };}
  const d = dot(v, onto);
  const factor = d / lenSq;
  return { x: onto.x * factor, y: onto.y * factor };
}

/**
 * Compute the center, radius, start angle, and end angle of an arc passing through 3 points.
 * Returns null if the points are collinear.
 */
export function arcFromThreePoints(
  p1: Point,
  p2: Point,
  p3: Point,
): {
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterClockwise: boolean;
} | null {
  const area2 = p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y);
  if (Math.abs(area2) < 1e-9) {return null;}

  const a = p1.x * p1.x + p1.y * p1.y;
  const b = p2.x * p2.x + p2.y * p2.y;
  const c = p3.x * p3.x + p3.y * p3.y;

  const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  const ux = (a * (p2.y - p3.y) + b * (p3.y - p1.y) + c * (p1.y - p2.y)) / d;
  const uy = (a * (p3.x - p2.x) + b * (p1.x - p3.x) + c * (p2.x - p1.x)) / d;

  const center = { x: ux, y: uy };
  const radius = Math.sqrt((p1.x - ux) ** 2 + (p1.y - uy) ** 2);

  const startAngle = Math.atan2(p1.y - uy, p1.x - ux);
  const endAngle = Math.atan2(p3.y - uy, p3.x - ux);

  // Winding order check via cross-product of segments p1-p2 and p2-p3
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  const cp = v1.x * v2.y - v1.y * v2.x;
  const counterClockwise = cp > 0;

  return { center, radius, startAngle, endAngle, counterClockwise };
}

/** Evaluate a point along a quadratic Bezier curve at parameter `t` [0, 1]. */
export function bezierQuadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/** Evaluate a point along a cubic Bezier curve at parameter `t` [0, 1]. */
export function bezierCubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

/** Snap an angle (in radians) to the nearest multiple of `stepRad`. */
export function snapToAngle(angleRad: number, stepRad: number): number {
  if (stepRad <= 0) {return angleRad;}
  const steps = Math.round(angleRad / stepRad);
  return steps * stepRad;
}

/** Snap coordinates of a point to the nearest grid sizing `size`. */
export function snapPointToGrid(p: Point, size: number): Point {
  if (size <= 0) {return { ...p };}
  return {
    x: Math.round(p.x / size) * size,
    y: Math.round(p.y / size) * size,
  };
}

/** Snap a point `p` to the closest point on segment `a`-`b` if it falls within `snapRadius`. */
export function snapPointToSegment(p: Point, a: Point, b: Point, snapRadius: number): Point | null {
  const cp = closestPointOnSegment(p, a, b);
  if (distance(p, cp) <= snapRadius) {
    return cp;
  }
  return null;
}

/** Compute the intersection between two finite line segments 1-2 and 3-4. */
export function segmentIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-9) {return null;} // Parallel

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }
  return null;
}

/** Shortest distance from a point to a segment. */
export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  return distance(p, closestPointOnSegment(p, a, b));
}

/** Verify if a polygon ring is convex. */
export function polygonIsConvex(poly: Point[]): boolean {
  const n = poly.length;
  if (n < 3) {return false;}
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    const p3 = poly[(i + 2) % n];
    const dx1 = p2.x - p1.x;
    const dy1 = p2.y - p1.y;
    const dx2 = p3.x - p2.x;
    const dy2 = p3.y - p2.y;
    const crossVal = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(crossVal) > 1e-9) {
      const currentSign = Math.sign(crossVal);
      if (sign === 0) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false;
      }
    }
  }
  return true;
}

/** Fast overlap check between a polygon and an Axis-Aligned Bounding Box (AABB). */
export function polyIntersectAABB(poly: Point[], aabb: Bounds): boolean {
  const polyBounds = bounds(poly);
  if (
    polyBounds.maxX < aabb.minX ||
    polyBounds.minX > aabb.maxX ||
    polyBounds.maxY < aabb.minY ||
    polyBounds.minY > aabb.maxY
  ) {
    return false;
  }

  // Check if any polygon vertex is inside AABB
  for (const p of poly) {
    if (p.x >= aabb.minX && p.x <= aabb.maxX && p.y >= aabb.minY && p.y <= aabb.maxY) {
      return true;
    }
  }

  // Check segment intersections
  const aabbCorners = [
    { x: aabb.minX, y: aabb.minY },
    { x: aabb.maxX, y: aabb.minY },
    { x: aabb.maxX, y: aabb.maxY },
    { x: aabb.minX, y: aabb.maxY },
  ];
  const aabbSegments = [
    [aabbCorners[0], aabbCorners[1]],
    [aabbCorners[1], aabbCorners[2]],
    [aabbCorners[2], aabbCorners[3]],
    [aabbCorners[3], aabbCorners[0]],
  ];

  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    for (const [s1, s2] of aabbSegments) {
      if (segmentIntersection(p1, p2, s1, s2)) {
        return true;
      }
    }
  }

  return false;
}
