import { type Point, type SpatialContext } from "@thoth/domain";
import { formatDirection, formatLength, type LengthUnitPref, type AngleFormat } from "@/lib/units";
import { worldToScreen, type Viewport } from "./viewport";

export interface DraftPointsResult {
  screenPts: Point[];
  polyString: string;
  firstScreen: Point;
  cursorScreen: Point | null;
}

export function computeDraftPoints(
  draft: Point[],
  cursor: Point | null,
  viewport: Viewport
): DraftPointsResult {
  const pts = cursor ? [...draft, cursor] : draft;
  const screenPts = pts.map((p) => worldToScreen(p, viewport));
  const polyString = screenPts.map((s) => `${s.x},${s.y}`).join(" ");
  const firstScreen = worldToScreen(draft[0], viewport);
  const cursorScreen = cursor ? worldToScreen(cursor, viewport) : null;

  return { screenPts, polyString, firstScreen, cursorScreen };
}

export interface MeasureReadoutResult {
  screen: Point[];
  anchor: Point;
  polyString: string;
  readout: string;
  isSinglePoint: boolean;
}

export function computeMeasureReadout(
  points: Point[],
  cursor: Point | null,
  viewport: Viewport,
  spatial: SpatialContext,
  lengthPref: LengthUnitPref,
  angleFormat: AngleFormat
): MeasureReadoutResult {
  const pts = cursor ? [...points, cursor] : points;
  const screen = pts.map((p) => worldToScreen(p, viewport));

  if (pts.length < 2) {
    return {
      screen,
      anchor: screen[0],
      polyString: "",
      readout: "",
      isSinglePoint: true,
    };
  }

  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const bearing = formatDirection(prev, last, angleFormat);
  const readout = `${formatLength(total, spatial, lengthPref)} · ${bearing}`;
  const anchor = screen[screen.length - 1];
  const polyString = screen.map((s) => `${s.x},${s.y}`).join(" ");

  return { screen, anchor, polyString, readout, isSinglePoint: false };
}
