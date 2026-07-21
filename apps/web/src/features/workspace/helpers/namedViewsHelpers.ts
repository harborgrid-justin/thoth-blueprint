import { formatCoord } from "@/lib/units";
import { formatNumber, formatPercent } from "@/lib/format";

export function promptViewName(): string | null {
  const name = prompt("Enter a name for the current view:");
  return name && name.trim() ? name.trim() : null;
}

export function confirmDeleteView(name: string): boolean {
  return confirm(`Delete named view "${name}"?`);
}

export function formatViewReadout(viewport: { x: number; y: number; zoom: number }) {
  const coordText = formatCoord({ x: viewport.x, y: viewport.y }, "survey", 1);
  const zoomText = formatPercent(viewport.zoom, 0);
  const formattedX = formatNumber(viewport.x, 1);
  const formattedY = formatNumber(viewport.y, 1);
  return { coordText, zoomText, formattedX, formattedY };
}
