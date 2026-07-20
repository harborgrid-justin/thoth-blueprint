/**
 * Dimensioning — dimension styles and dimension entities, with the geometry a
 * renderer needs to draw witness/extension lines, the dimension line, arrowheads
 * or ticks, and the measurement text. Values are computed in model space and
 * reported in a real-world display unit via the plan's {@link SpatialContext}.
 *
 * Supported kinds: linear (horizontal/vertical), aligned, angular, radial,
 * diameter, ordinate, and arc-length.
 */

import type { Point } from "./geometry";
import { add, distance, normalize, scale, subtract } from "./geometry";
import { METERS_PER_UNIT, type SpatialContext } from "./spatial";

/** Arrowhead terminator style. */
export type DimArrow = "arrow" | "tick" | "dot" | "open";

/** How dimension text is displayed. */
export type DimUnit = "ft-in" | "ft-dec" | "in" | "m" | "cm" | "mm";

/** A named dimension style. */
export interface DimensionStyle {
  id: string;
  label: string;
  arrow: DimArrow;
  /** Text height in paper millimetres. */
  textHeight: number;
  /** Decimal precision for the numeric value. */
  precision: number;
  unit: DimUnit;
  /** Gap between the object and the start of the witness line, model units. */
  extensionGap: number;
  /** How far the witness line extends past the dimension line, model units. */
  extensionBeyond: number;
  /** Suppress a trailing "0 in" / trailing zeros. */
  suppressZero: boolean;
}

/** Default dimension styles (architectural ticks, engineering arrows, metric). */
export const DEFAULT_DIM_STYLES: DimensionStyle[] = [
  {
    id: "arch-tick",
    label: "Architectural (tick)",
    arrow: "tick",
    textHeight: 2.5,
    precision: 0,
    unit: "ft-in",
    extensionGap: 0.5,
    extensionBeyond: 0.5,
    suppressZero: true,
  },
  {
    id: "eng-arrow",
    label: "Engineering (arrow)",
    arrow: "arrow",
    textHeight: 2.5,
    precision: 2,
    unit: "ft-dec",
    extensionGap: 1,
    extensionBeyond: 1,
    suppressZero: false,
  },
  {
    id: "metric",
    label: "Metric (arrow)",
    arrow: "arrow",
    textHeight: 2.5,
    precision: 0,
    unit: "mm",
    extensionGap: 1,
    extensionBeyond: 1,
    suppressZero: true,
  },
];

const STYLE_BY_ID = new Map(DEFAULT_DIM_STYLES.map((s) => [s.id, s]));

/** Look up a dimension style (falls back to architectural ticks). */
export function dimensionStyle(id: string): DimensionStyle {
  return STYLE_BY_ID.get(id) ?? DEFAULT_DIM_STYLES[0];
}

/** A dimension entity, tagged by kind. All anchor points are in model space. */
export type Dimension =
  | LinearDimension
  | AlignedDimension
  | AngularDimension
  | RadialDimension
  | OrdinateDimension
  | ArcLengthDimension;

interface DimBase {
  id: string;
  styleId: string;
  /** Optional text override (e.g. "EQ", "VIF"); replaces the measured value. */
  textOverride?: string;
}

/** Horizontal or vertical distance between two points. */
export interface LinearDimension extends DimBase {
  kind: "linear";
  a: Point;
  b: Point;
  axis: "horizontal" | "vertical";
  /** Perpendicular offset of the dimension line from the points, model units. */
  offset: number;
}

/** True (aligned) distance between two points. */
export interface AlignedDimension extends DimBase {
  kind: "aligned";
  a: Point;
  b: Point;
  offset: number;
}

/** Angle at `vertex` between rays to `a` and `b`. */
export interface AngularDimension extends DimBase {
  kind: "angular";
  vertex: Point;
  a: Point;
  b: Point;
  /** Radius of the dimension arc, model units. */
  radius: number;
}

/** Radius (or diameter) of an arc/circle. */
export interface RadialDimension extends DimBase {
  kind: "radial";
  center: Point;
  edge: Point;
  diameter?: boolean;
}

/** Ordinate (X or Y offset from a datum). */
export interface OrdinateDimension extends DimBase {
  kind: "ordinate";
  datum: Point;
  point: Point;
  axis: "x" | "y";
  /** Leader length to the text, model units. */
  leader: number;
}

/** Arc length along a curved edge. */
export interface ArcLengthDimension extends DimBase {
  kind: "arclength";
  center: Point;
  start: Point;
  end: Point;
  radius: number;
  offset: number;
}

/** The drawable pieces of a dimension, in model space (renderer projects them). */
export interface DimensionGeometry {
  /** Line segments (witness lines + dimension line / arc chords). */
  lines: [Point, Point][];
  /** Arrow/tick placements with an outward direction. */
  ticks: { at: Point; dir: Point }[];
  /** Where the measurement text is anchored. */
  textAt: Point;
  /** Text baseline rotation, degrees. */
  textAngleDeg: number;
}

