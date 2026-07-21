/**
 * The sheet and drawing-set document model, with **NCS sheet numbering**.
 *
 * A {@link DrawingSet} is an ordered collection of {@link Sheet}s — the
 * deliverable a project issues. Each sheet has a size, orientation, a named
 * scale, a discipline, a title block, revisions, and references to the paper-
 * space viewports composed onto it (see ./sheetview.ts). Sheet identifiers follow
 * the US National CAD Standard `AA-NNN` convention: a discipline letter, a
 * sheet-type digit, and a two-digit sequence (e.g. `A-101`).
 */

import _ from "lodash";
import {
  DISCIPLINE_ORDER,
  disciplineName,
  type DisciplineCode,
} from "./drafting";

import type {
  SheetTypeDigit,
  SheetNumber,
  Revision,
  TitleBlockData,
  Sheet,
  TitleBlockDefaults,
  DrawingSet,
} from "./types/sheet";

export type {
  SheetTypeDigit,
  SheetNumber,
  Revision,
  TitleBlockData,
  Sheet,
  TitleBlockDefaults,
  DrawingSet,
};

/** Human name for each sheet-type digit. */
export const SHEET_TYPES: Record<SheetTypeDigit, string> = {
  0: "General",
  1: "Plans",
  2: "Elevations",
  3: "Sections",
  4: "Large-scale views",
  5: "Details",
  6: "Schedules & diagrams",
  7: "User defined",
  8: "User defined",
  9: "3D representations",
};

/** Name for a sheet-type digit. */
export function sheetTypeName(digit: SheetTypeDigit): string {
  return SHEET_TYPES[digit] ?? "User defined";
}

/** Format an NCS sheet number as `A-101`. */
export function formatSheetNumber(n: SheetNumber): string {
  return `${n.discipline}-${n.type}${String(n.sequence).padStart(2, "0")}`;
}

/** Parse an NCS sheet number like `A-101` or `C-501`; null if malformed. */
export function parseSheetNumber(text: string): SheetNumber | null {
  const m = /^([A-Z])-?(\d)(\d{2})$/.exec(text.trim().toUpperCase());
  if (!m) {
    return null;
  }
  return {
    discipline: m[1] as DisciplineCode,
    type: Number(m[2]) as SheetTypeDigit,
    sequence: Number(m[3]),
  };
}

/** Compare two sheets by discipline order, then type, then sequence. */
export function compareSheets(a: Sheet, b: Sheet): number {
  const idxA = DISCIPLINE_ORDER.indexOf(a.number.discipline);
  const idxB = DISCIPLINE_ORDER.indexOf(b.number.discipline);
  const da = idxA === -1 ? Infinity : idxA;
  const db = idxB === -1 ? Infinity : idxB;
  if (da !== db) {
    return da - db;
  }
  if (a.number.type !== b.number.type) {
    return a.number.type - b.number.type;
  }
  return a.number.sequence - b.number.sequence;
}

/** A copy of the set's sheets in canonical NCS order. */
export function sortSheets(set: DrawingSet): Sheet[] {
  return _.sortBy(set.sheets, [
    (s) => {
      const idx = DISCIPLINE_ORDER.indexOf(s.number.discipline);
      return idx === -1 ? Infinity : idx;
    },
    (s) => s.number.type,
    (s) => s.number.sequence,
  ]);
}

/** The next free sequence number for a (discipline, type) pair in a set. */
export function nextSheetNumber(
  set: DrawingSet,
  discipline: DisciplineCode,
  type: SheetTypeDigit,
): SheetNumber {
  let max = 0;
  for (const s of set.sheets) {
    if (s.number.discipline === discipline && s.number.type === type) {
      max = Math.max(max, s.number.sequence);
    }
  }
  return { discipline, type, sequence: max + 1 };
}

/** One row of the drawing index (cover-sheet sheet list). */
export interface SheetIndexRow {
  number: string;
  title: string;
  discipline: string;
  ordinal: number;
  count: number;
}

/** Build the drawing index for a set (discipline-ordered rows). */
export function sheetIndex(set: DrawingSet): SheetIndexRow[] {
  const ordered = sortSheets(set);
  return ordered.map((s, i) => ({
    number: formatSheetNumber(s.number),
    title: s.title,
    discipline: disciplineName(s.number.discipline),
    ordinal: i + 1,
    count: ordered.length,
  }));
}

/**
 * Resolve the title-block data for a sheet, folding the set defaults with the
 * sheet's own number/title/scale and computing the "n of N" ordinal.
 */
export function resolveTitleBlock(
  set: DrawingSet,
  sheet: Sheet,
  scaleLabel: string,
): TitleBlockData {
  const ordered = sortSheets(set);
  const idx = ordered.findIndex((s) => s.id === sheet.id);
  const d = set.titleBlockDefaults;
  return {
    projectName: d.projectName,
    client: d.client,
    location: d.location,
    drawnBy: d.drawnBy,
    checkedBy: d.checkedBy,
    date: d.date,
    projectNumber: d.projectNumber,
    scaleLabel,
    sheetNumber: formatSheetNumber(sheet.number),
    sheetTitle: sheet.title,
    sheetOf: `${idx + 1} of ${ordered.length}`,
  };
}
