import {
  isSpatialElement,
  type Polygon,
  type SpatialContext,
} from "@thoth/domain";
import { formatDirection, formatLength, type LengthUnitPref, type AngleFormat } from "@/lib/units";
import { worldToScreen, type Viewport } from "./viewport";

export interface LabelConfig {
  key: string;
  x: number;
  y: number;
  angle: number;
  fontSize: number;
  translateY: number;
  strokeWidth: number;
  label: string;
}

const DIMENSION_KINDS = new Set(["parcel", "lot", "openspace", "easement", "row", "zone"]);

export function computeBoundaryDimensions(
  elements: any[],
  spatial: SpatialContext,
  viewport: Viewport,
  lengthPref: LengthUnitPref,
  angleFormat: AngleFormat
): LabelConfig[] {
  if (viewport.zoom < 2) {return [];}

  const items = elements.filter((e) => isSpatialElement(e) && DIMENSION_KINDS.has(e.kind));
  const labels: LabelConfig[] = [];

  for (const el of items) {
    if (!isSpatialElement(el)) {continue;}
    const boundary = el.boundary;
    const n = boundary.length;
    for (let i = 0; i < n; i++) {
      const a = boundary[i];
      const b = boundary[(i + 1) % n];
      const sa = worldToScreen(a, viewport);
      const sb = worldToScreen(b, viewport);
      const lenPx = Math.hypot(sb.x - sa.x, sb.y - sa.y);
      if (lenPx < 42) {continue;}
      const bulge = el.arcs ? el.arcs[String(i)] : 0;
      const mid = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
      let angle = (Math.atan2(sb.y - sa.y, sb.x - sa.x) * 180) / Math.PI;
      if (angle > 90 || angle < -90) {angle += 180;}
      const planLen = Math.hypot(b.x - a.x, b.y - a.y);
      const dist = formatLength(planLen, spatial, lengthPref);
      const label = bulge ? `⌒ ${dist}` : `${formatDirection(a, b, angleFormat)}  ${dist}`;

      labels.push({
        key: `${el.id}-${i}`,
        x: mid.x,
        y: mid.y,
        angle,
        fontSize: 8.5,
        translateY: -3,
        strokeWidth: 2.5,
        label,
      });
    }
  }

  return labels;
}

export function computeSurveyEdgeLabels(
  element: any,
  spatial: SpatialContext,
  viewport: Viewport,
  preview: { id: string; boundary: Polygon } | null,
  lengthPref: LengthUnitPref,
  angleFormat: AngleFormat
): LabelConfig[] {
  if (!element || !isSpatialElement(element)) {return [];}
  if (viewport.zoom < 1) {return [];}

  const boundary = preview?.id === element.id ? preview.boundary : element.boundary;
  const n = boundary.length;
  const labels: LabelConfig[] = [];

  for (let i = 0; i < n; i++) {
    const a = boundary[i];
    const b = boundary[(i + 1) % n];
    const sa = worldToScreen(a, viewport);
    const sb = worldToScreen(b, viewport);
    if (Math.hypot(sb.x - sa.x, sb.y - sa.y) < 34) {continue;}
    const mid = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
    let angle = (Math.atan2(sb.y - sa.y, sb.x - sa.x) * 180) / Math.PI;
    if (angle > 90 || angle < -90) {angle += 180;}
    const planLen = Math.hypot(b.x - a.x, b.y - a.y);
    const label = `${formatDirection(a, b, angleFormat)}  ${formatLength(planLen, spatial, lengthPref)}`;

    labels.push({
      key: String(i),
      x: mid.x,
      y: mid.y,
      angle,
      fontSize: 10,
      translateY: -4,
      strokeWidth: 3,
      label,
    });
  }

  return labels;
}
