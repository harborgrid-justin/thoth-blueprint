import {
  buildableEnvelope,
  centroid,
  densifyBoundary,
  measuredArea,
  type PlanElement,
  type Point,
  type Polygon,
  type SpatialContext,
} from "@thoth/domain";
import { elementColor } from "@/lib/elementMeta";
import { formatArea } from "@/lib/format";
import { patternFor } from "../patterns";
import { worldToScreen, type Viewport } from "./viewport";
import { toPath } from "./canvasHelpers";

export interface PointElementStyle {
  canopyFill: string;
  canopyStroke: string;
  spotFill: string;
  noteFill: string;
}

export function getPointElementStyle(
  renovationMode: boolean,
  renovationStatus: string,
) {
  let canopyFill = "#22c55e";
  let canopyStroke = "#16a34a";
  let spotFill = "#d97706";
  let noteFill = "#eab308";

  if (renovationMode) {
    if (renovationStatus === "new") {
      canopyFill = "#22c55e";
      canopyStroke = "#22c55e";
      spotFill = "#22c55e";
      noteFill = "#22c55e";
    } else if (renovationStatus === "demolished") {
      canopyFill = "#ef4444";
      canopyStroke = "#ef4444";
      spotFill = "#ef4444";
      noteFill = "#ef4444";
    }
  }

  return { canopyFill, canopyStroke, spotFill, noteFill };
}

export interface ShapeStyle {
  boundary: Point[];
  displayRing: Point[];
  color: string;
  path: string;
  isLine: boolean;
  fillOpacity: number;
  dash?: string;
  label: string | null;
  center: Point | null;
  areaLabel: string | null;
  envelopePath: string | null;
  patternId: string | null;
  strokeColor: string;
  strokeDash?: string;
  strokeWidth: number;
  fillOpacityOverride: number;
  elementColorOverride: string;
}

export function computeElementShapeStyle(
  element: PlanElement,
  viewport: Viewport,
  selected: boolean,
  hovered: boolean | undefined,
  showLabels: boolean,
  spatialUnits: SpatialContext,
  moveDelta?: Point,
  overrideBoundary?: Polygon,
  renovationMode?: boolean,
): ShapeStyle {
  const shift = moveDelta ?? { x: 0, y: 0 };
  const boundary = (
    (overrideBoundary ?? (element as any).boundary) as Point[]
  ).map((p) => ({
    x: p.x + shift.x,
    y: p.y + shift.y,
  }));

  const elem = element as any;
  const hasArc = !!elem.arcs && Object.keys(elem.arcs).length > 0;
  const displayRing = hasArc
    ? densifyBoundary(boundary, elem.arcs, 2)
    : boundary;
  const category = element.kind === "landuse" ? element.category : undefined;
  const color = elementColor(element.kind, category);
  const path = toPath(displayRing, viewport);
  const isLine = element.kind === "row";

  const fillOpacity =
    element.kind === "building"
      ? 0.65
      : element.kind === "water"
        ? 0.5
        : element.kind === "landuse" || element.kind === "planting"
          ? 0.32
          : element.kind === "grade"
            ? 0.2
            : element.kind === "region" || element.kind === "easement"
              ? 0.06
              : 0.14;

  const dash =
    element.kind === "zone"
      ? "6 4"
      : element.kind === "region"
        ? "10 6"
        : element.kind === "grade"
          ? "4 3"
          : element.kind === "easement"
            ? "7 3 2 3"
            : undefined;

  const label = showLabels && viewport.zoom > 1.4 ? (elem.name ?? null) : null;
  const center = label ? worldToScreen(centroid(boundary), viewport) : null;
  const areaLabel =
    label && viewport.zoom > 3.5
      ? formatArea(measuredArea(displayRing, spatialUnits, "sqm"), "sqm")
      : null;

  let envelopePath: string | null = null;
  if (
    element.kind === "lot" &&
    (element as any).setback &&
    (element as any).setback > 0
  ) {
    const shiftedLot = { ...element, boundary } as any;
    const env = buildableEnvelope(shiftedLot);
    if (env) {
      envelopePath = toPath(env, viewport);
    }
  }

  const patternId = isLine ? null : patternFor(element);

  let strokeColor = selected
    ? "hsl(var(--primary))"
    : hovered
      ? "hsl(var(--primary))" // AutoCAD uses a thick blue or white for hover preview
      : color;
  let strokeDash = dash;
  const strokeWidth = selected
    ? 2.5
    : hovered
      ? 4.0 // boldly thicken instantly before clicking
      : element.kind === "building"
        ? 1.5
        : 1.75;
  let fillOpacityOverride = isLine ? 0.25 : fillOpacity;
  if (hovered && !isLine) {
    fillOpacityOverride = Math.min(1.0, fillOpacity * 1.5);
  }
  let elementColorOverride = color;

  const renovationStatus = element.renovationStatus || "existing";
  if (renovationMode) {
    if (renovationStatus === "new") {
      strokeColor = "#22c55e";
      elementColorOverride = "#22c55e";
      fillOpacityOverride = isLine ? 0.35 : Math.max(0.18, fillOpacity * 0.7);
    } else if (renovationStatus === "demolished") {
      strokeColor = "#ef4444";
      strokeDash = "3 3";
      elementColorOverride = "#ef4444";
      fillOpacityOverride = isLine ? 0.15 : fillOpacity * 0.4;
    }
  }

  return {
    boundary,
    displayRing,
    color,
    path,
    isLine,
    fillOpacity,
    dash,
    label,
    center,
    areaLabel,
    envelopePath,
    patternId,
    strokeColor,
    strokeDash,
    strokeWidth,
    fillOpacityOverride,
    elementColorOverride,
  };
}
