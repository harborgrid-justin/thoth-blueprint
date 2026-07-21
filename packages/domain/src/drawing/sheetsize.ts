/**
 * Sheet sizes — the physical page geometry a CAD sheet is plotted on. Three
 * series are supported: **ANSI** engineering sizes (A–E), **ARCH** architectural
 * sizes (A–E), and **ISO** A-series (A4–A0). Every size carries its dimensions in
 * both inches and millimetres so a sheet can be laid out in either paper unit.
 *
 * Paper space is distinct from model space: model geometry is drawn to a
 * {@link ./sheetview.SheetViewport} at a named scale, then composed onto a sheet
 * of one of these sizes with a border and title block.
 */

import type {
  PaperUnit,
  Orientation,
  SheetSeries,
  SheetSizeId,
  SheetSize,
  PaperDimensions,
  SheetMargins,
  PaperRect,
} from "./types/sheetsize";

export type {
  PaperUnit,
  Orientation,
  SheetSeries,
  SheetSizeId,
  SheetSize,
  PaperDimensions,
  SheetMargins,
  PaperRect,
};

const IN_PER_MM = 1 / 25.4;
const MM_PER_IN = 25.4;

function ansiOrArch(
  id: SheetSizeId,
  label: string,
  series: SheetSeries,
  wIn: number,
  hIn: number,
): SheetSize {
  return {
    id,
    label,
    series,
    wIn,
    hIn,
    wMm: wIn * MM_PER_IN,
    hMm: hIn * MM_PER_IN,
  };
}

function iso(
  id: SheetSizeId,
  label: string,
  wMm: number,
  hMm: number,
): SheetSize {
  return {
    id,
    label,
    series: "iso",
    wMm,
    hMm,
    wIn: wMm * IN_PER_MM,
    hIn: hMm * IN_PER_MM,
  };
}

/** The registry of standard sheet sizes (portrait-native dimensions). */
export const SHEET_SIZES: SheetSize[] = [
  ansiOrArch("ansi-a", 'ANSI A (8.5"×11")', "ansi", 8.5, 11),
  ansiOrArch("ansi-b", 'ANSI B (11"×17")', "ansi", 11, 17),
  ansiOrArch("ansi-c", 'ANSI C (17"×22")', "ansi", 17, 22),
  ansiOrArch("ansi-d", 'ANSI D (22"×34")', "ansi", 22, 34),
  ansiOrArch("ansi-e", 'ANSI E (34"×44")', "ansi", 34, 44),
  ansiOrArch("arch-a", 'ARCH A (9"×12")', "arch", 9, 12),
  ansiOrArch("arch-b", 'ARCH B (12"×18")', "arch", 12, 18),
  ansiOrArch("arch-c", 'ARCH C (18"×24")', "arch", 18, 24),
  ansiOrArch("arch-d", 'ARCH D (24"×36")', "arch", 24, 36),
  ansiOrArch("arch-e", 'ARCH E (36"×48")', "arch", 36, 48),
  iso("iso-a4", "ISO A4 (210×297)", 210, 297),
  iso("iso-a3", "ISO A3 (297×420)", 297, 420),
  iso("iso-a2", "ISO A2 (420×594)", 420, 594),
  iso("iso-a1", "ISO A1 (594×841)", 594, 841),
  iso("iso-a0", "ISO A0 (841×1189)", 841, 1189),
];

const BY_ID = new Map(SHEET_SIZES.map((s) => [s.id, s]));

/** Look up a sheet size by id (falls back to ARCH D). */
export function sheetSize(id: SheetSizeId): SheetSize {
  return BY_ID.get(id) ?? BY_ID.get("arch-d")!;
}

/** All registered sheet sizes. */
export function listSheetSizes(): SheetSize[] {
  return SHEET_SIZES;
}

/**
 * The outer page dimensions of a sheet in the requested paper unit and
 * orientation. Portrait keeps short-edge as width; landscape swaps them.
 */
export function sheetDimensions(
  id: SheetSizeId,
  orientation: Orientation = "landscape",
  unit: PaperUnit = "in",
): PaperDimensions {
  const s = sheetSize(id);
  const w = unit === "in" ? s.wIn : s.wMm;
  const h = unit === "in" ? s.hIn : s.hMm;
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  return orientation === "landscape"
    ? { w: long, h: short, unit }
    : { w: short, h: long, unit };
}

/** Default NCS-style margins (inches): 1.5" binding edge, 0.5" elsewhere. */
export const DEFAULT_MARGINS_IN: SheetMargins = {
  left: 1.5,
  right: 0.5,
  top: 0.5,
  bottom: 0.5,
  unit: "in",
};

/** Default ISO margins (mm): 20mm binding edge, 10mm elsewhere. */
export const DEFAULT_MARGINS_MM: SheetMargins = {
  left: 20,
  right: 10,
  top: 10,
  bottom: 10,
  unit: "mm",
};

/** Default margins for a paper unit. */
export function defaultMargins(unit: PaperUnit): SheetMargins {
  return unit === "in" ? DEFAULT_MARGINS_IN : DEFAULT_MARGINS_MM;
}

/**
 * The printable (inside-border) rectangle of a sheet, in paper units. This is
 * the area available for the drawing window, viewports, and title strip.
 */
export function printableArea(
  id: SheetSizeId,
  orientation: Orientation = "landscape",
  unit: PaperUnit = "in",
  margins: SheetMargins = defaultMargins(unit),
): PaperRect {
  const dim = sheetDimensions(id, orientation, unit);
  return {
    x: margins.left,
    y: margins.top,
    w: dim.w - margins.left - margins.right,
    h: dim.h - margins.top - margins.bottom,
  };
}

import { paperToPoints } from "./common/units";

export { paperToPoints };
