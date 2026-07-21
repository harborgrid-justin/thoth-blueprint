import type { Point } from "../types/index";

/** Distance between two points in plan coordinates. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Midpoint between two points. */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Linear interpolation between scalar values. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
