/**
 * The render-agnostic **sheet scene** — an intermediate list of drawing
 * primitives, all in PostScript **points** (1/72"), origin top-left, y-down. A
 * sheet is built once into `SheetPrimitive[]`, then rendered two ways from the
 * same data: to SVG (`SvgSheet`) and to a vector PDF page (`pdfExport`). Because
 * both consume this IR, the on-screen sheet and the exported PDF are identical.
 */

import type { HatchPattern } from "./hatch";

/** A point in sheet space (points). */
export interface Pt {
  x: number;
  y: number;
}

/** A drawing primitive on a sheet, in points. */
export type SheetPrimitive =
  | { t: "line"; a: Pt; b: Pt; w?: number; color?: string; dash?: number[] }
  | {
      t: "polyline";
      pts: Pt[];
      w?: number;
      color?: string;
      dash?: number[];
      close?: boolean;
    }
  | {
      t: "polygon";
      pts: Pt[];
      w?: number;
      stroke?: string;
      fill?: string;
      fillOpacity?: number;
      dash?: number[];
    }
  | {
      t: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      sw?: number;
      stroke?: string;
      fill?: string;
      fillOpacity?: number;
      dash?: number[];
    }
  | {
      t: "circle";
      c: Pt;
      r: number;
      sw?: number;
      stroke?: string;
      fill?: string;
      fillOpacity?: number;
    }
  | {
      t: "text";
      at: Pt;
      text: string;
      size: number;
      color?: string;
      anchor?: "start" | "middle" | "end";
      weight?: number;
      angle?: number;
      mono?: boolean;
    };

/** Points per inch / per millimetre. */
export const PT_PER_IN = 72;
export const PT_PER_MM = 72 / 25.4;

/** Convert a millimetre paper measure to points. */
export function mmToPt(mm: number): number {
  return mm * PT_PER_MM;
}

/** Convert a paper measure in the sheet's unit (in/mm) to points. */
export function paperToPointsForSheet(
  value: number,
  unit: "in" | "mm",
): number {
  return unit === "in" ? value * PT_PER_IN : value * PT_PER_MM;
}

/** Standard ink colours. */
export const INK = "#0f172a";
export const MUTED = "#475569";
export const LIGHT = "#94a3b8";
export const SHEET_WHITE = "#ffffff";

/** A group of primitives with a display name (a "band" of the sheet). */
export interface SheetBand {
  name: string;
  prims: SheetPrimitive[];
}

/** Flatten bands to a single primitive list in order. */
export function flattenBands(bands: SheetBand[]): SheetPrimitive[] {
  return bands.flatMap((b) => b.prims);
}

// --- geometry helpers for builders -----------------------------------------

/** Test whether a point is inside a polygon (even-odd), points in sheet space. */
function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Clip a set of parallel hatch lines to a polygon, returning inside spans as
 * line primitives. Produces true vector hatch shared by SVG and PDF.
 */
export function hatchLines(
  poly: Pt[],
  pattern: HatchPattern,
): SheetPrimitive[] {
  if (poly.length < 3) {
    return [];
  }
  const spacing = mmToPt(pattern.spacing);
  const color = pattern.color ?? MUTED;
  const w = 0.4;
  const angle = (pattern.angleDeg * Math.PI) / 180;
  const dirs: number[] =
    pattern.kind === "crosshatch" || pattern.kind === "grid"
      ? [angle, angle + Math.PI / 2]
      : [angle];

  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Dots: stipple the bounding box, keep points inside the polygon.
  if (pattern.kind === "dots") {
    const out: SheetPrimitive[] = [];
    for (let y = minY; y <= maxY; y += spacing) {
      for (let x = minX; x <= maxX; x += spacing) {
        const p = { x, y };
        if (pointInPoly(p, poly)) {
          out.push({ t: "circle", c: p, r: 0.5, fill: color });
        }
      }
    }
    return out;
  }

  const out: SheetPrimitive[] = [];
  const diag = Math.hypot(maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  for (const a of dirs) {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    // Normal to the line direction; step lines along it.
    const nx = -dy;
    const ny = dx;
    const steps = Math.ceil(diag / spacing) + 2;
    for (let k = -steps; k <= steps; k++) {
      const ox = cx + nx * k * spacing;
      const oy = cy + ny * k * spacing;
      // Line: (ox,oy) + t*(dx,dy). Find intersections with polygon edges.
      const hits: number[] = [];
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        const ex = p2.x - p1.x;
        const ey = p2.y - p1.y;
        const denom = dx * ey - dy * ex;
        if (Math.abs(denom) < 1e-9) {
          continue;
        }
        const t = ((p1.x - ox) * ey - (p1.y - oy) * ex) / denom;
        const u = ((p1.x - ox) * dy - (p1.y - oy) * dx) / denom;
        if (u >= 0 && u <= 1) {
          hits.push(t);
        }
      }
      hits.sort((m, n) => m - n);
      for (let i = 0; i + 1 < hits.length; i += 2) {
        const t1 = hits[i];
        const t2 = hits[i + 1];
        out.push({
          t: "line",
          a: { x: ox + dx * t1, y: oy + dy * t1 },
          b: { x: ox + dx * t2, y: oy + dy * t2 },
          w,
          color,
        });
      }
    }
  }
  return out;
}

/** A filled arrowhead (triangle) at `at` pointing along unit `dir`, size in pt. */
export function arrowHead(
  at: Pt,
  dir: Pt,
  size: number,
  color = INK,
): SheetPrimitive {
  const nx = -dir.y;
  const ny = dir.x;
  const base = { x: at.x - dir.x * size, y: at.y - dir.y * size };
  return {
    t: "polygon",
    pts: [
      at,
      { x: base.x + nx * size * 0.35, y: base.y + ny * size * 0.35 },
      { x: base.x - nx * size * 0.35, y: base.y - ny * size * 0.35 },
    ],
    fill: color,
    stroke: color,
    w: 0.3,
  };
}

/** A 45° architectural dimension tick at `at`, size in pt. */
export function dimTick(
  at: Pt,
  dir: Pt,
  size: number,
  color = INK,
): SheetPrimitive {
  // Tick runs at 45° to the dimension line.
  const a = Math.atan2(dir.y, dir.x) + Math.PI / 4;
  const ex = Math.cos(a) * size;
  const ey = Math.sin(a) * size;
  return {
    t: "line",
    a: { x: at.x - ex, y: at.y - ey },
    b: { x: at.x + ex, y: at.y + ey },
    w: 0.7,
    color,
  };
}

/** A north arrow (points primitives) centred at `at`, height `h` pt. */
export function northArrow(at: Pt, h: number): SheetPrimitive[] {
  return [
    {
      t: "line",
      a: { x: at.x, y: at.y + h },
      b: { x: at.x, y: at.y },
      w: 1,
      color: INK,
    },
    {
      t: "polygon",
      pts: [
        { x: at.x, y: at.y },
        { x: at.x + h * 0.16, y: at.y + h * 0.4 },
        { x: at.x, y: at.y + h * 0.28 },
        { x: at.x - h * 0.16, y: at.y + h * 0.4 },
      ],
      fill: INK,
      stroke: INK,
      w: 0.3,
    },
    {
      t: "text",
      at: { x: at.x, y: at.y - 3 },
      text: "N",
      size: h * 0.38,
      color: INK,
      anchor: "middle",
      weight: 700,
    },
  ];
}
