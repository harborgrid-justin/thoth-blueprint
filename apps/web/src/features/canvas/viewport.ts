import { boundsCenter, type Bounds, type Point } from "@thoth/domain";

/**
 * The canvas viewport: a pan/zoom transform mapping world (plan) coordinates to
 * screen pixels. World coordinates are plan units from {@link SpatialContext};
 * the transform never changes their meaning, only how they are shown.
 *
 * screen = world * zoom + offset
 */
export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 24;

export function worldToScreen(p: Point, v: Viewport): Point {
  return { x: p.x * v.zoom + v.offsetX, y: p.y * v.zoom + v.offsetY };
}

export function screenToWorld(p: Point, v: Viewport): Point {
  return { x: (p.x - v.offsetX) / v.zoom, y: (p.y - v.offsetY) / v.zoom };
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Zoom toward a screen anchor (e.g. the cursor), keeping it fixed in world space. */
export function zoomAt(v: Viewport, anchor: Point, factor: number): Viewport {
  const zoom = clampZoom(v.zoom * factor);
  const worldAnchor = screenToWorld(anchor, v);
  return {
    zoom,
    offsetX: anchor.x - worldAnchor.x * zoom,
    offsetY: anchor.y - worldAnchor.y * zoom,
  };
}

/** Compute a viewport that fits `bounds` within a `width` × `height` viewport. */
export function fitBounds(
  bounds: Bounds,
  width: number,
  height: number,
  padding = 60,
): Viewport {
  const bw = Math.max(1e-6, bounds.maxX - bounds.minX);
  const bh = Math.max(1e-6, bounds.maxY - bounds.minY);
  const zoom = clampZoom(
    Math.min((width - padding * 2) / bw, (height - padding * 2) / bh),
  );
  const center = boundsCenter(bounds);
  const cx = center.x;
  const cy = center.y;
  return {
    zoom,
    offsetX: width / 2 - cx * zoom,
    offsetY: height / 2 - cy * zoom,
  };
}

/**
 * Choose a "nice" world-space grid spacing that renders around `targetPx`
 * pixels apart at the current zoom (1-2-5 progression).
 */
export function niceGridStep(zoom: number, targetPx = 80): number {
  const rawWorld = targetPx / zoom;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawWorld)));
  const residual = rawWorld / magnitude;
  const factor = residual >= 5 ? 5 : residual >= 2 ? 2 : 1;
  return factor * magnitude;
}
