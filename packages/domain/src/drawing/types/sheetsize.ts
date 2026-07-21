/** Paper unit a sheet is laid out in. */
export type PaperUnit = "in" | "mm";

/** Sheet orientation. */
export type Orientation = "landscape" | "portrait";

/** The size series a sheet belongs to. */
export type SheetSeries = "ansi" | "arch" | "iso";

/** A standard sheet size identifier (series + designation). */
export type SheetSizeId =
  | "ansi-a"
  | "ansi-b"
  | "ansi-c"
  | "ansi-d"
  | "ansi-e"
  | "arch-a"
  | "arch-b"
  | "arch-c"
  | "arch-d"
  | "arch-e"
  | "iso-a4"
  | "iso-a3"
  | "iso-a2"
  | "iso-a1"
  | "iso-a0";

/** A physical sheet size, in portrait (short edge = width) native measure. */
export interface SheetSize {
  id: SheetSizeId;
  label: string;
  series: SheetSeries;
  /** Native short-edge / long-edge in inches (0 for ISO where mm is native). */
  wIn: number;
  hIn: number;
  /** Native short-edge / long-edge in millimetres. */
  wMm: number;
  hMm: number;
}

/** A width/height in a paper unit. */
export interface PaperDimensions {
  w: number;
  h: number;
  unit: PaperUnit;
}

/** Sheet border margins in a paper unit — a wider left margin is the binding edge. */
export interface SheetMargins {
  left: number;
  right: number;
  top: number;
  bottom: number;
  unit: PaperUnit;
}

/** A rectangle in paper units. */
export interface PaperRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
