import { boundaryArea } from "../../spatial/curve";
import type { Point } from "../../spatial/types";
import { bearingToAzimuth } from "../survey";

export interface CourseRow {
  id: string;
  ns: "N" | "S";
  deg: number;
  min: number;
  sec: number;
  ew: "E" | "W";
  distance: number;
  isCurve: boolean;
  arcLength: number;
  radius: number;
}

export const DEFAULT_COURSES: CourseRow[] = [
  { id: "c1", ns: "N", deg: 3, min: 52, sec: 8, ew: "E", distance: 178.64, isCurve: false, arcLength: 0, radius: 0 },
  { id: "c2", ns: "N", deg: 81, min: 44, sec: 15, ew: "E", distance: 82.79, isCurve: false, arcLength: 0, radius: 0 },
  { id: "c3", ns: "S", deg: 9, min: 56, sec: 35, ew: "E", distance: 189.40, isCurve: false, arcLength: 0, radius: 0 },
  { id: "c4", ns: "N", deg: 86, min: 7, sec: 52, ew: "W", distance: 16.99, isCurve: true, arcLength: 110.05, radius: 498.00 },
];

export function computeMetesAndBoundsGeometry(
  courses: CourseRow[],
  pobX = 0,
  pobY = 0,
) {
  const pts: Point[] = [{ x: pobX, y: pobY }];
  const edgeArcs: Record<number, number> = {};
  let current = { x: pobX, y: pobY };
  let perimeter = 0;

  courses.forEach((c, idx) => {
    const az = bearingToAzimuth({ ns: c.ns, degrees: c.deg, minutes: c.min, seconds: c.sec, ew: c.ew });
    const rad = (az * Math.PI) / 180;
    const dx = c.distance * Math.sin(rad);
    const dy = -c.distance * Math.cos(rad);

    current = { x: current.x + dx, y: current.y + dy };
    perimeter += c.distance;

    if (idx < courses.length - 1) {
      pts.push(current);
    }
  });

  const isClosed = Math.hypot(current.x - pobX, current.y - pobY) < 0.05;
  const closedPts = isClosed ? pts : [...pts, pts[0]];
  const area = boundaryArea(closedPts);
  const closureErr = Math.hypot(current.x - pobX, current.y - pobY);

  return {
    boundary: pts,
    arcs: edgeArcs,
    totalPerimeter: perimeter,
    calculatedAreaSqFt: area,
    closureError: closureErr,
  };
}
