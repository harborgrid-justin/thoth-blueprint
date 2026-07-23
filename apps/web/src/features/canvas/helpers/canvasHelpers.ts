import {
  bulgeThroughCursor,
  edgeMidpoint,
  orderedVisibleElements,
  padBounds,
  slopeColor,
  type Point,
  type Polygon,
} from "@thoth/domain";
import { type Viewport, worldToScreen } from "./viewport";
import { pointToSegmentDistance } from "@/lib/math";

export {
  bulgeThroughCursor,
  edgeMidpoint,
  orderedVisibleElements,
  padBounds,
  slopeColor,
};

/** Shortest distance from point `p` to segment `a`–`b`, in the same space. */
export function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  return pointToSegmentDistance(p, a, b);
}

export function toPath(boundary: Polygon, viewport: Viewport): string {
  return (
    boundary
      .map((p, i) => {
        const s = worldToScreen(p, viewport);
        return `${i === 0 ? "M" : "L"}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

export function uniq<T>(arr: T[]): T[] {
  const out: T[] = [];
  for (const x of arr) {
    if (!out.includes(x)) {
      out.push(x);
    }
  }
  return out;
}
