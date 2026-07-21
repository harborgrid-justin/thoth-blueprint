/** Named tiers of the ISO line-weight pen set. */
export type LineWeightName =
  "fine" | "thin" | "light" | "medium" | "wide" | "x-wide" | "xx-wide";

/** Named CAD line types. */
export type LineTypeName =
  | "continuous"
  | "hidden"
  | "center"
  | "phantom"
  | "dashed"
  | "dashdot"
  | "dotted"
  | "property"
  | "break"
  | "matchline";

/** A line-type definition: a repeating dash pattern in paper millimetres. */
export interface LineTypeDef {
  name: LineTypeName;
  label: string;
  /** Dash/gap lengths in mm (empty = solid). */
  pattern: number[];
}

/** Which scale system a named scale belongs to. */
export type ScaleSystem = "architectural" | "engineering" | "metric";

/** A named drawing scale (paper distance to model distance). */
export interface DrawingScale {
  id: string;
  label: string;
  system: ScaleSystem;
  modelPerPaper: number;
}

/** US National CAD Standard single-letter discipline designator. */
export type DisciplineCode =
  | "G"
  | "H"
  | "V"
  | "B"
  | "C"
  | "L"
  | "S"
  | "A"
  | "I"
  | "Q"
  | "F"
  | "P"
  | "D"
  | "M"
  | "E"
  | "W"
  | "T"
  | "R"
  | "X"
  | "Z"
  | "O";

/** A CAD layer in the NCS/AIA long format: `DISCIPLINE-MAJOR-MINOR-STATUS`. */
export interface CadLayer {
  /** Full formatted name, e.g. "A-WALL". */
  name: string;
  discipline: DisciplineCode;
  /** Major field, e.g. "WALL", "TOPO", "ANNO". */
  major: string;
  /** Optional minor/modifier field, e.g. "FULL", "IDEN". */
  minor?: string;
  color: string;
  lineWeight: LineWeightName;
  lineType: LineTypeName;
  /** Whether the layer plots (non-plotting layers are construction aids). */
  plot: boolean;
}

/** A plot/pen style: how a screen colour maps to plotted ink. */
export interface PlotStyle {
  name: string;
  /** Screening percentage (100 = full ink, lower = greyer). */
  screening: number;
  /** Optional line-weight override applied at plot time. */
  lineWeightOverride?: LineWeightName;
}
