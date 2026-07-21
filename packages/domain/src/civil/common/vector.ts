import type { Point } from "../../spatial/geometry";

/** Azimuth (deg clockwise from north, north = −Y) of direction `d`. */
export function azimuthOf(d: Point): number {
  const deg = (Math.atan2(d.x, -d.y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Left normal unit vector rotated +90 degrees. */
export function leftNormal(dir: Point): Point {
  const len = Math.hypot(dir.x, dir.y);
  if (len < 1e-9) {
    return { x: 0, y: 0 };
  }
  return { x: -dir.y / len, y: dir.x / len };
}

/** Right normal unit vector rotated -90 degrees. */
export function rightNormal(dir: Point): Point {
  const len = Math.hypot(dir.x, dir.y);
  if (len < 1e-9) {
    return { x: 0, y: 0 };
  }
  return { x: dir.y / len, y: -dir.x / len };
}

/** Lerp between two scalar numbers. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
