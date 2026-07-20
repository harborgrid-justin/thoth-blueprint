/**
 * Public Land Survey System (PLSS) — the rectangular survey framework U.S. plats
 * are tied to (Township / Range / Section and their aliquot parts, e.g. "the
 * NW1/4 of the SE1/4 of Section 8, Township 3 South, Range 16 East").
 *
 * A section is nominally one square mile (5280 ft) = 640 acres; it subdivides by
 * repeated quartering (160, 40, 10 acres …). This module models that framework,
 * computes aliquot-part geometry and nominal areas, and formats the legal
 * nomenclature. Geometry uses the platform convention: north is −Y, east is +X.
 */

import type { Point, Polygon } from "../spatial/geometry";

/** Nominal U.S. section side, feet (one mile). */
export const SECTION_FEET = 5280;
/** Nominal section area, acres. */
export const SECTION_ACRES = 640;

/** A quarter within a section or aliquot part. */
export type Quarter = "NW" | "NE" | "SW" | "SE";

/** Halves used for half-aliquots (e.g. the N1/2). */
export type Half = "N" | "S" | "E" | "W";

export type TownshipDirection = "North" | "South";
export type RangeDirection = "East" | "West";

/** A Township & Range designation (optionally naming the principal meridian). */
export interface TownshipRange {
  township: number;
  townshipDir: TownshipDirection;
  range: number;
  rangeDir: RangeDirection;
  /** Principal meridian, e.g. "Tallahassee" (optional). */
  meridian?: string;
}

/** The corners and controlling points of a section (or any square aliquot). */
export interface SectionFrame {
  nw: Point;
  ne: Point;
  sw: Point;
  se: Point;
  center: Point;
  /** Quarter-corner points on each edge (the section midpoints). */
  north: Point;
  south: Point;
  east: Point;
  west: Point;
  /** Side length in plan units. */
  side: number;
}

/**
 * Build a square frame from its **northwest** corner and side length. With north
 * = −Y, the north edge has the smaller Y and the south edge the larger Y.
 */
export function sectionFrame(nwCorner: Point, side: number): SectionFrame {
  const { x, y } = nwCorner;
  const nw = { x, y };
  const ne = { x: x + side, y };
  const sw = { x, y: y + side };
  const se = { x: x + side, y: y + side };
  return {
    nw,
    ne,
    sw,
    se,
    center: { x: x + side / 2, y: y + side / 2 },
    north: { x: x + side / 2, y },
    south: { x: x + side / 2, y: y + side },
    east: { x: x + side, y: y + side / 2 },
    west: { x, y: y + side / 2 },
    side,
  };
}

/** The NW corner and side of one quarter of a square given by its NW corner. */
function quarterOrigin(nwCorner: Point, side: number, q: Quarter): { nw: Point; side: number } {
  const half = side / 2;
  const { x, y } = nwCorner;
  switch (q) {
    case "NW":
      return { nw: { x, y }, side: half };
    case "NE":
      return { nw: { x: x + half, y }, side: half };
    case "SW":
      return { nw: { x, y: y + half }, side: half };
    case "SE":
      return { nw: { x: x + half, y: y + half }, side: half };
  }
}

/**
 * The polygon of an aliquot part, given the enclosing square's NW corner and
 * side. `path` reads outer→inner: `["SE", "NW"]` is "the NW1/4 of the SE1/4".
 * Returned as a closed ring (NW, NE, SE, SW) in plan coordinates.
 */
export function aliquotRect(nwCorner: Point, side: number, path: Quarter[]): Polygon {
  let origin = nwCorner;
  let s = side;
  for (const q of path) {
    const next = quarterOrigin(origin, s, q);
    origin = next.nw;
    s = next.side;
  }
  return [
    { x: origin.x, y: origin.y },
    { x: origin.x + s, y: origin.y },
    { x: origin.x + s, y: origin.y + s },
    { x: origin.x, y: origin.y + s },
  ];
}

/** Nominal acreage of an aliquot part: 640 acres divided by 4 per quartering. */
export function nominalAliquotAcres(path: Quarter[]): number {
  return SECTION_ACRES / Math.pow(4, path.length);
}

/** Format an aliquot path as "NW1/4 of the SE1/4 of the …". */
export function formatAliquot(path: Quarter[]): string {
  if (path.length === 0) return "all";
  // The path is outer→inner; the description reads inner→outer.
  return path
    .slice()
    .reverse()
    .map((q) => `${q}1/4`)
    .join(" of the ");
}

/** Abbreviated Township/Range, e.g. "T3S, R16E". */
export function formatTownshipRangeShort(tr: TownshipRange): string {
  const t = `T${tr.township}${tr.townshipDir[0]}`;
  const r = `R${tr.range}${tr.rangeDir[0]}`;
  return `${t}, ${r}`;
}

/** Full Township/Range, e.g. "Township 3 South, Range 16 East". */
export function formatTownshipRange(tr: TownshipRange): string {
  return `Township ${tr.township} ${tr.townshipDir}, Range ${tr.range} ${tr.rangeDir}`;
}

/** Full PLSS reference, e.g. "Section 8, Township 3 South, Range 16 East". */
export function formatPLSS(tr: TownshipRange, section: number): string {
  const mer = tr.meridian ? `, ${tr.meridian} Meridian` : "";
  return `Section ${section}, ${formatTownshipRange(tr)}${mer}`;
}

/** Abbreviated PLSS reference, e.g. "Sec. 8, T3S, R16E". */
export function formatPLSSShort(tr: TownshipRange, section: number): string {
  return `Sec. ${section}, ${formatTownshipRangeShort(tr)}`;
}

/**
 * The standard corner name for a point of a section, for legal descriptions
 * ("the Southwest corner of Section 8 …").
 */
export function sectionCornerName(corner: Quarter): string {
  return { NW: "Northwest", NE: "Northeast", SW: "Southwest", SE: "Southeast" }[corner] + " corner";
}

/**
 * Section numbering within a township grid (0-based col/row from the NW corner)
 * following the standard boustrophedon: Section 1 is the NE corner, numbering
 * runs west across the top tier, then serpentines down to Section 36 in the SE.
 */
export function sectionColRow(section: number): { col: number; row: number } | null {
  if (section < 1 || section > 36) return null;
  const row = Math.floor((section - 1) / 6); // 0 = north tier
  const within = (section - 1) % 6;
  // Odd tiers (row 0,2,4) number east→west; even tiers (row 1,3,5) west→east.
  const col = row % 2 === 0 ? 5 - within : within;
  return { col, row };
}
