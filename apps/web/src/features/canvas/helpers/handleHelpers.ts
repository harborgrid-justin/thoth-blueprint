import {
  edgeBulge,
  isSpatialElement,
  type Polygon,
  type Point,
} from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";
import { edgeMidpoint } from "./canvasHelpers";

export function getAlignmentHandlesPoints(
  site: any,
  selection: string[],
  viewport: Viewport,
): Point[] {
  if (selection.length !== 1) {
    return [];
  }
  const align = site.alignments?.find((a: any) => a.id === selection[0]);
  if (!align) {
    return [];
  }
  return align.pis.map((pi: any) => worldToScreen(pi.point, viewport));
}

export function getVertexHandlesPoints(
  site: any,
  selection: string[],
  viewport: Viewport,
  preview: { id: string; boundary: Polygon } | null,
): Point[] {
  if (selection.length !== 1) {
    return [];
  }
  const element = site.elements.find((e: any) => e.id === selection[0]);
  if (!element || !isSpatialElement(element)) {
    return [];
  }
  const boundary =
    preview?.id === element.id ? preview.boundary : element.boundary;
  return boundary.map((v) => worldToScreen(v, viewport));
}

export interface EdgeHandleInfo {
  x: number;
  y: number;
  bulge: number;
}

export function getEdgeHandlesPoints(
  site: any,
  selection: string[],
  viewport: Viewport,
): EdgeHandleInfo[] {
  if (selection.length !== 1) {
    return [];
  }
  const element = site.elements.find((e: any) => e.id === selection[0]);
  if (!element || !isSpatialElement(element)) {
    return [];
  }
  const ring = element.boundary;
  return ring.map((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const bulge = edgeBulge(element.arcs, i);
    const s = worldToScreen(edgeMidpoint(a, b, bulge), viewport);
    return { x: s.x, y: s.y, bulge };
  });
}