/** The measured value, formatted label, and drawable geometry of a dimension. */
export interface MeasuredDimension {
  value: number;
  label: string;
  geometry: DimensionGeometry;
}

/** Real-world length (in style unit) of a model-space distance. */
function toDisplayLength(modelDist: number, spatial: SpatialContext, unit: DimUnit): number {
  const meters = modelDist * METERS_PER_UNIT[spatial.units];
  switch (unit) {
    case "m":
      return meters;
    case "cm":
      return meters * 100;
    case "mm":
      return meters * 1000;
    case "in":
      return meters / 0.0254;
    case "ft-in":
    case "ft-dec":
      return meters / 0.3048;
  }
}

/** Format a length value per a dimension style. */
export function formatDimText(modelDist: number, style: DimensionStyle, spatial: SpatialContext): string {
  const v = toDisplayLength(modelDist, spatial, style.unit);
  switch (style.unit) {
    case "ft-in": {
      const totalIn = v * 12;
      let ft = Math.floor(totalIn / 12);
      let inch = Math.round(totalIn - ft * 12);
      if (inch === 12) {
        ft += 1;
        inch = 0;
      }
      if (style.suppressZero && inch === 0) return `${ft}'`;
      return `${ft}'-${inch}"`;
    }
    case "ft-dec":
      return `${v.toFixed(style.precision)}'`;
    case "in":
      return `${v.toFixed(style.precision)}"`;
    case "m":
      return `${v.toFixed(style.precision)} m`;
    case "cm":
      return `${v.toFixed(style.precision)} cm`;
    case "mm":
      return `${v.toFixed(style.precision)} mm`;
  }
}

/** Perpendicular (left normal) unit vector of a direction. */
function leftNormal(dir: Point): Point {
  return { x: -dir.y, y: dir.x };
}

/**
 * Measure a dimension: its numeric value, formatted label, and model-space
 * geometry. Angular values are in degrees; all others are display lengths.
 */
export function measureDimension(dim: Dimension, spatial: SpatialContext): MeasuredDimension {
  const style = dimensionStyle(dim.styleId);
  switch (dim.kind) {
    case "linear":
      return measureLinear(dim, style, spatial);
    case "aligned":
      return measureAligned(dim, style, spatial);
    case "angular":
      return measureAngular(dim, style);
    case "radial":
      return measureRadial(dim, style, spatial);
    case "ordinate":
      return measureOrdinate(dim, style, spatial);
    case "arclength":
      return measureArcLength(dim, style, spatial);
  }
}

function measureAligned(dim: AlignedDimension, style: DimensionStyle, spatial: SpatialContext): MeasuredDimension {
  const dir = normalize(subtract(dim.b, dim.a));
  const n = leftNormal(dir);
  const off = scale(n, dim.offset);
  const a2 = add(dim.a, off);
  const b2 = add(dim.b, off);
  const value = distance(dim.a, dim.b);
  const gap = scale(n, Math.sign(dim.offset || 1) * style.extensionGap);
  const beyond = scale(n, dim.offset + Math.sign(dim.offset || 1) * style.extensionBeyond);
  return {
    value,
    label: dim.textOverride ?? formatDimText(value, style, spatial),
    geometry: {
      lines: [
        [add(dim.a, gap), add(dim.a, beyond)],
        [add(dim.b, gap), add(dim.b, beyond)],
        [a2, b2],
      ],
      ticks: [
        { at: a2, dir },
        { at: b2, dir: scale(dir, -1) },
      ],
      textAt: add(scale(add(a2, b2), 0.5), scale(n, 0.6)),
      textAngleDeg: (Math.atan2(dir.y, dir.x) * 180) / Math.PI,
    },
  };
}

function measureLinear(dim: LinearDimension, style: DimensionStyle, spatial: SpatialContext): MeasuredDimension {
  const dir = dim.axis === "horizontal" ? { x: 1, y: 0 } : { x: 0, y: 1 };
  const n = leftNormal(dir);
  // Project both points onto the dimension line at the offset.
  const base = dim.axis === "horizontal" ? Math.max(dim.a.y, dim.b.y) : Math.max(dim.a.x, dim.b.x);
  const lineCoord = base + dim.offset;
  const a2 = dim.axis === "horizontal" ? { x: dim.a.x, y: lineCoord } : { x: lineCoord, y: dim.a.y };
  const b2 = dim.axis === "horizontal" ? { x: dim.b.x, y: lineCoord } : { x: lineCoord, y: dim.b.y };
  const value = dim.axis === "horizontal" ? Math.abs(dim.b.x - dim.a.x) : Math.abs(dim.b.y - dim.a.y);
  const segDir = normalize(subtract(b2, a2));
  return {
    value,
    label: dim.textOverride ?? formatDimText(value, style, spatial),
    geometry: {
      lines: [
        [dim.a, a2],
        [dim.b, b2],
        [a2, b2],
      ],
      ticks: [
        { at: a2, dir: segDir },
        { at: b2, dir: scale(segDir, -1) },
      ],
      textAt: add(scale(add(a2, b2), 0.5), scale(n, 0.6)),
      textAngleDeg: dim.axis === "horizontal" ? 0 : -90,
    },
  };
}

