import type { DisciplineCode } from "./drafting";
import type { Orientation, SheetSizeId } from "./sheetsize";

/** The NCS sheet-type digit (the first numeral of the sheet number). */
export type SheetTypeDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** A parsed NCS sheet number. */
export interface SheetNumber {
  discipline: DisciplineCode;
  type: SheetTypeDigit;
  /** Sequence within the (discipline, type), 1–99. */
  sequence: number;
}

/** A single revision-block entry (a delta triangle references this). */
export interface Revision {
  id: string;
  /** Revision number/delta (1, 2, 3 …). */
  delta: number;
  date: string;
  description: string;
  by?: string;
}

/** The resolved title-block content for one sheet. */
export interface TitleBlockData {
  projectName: string;
  client?: string;
  location?: string;
  drawnBy?: string;
  checkedBy?: string;
  date: string;
  scaleLabel: string;
  sheetNumber: string;
  sheetTitle: string;
  /** "3 of 12" ordinal within the set. */
  sheetOf: string;
  projectNumber?: string;
  /** Seal/stamp caption, if the sheet carries one. */
  seal?: string;
}

/** One sheet in a drawing set. */
export interface Sheet {
  id: string;
  number: SheetNumber;
  title: string;
  size: SheetSizeId;
  orientation: Orientation;
  /** Named drawing scale id (from ./drafting.DRAWING_SCALES), or "as-shown". */
  scaleId: string;
  discipline: DisciplineCode;
  /** Ids of the paper-space viewports composed onto this sheet. */
  viewportIds: string[];
  revisions: Revision[];
  /** Free-text general notes shown on the sheet. */
  notes?: string[];
  /** Ids of keynotes (from ./annotation) referenced on this sheet. */
  keynoteIds?: string[];
}

/** Defaults applied to every sheet's title block in a set. */
export interface TitleBlockDefaults {
  projectName: string;
  client?: string;
  location?: string;
  drawnBy?: string;
  checkedBy?: string;
  date: string;
  projectNumber?: string;
  /** Fixed firm lines (name/address/licence). */
  firmLines?: string[];
}

/** An ordered set of sheets — the issued deliverable. */
export interface DrawingSet {
  id: string;
  name: string;
  sheets: Sheet[];
  titleBlockDefaults: TitleBlockDefaults;
}
