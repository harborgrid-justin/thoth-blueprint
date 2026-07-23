import {
  isSpatialElement,
  resolveAlignment,
  validateAlignmentDesignSpeed,
  type PlanElement,
} from "@thoth/domain";
import { elementMeta, elementColor } from "@/lib/elementMeta";
import { formatArea, formatNumber, formatRatio } from "@/lib/format";
import { formatLength, resolveLengthUnit } from "@/lib/units";
import { pointToSegmentDistance, snapPointToGrid } from "@/lib/math";

export function countCurvedEdges(element: PlanElement): number {
  if (!isSpatialElement(element) || !element.arcs) {
    return 0;
  }
  return Object.values(element.arcs).filter(
    (b) => typeof b === "number" && Math.abs(b) > 1e-4,
  ).length;
}

export function validateSiteAlignments(alignments: any[] = []) {
  return alignments
    .map((align) => {
      const resolved = resolveAlignment(align);
      if (!resolved) {
        return null;
      }
      const checks = validateAlignmentDesignSpeed(align, resolved);
      const speed = align.designSpeed ?? 35;
      const violations = checks.filter((c) => c.isViolation);
      return { align, resolved, speed, violations };
    })
    .filter(Boolean);
}

export function getElementDisplayInfo(
  element: PlanElement,
  spatial: any,
  pref: any,
) {
  const meta = elementMeta(element.kind);
  const color = elementColor(element.kind, (element as any).category);
  const unit = resolveLengthUnit(spatial, pref);
  return { meta, color, unit };
}

export function snapElementPosition(
  p: { x: number; y: number },
  gridSize = 1.0,
) {
  return snapPointToGrid(p, gridSize);
}

export function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return pointToSegmentDistance(p, a, b);
}

export function formatElementSummary(
  element: PlanElement,
  spatial: any,
  areaSqm: number,
) {
  const areaText = formatArea(areaSqm, "sqm");
  const ratioText = formatRatio(areaSqm / 100);
  const lengthText = formatLength(Math.sqrt(areaSqm), spatial, "auto", 1);
  const vertexCount = isSpatialElement(element) ? element.boundary.length : 0;
  const formattedCount = formatNumber(vertexCount);
  return { areaText, ratioText, lengthText, formattedCount };
}

export function updateUnderlayDimension(
  currBounds: { minX: number; maxX: number; minY: number; maxY: number },
  field: "width" | "height" | "centerX" | "centerY",
  val: number,
) {
  let cx = (currBounds.minX + currBounds.maxX) / 2;
  let cy = (currBounds.minY + currBounds.maxY) / 2;
  let w = currBounds.maxX - currBounds.minX;
  let h = currBounds.maxY - currBounds.minY;

  if (field === "width") {w = val;}
  else if (field === "height") {h = val;}
  else if (field === "centerX") {cx = val;}
  else if (field === "centerY") {cy = val;}

  return {
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minY: cy - h / 2,
    maxY: cy + h / 2,
  };
}

