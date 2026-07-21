import type { Point } from "../../spatial/geometry";

/** Left normal unit vector rotated +90 degrees. */
export function leftNormal(dir: Point): Point {
  const len = Math.hypot(dir.x, dir.y);
  if (len < 1e-9) {
    return { x: 0, y: 0 };
  }
  return { x: -dir.y / len, y: dir.x / len };
}
