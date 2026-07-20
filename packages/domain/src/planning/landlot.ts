/**
 * The Georgia Land Lot System — the survey framework used across most of
 * Georgia (which was distributed by land lottery, not the federal PLSS). Land is
 * divided into numbered **Land Districts**, each subdivided into numbered
 * **Land Lots**. Depending on the lottery, a land lot is a fixed nominal size;
 * the 1820s lotteries (e.g. Newton County) used **202.5-acre** land lots.
 *
 * A legal description reads "Land Lot 12 of the 9th Land District". Geometry uses
 * the platform convention: north is −Y, east is +X.
 */

import type { Point, Polygon } from "./geometry";
import { sectionFrame, type SectionFrame } from "./plss";

/** Square feet in one acre. */
export const ACRE_SQFT = 43560;

/** Standard 1820s-lottery land lot size (Newton, Henry, Fayette, … counties). */
export const LAND_LOT_ACRES_202 = 202.5;

/** A Land District / Land Lot reference. */
export interface LandLotRef {
  district: number;
  landLot: number;
  /** Nominal land-lot acreage for this district's lottery (default 202.5). */
  acres?: number;
  /** Section suffix used in a few original surveys (e.g. "3rd Section"). */
  section?: number;
}

/** Side length (feet) of a square land lot of the given acreage. */
export function landLotSide(acres = LAND_LOT_ACRES_202): number {
  return Math.sqrt(acres * ACRE_SQFT);
}

/** The corners/controlling points of a land lot, given its NW corner + acreage. */
export function landLotFrame(nwCorner: Point, acres = LAND_LOT_ACRES_202): SectionFrame {
  return sectionFrame(nwCorner, landLotSide(acres));
}

/** The land-lot square as a closed ring (NW, NE, SE, SW). */
export function landLotRect(nwCorner: Point, acres = LAND_LOT_ACRES_202): Polygon {
  const s = landLotSide(acres);
  const { x, y } = nwCorner;
  return [
    { x, y },
    { x: x + s, y },
    { x: x + s, y: y + s },
    { x, y: y + s },
  ];
}

/** English ordinal for a positive integer (1 → "1st", 9 → "9th", 22 → "22nd"). */
export function ordinal(n: number): string {
  const v = Math.abs(Math.trunc(n));
  const tens = v % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (v % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Legal nomenclature, e.g. "Land Lot 12 of the 9th Land District". */
export function formatLandLot(ref: LandLotRef): string {
  const sec = ref.section ? ` of the ${ordinal(ref.section)} Section` : "";
  return `Land Lot ${ref.landLot} of the ${ordinal(ref.district)} Land District${sec}`;
}

/** Abbreviated form, e.g. "LL 12, 9th Dist.". */
export function formatLandLotShort(ref: LandLotRef): string {
  return `LL ${ref.landLot}, ${ordinal(ref.district)} Dist.`;
}
