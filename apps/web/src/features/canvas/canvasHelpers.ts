import {
  add,
  bulgeToArc,
  dot,
  length,
  normalize,
  scale,
  subtract,
  type Bounds,
  type Point,
  type Polygon,
  type Site,
} from "@thoth/domain";
import { type Viewport, worldToScreen } from "./viewport";

/** Midpoint of an edge, honoring an existing bulge (the arc's midpoint). */
export function edgeMidpoint(a: Point, b: Point, bulge: number): Point {
  if (bulge) {
    const arc = bulgeToArc(a, b, bulge);
    if (arc) {
      return arc.mid;
    }
  }
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** The bulge that makes edge a→b pass through the cursor at its midpoint. */
export function bulgeThroughCursor(a: Point, b: Point, cursor: Point): number {
  const d = subtract(b, a);
  const len = length(d);
  if (len < 1e-6) {
    return 0;
  }
  const edge = normalize(d);
  const normal = { x: -edge.y, y: edge.x };
  const mid = scale(add(a, b), 0.5);
  const off = dot(subtract(cursor, mid), normal);
  return (2 * off) / len;
}

/** Elements paired with their layer, ordered back-to-front, hidden layers dropped. */
export function orderedVisibleElements(site: Site) {
  const layerById = new Map(site.layers.map((l) => [l.id, l]));
  return site.elements
    .map((element, index) => ({ element, layer: layerById.get(element.layerId), index }))
    .filter((entry) => entry.layer && entry.layer.visible)
    .sort((a, b) => {
      const lo = (a.layer!.order ?? 0) - (b.layer!.order ?? 0);
      return lo !== 0 ? lo : a.index - b.index;
    });
}

/** Shortest distance from point `p` to segment `a`–`b`, in the same space. */
export function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Expand a bounds by a margin so a tight or zero-size selection keeps context. */
export function padBounds(b: Bounds): Bounds {
  const pad = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.15 || 10;
  return { minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad };
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

/** Hypsometric tint ramp for terrain slope visualization. */
export function slopeColor(percent: number): string {
  if (percent < 5) {
    return "#10b981"; // 0-5% gentle green
  }
  if (percent < 15) {
    return "#f59e0b"; // 5-15% moderate yellow
  }
  if (percent < 25) {
    return "#f97316"; // 15-25% steep orange
  }
  return "#ef4444"; // >25% severe red
}
