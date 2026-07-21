import {
  add,
  subtract,
  scale,
  normalize,
  dot,
  bounds as boundsOf,
  type Point,
} from "@thoth/domain";

import { formatNumber } from "@/lib/format";

export const INK = "#0f172a";
export const INK_MUTED = "#475569";
export const SHEET = "#ffffff";

export const W = 800;
export const H = 620;
export const M = { left: 76, right: 76, top: 58, bottom: 128 };
export const CW = W - M.left - M.right;
export const CH = H - M.top - M.bottom;

export function niceNumber(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  const r = value / mag;
  return (r >= 5 ? 5 : r >= 2 ? 2 : 1) * mag;
}

export function fmt(v: number, digits = 2): string {
  return formatNumber(v, digits);
}

export function dms(a: {
  degrees: number;
  minutes: number;
  seconds: number;
}): string {
  const d = String(Math.abs(a.degrees));
  const m = String(a.minutes).padStart(2, "0");
  const s = String(a.seconds).padStart(2, "0");
  return `${d}°${m}′${s}″`;
}

export interface View {
  project(p: Point): Point;
  scalePx: number;
}

export function buildView(boundary: Point[]): View | null {
  if (boundary.length < 3) {
    return null;
  }
  const bb = boundsOf(boundary);
  const bw = Math.max(bb.maxX - bb.minX, 1e-6);
  const bh = Math.max(bb.maxY - bb.minY, 1e-6);
  const scalePx = Math.min(CW / bw, CH / bh);
  const offsetX = M.left + (CW - bw * scalePx) / 2 - bb.minX * scalePx;
  const offsetY = M.top + (CH - bh * scalePx) / 2 - bb.minY * scalePx;
  return {
    scalePx,
    project: (p) => ({
      x: p.x * scalePx + offsetX,
      y: p.y * scalePx + offsetY,
    }),
  };
}

export function screenPair(p: Point): string {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

export function offset(p: Point, dir: Point, px: number): Point {
  return add(p, scale(dir, px));
}

export function outwardNormal(a: Point, b: Point, c: Point): Point {
  const e = normalize(subtract(b, a));
  let nrm = { x: -e.y, y: e.x };
  const mid = scale(add(a, b), 0.5);
  if (dot(nrm, subtract(mid, c)) < 0) {
    nrm = scale(nrm, -1);
  }
  return nrm;
}

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tract"
  );
}
