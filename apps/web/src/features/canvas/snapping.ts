import { isSpatialElement, type PlanElement, type Point } from "@thoth/domain";
import { screenToWorld, worldToScreen, type Viewport } from "./viewport";

export interface SnapResult {
  point: Point;
  /** Whether the point snapped to an existing vertex (vs. the grid or nothing). */
  snappedToVertex: boolean;
}

/** Round a world point to the nearest grid intersection. */
export function snapToGrid(p: Point, step: number): Point {
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
}

/**
 * Snap a world point, preferring a nearby existing vertex (within
 * `vertexPx` screen pixels) and otherwise falling back to the grid.
 */
export function snapPoint(
  world: Point,
  screen: Point,
  viewport: Viewport,
  elements: PlanElement[],
  options: { gridStep: number; snapToGrid: boolean; snapToVertices: boolean; vertexPx?: number },
): SnapResult {
  const vertexPx = options.vertexPx ?? 10;

  if (options.snapToVertices) {
    let best: Point | null = null;
    let bestDist = vertexPx;
    for (const el of elements) {
      if (!isSpatialElement(el)) continue;
      for (const v of el.boundary) {
        const s = worldToScreen(v, viewport);
        const d = Math.hypot(s.x - screen.x, s.y - screen.y);
        if (d < bestDist) {
          bestDist = d;
          best = v;
        }
      }
    }
    if (best) return { point: best, snappedToVertex: true };
  }

  if (options.snapToGrid) {
    return { point: snapToGrid(world, options.gridStep), snappedToVertex: false };
  }
  return { point: world, snappedToVertex: false };
}

/** Convert a raw client-space event position into world coordinates. */
export function eventToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: Viewport,
): Point {
  return screenToWorld({ x: clientX - rect.left, y: clientY - rect.top }, viewport);
}
