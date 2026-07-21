import { formatPercent } from "@/lib/format";
import { formatCoord, formatLength, resolveLengthUnit } from "@/lib/units";

export function zoomPercentage(zoom: number): number {
  return Math.round(zoom * 100);
}

export function formatZoomReadout(zoom: number): string {
  return formatPercent(zoom, 0);
}

export function formatViewportCenterReadout(viewport: { x: number; y: number }, spatial: any) {
  const coordText = formatCoord({ x: viewport.x, y: viewport.y }, "survey", 1);
  const lengthText = formatLength(Math.hypot(viewport.x, viewport.y), spatial, "auto", 1);
  const unit = resolveLengthUnit(spatial, "auto");
  return { coordText, lengthText, unit };
}
