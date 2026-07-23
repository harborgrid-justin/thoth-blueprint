import { distance } from "../../spatial/geometry";
import type { Point } from "../../spatial/types";

export function findLongestFrontage(boundary: Point[]): [Point, Point] {
  if (boundary.length < 2) {
    return [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
  }
  let maxLen = 0;
  let frontage: [Point, Point] = [boundary[0], boundary[1]];
  const n = boundary.length;
  for (let i = 0; i < n; i++) {
    const p1 = boundary[i];
    const p2 = boundary[(i + 1) % n];
    const len = distance(p1, p2);
    if (len > maxLen) {
      maxLen = len;
      frontage = [p1, p2];
    }
  }
  return frontage;
}