function measureAngular(dim: AngularDimension, style: DimensionStyle): MeasuredDimension {
  const va = subtract(dim.a, dim.vertex);
  const vb = subtract(dim.b, dim.vertex);
  const angA = Math.atan2(va.y, va.x);
  const angB = Math.atan2(vb.y, vb.x);
  let sweep = angB - angA;
  while (sweep <= -Math.PI) sweep += 2 * Math.PI;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  const deg = Math.abs((sweep * 180) / Math.PI);
  const mid = angA + sweep / 2;
  const r = dim.radius;
  const arcPts: Point[] = [];
  const steps = Math.max(2, Math.ceil(deg / 5));
  for (let i = 0; i <= steps; i++) {
    const t = angA + (sweep * i) / steps;
    arcPts.push({ x: dim.vertex.x + r * Math.cos(t), y: dim.vertex.y + r * Math.sin(t) });
  }
  const lines: [Point, Point][] = [];
  for (let i = 1; i < arcPts.length; i++) lines.push([arcPts[i - 1], arcPts[i]]);
  lines.push([dim.vertex, { x: dim.vertex.x + r * Math.cos(angA), y: dim.vertex.y + r * Math.sin(angA) }]);
  lines.push([dim.vertex, { x: dim.vertex.x + r * Math.cos(angB), y: dim.vertex.y + r * Math.sin(angB) }]);
  const decimals = Math.max(0, style.precision - 1);
  return {
    value: deg,
    label: dim.textOverride ?? `${deg.toFixed(decimals)}°`,
    geometry: {
      lines,
      ticks: [],
      textAt: { x: dim.vertex.x + (r + 1) * Math.cos(mid), y: dim.vertex.y + (r + 1) * Math.sin(mid) },
      textAngleDeg: 0,
    },
  };
}

function measureRadial(dim: RadialDimension, style: DimensionStyle, spatial: SpatialContext): MeasuredDimension {
  const r = distance(dim.center, dim.edge);
  const value = dim.diameter ? r * 2 : r;
  const prefix = dim.diameter ? "⌀" : "R";
  const dir = normalize(subtract(dim.edge, dim.center));
  return {
    value,
    label: dim.textOverride ?? `${prefix}${formatDimText(value, style, spatial)}`,
    geometry: {
      lines: [[dim.diameter ? add(dim.center, scale(dir, -r)) : dim.center, dim.edge]],
      ticks: [{ at: dim.edge, dir: scale(dir, -1) }],
      textAt: add(dim.center, scale(dir, r * 0.55)),
      textAngleDeg: 0,
    },
  };
}

function measureOrdinate(dim: OrdinateDimension, style: DimensionStyle, spatial: SpatialContext): MeasuredDimension {
  const value = dim.axis === "x" ? dim.point.x - dim.datum.x : dim.point.y - dim.datum.y;
  const leaderEnd =
    dim.axis === "x" ? { x: dim.point.x, y: dim.point.y - dim.leader } : { x: dim.point.x + dim.leader, y: dim.point.y };
  return {
    value: Math.abs(value),
    label: dim.textOverride ?? formatDimText(Math.abs(value), style, spatial),
    geometry: {
      lines: [[dim.point, leaderEnd]],
      ticks: [{ at: dim.point, dir: { x: 0, y: 1 } }],
      textAt: leaderEnd,
      textAngleDeg: 0,
    },
  };
}

function measureArcLength(dim: ArcLengthDimension, style: DimensionStyle, spatial: SpatialContext): MeasuredDimension {
  const a = subtract(dim.start, dim.center);
  const b = subtract(dim.end, dim.center);
  let sweep = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
  while (sweep <= -Math.PI) sweep += 2 * Math.PI;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  const arcLen = Math.abs(sweep) * dim.radius;
  const steps = Math.max(2, Math.ceil((Math.abs(sweep) * 180) / Math.PI / 5));
  const start = Math.atan2(a.y, a.x);
  const rr = dim.radius + dim.offset;
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = start + (sweep * i) / steps;
    pts.push({ x: dim.center.x + rr * Math.cos(t), y: dim.center.y + rr * Math.sin(t) });
  }
  const lines: [Point, Point][] = [];
  for (let i = 1; i < pts.length; i++) lines.push([pts[i - 1], pts[i]]);
  const mid = start + sweep / 2;
  return {
    value: arcLen,
    label: dim.textOverride ?? `⌒ ${formatDimText(arcLen, style, spatial)}`,
    geometry: {
      lines,
      ticks: [
        { at: pts[0], dir: normalize(subtract(pts[1], pts[0])) },
        { at: pts[pts.length - 1], dir: normalize(subtract(pts[pts.length - 2], pts[pts.length - 1])) },
      ],
      textAt: { x: dim.center.x + (rr + 1) * Math.cos(mid), y: dim.center.y + (rr + 1) * Math.sin(mid) },
      textAngleDeg: 0,
    },
  };
}
