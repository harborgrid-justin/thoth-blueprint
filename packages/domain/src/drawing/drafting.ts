/**
 * Drafting standards — the CAD conventions that make output read as a real
 * engineering/architectural sheet: **line weights** (the ISO pen set), **line
 * types** (continuous, hidden, centre, …), named **drawing scales** (imperial
 * architectural & engineering plus metric ratios), the **discipline designators**
 * and **CAD layer** naming of the US National CAD Standard, and **plot styles**.
 *
 * Pure data + lookups. Renderers map these to SVG stroke attributes / PDF pens.
 */

import type {
  LineWeightName,
  LineTypeName,
  LineTypeDef,
  ScaleSystem,
  DrawingScale,
  DisciplineCode,
  CadLayer,
  PlotStyle,
} from "./types/drafting";

export type {
  LineWeightName,
  LineTypeName,
  LineTypeDef,
  ScaleSystem,
  DrawingScale,
  DisciplineCode,
  CadLayer,
  PlotStyle,
};

// --- line weights ----------------------------------------------------------

/** Millimetre width for each named line weight (ISO pen ladder). */
export const LINE_WEIGHTS: Record<LineWeightName, number> = {
  fine: 0.13,
  thin: 0.18,
  light: 0.25,
  medium: 0.35,
  wide: 0.5,
  "x-wide": 0.7,
  "xx-wide": 1.0,
};

/** The full ISO pen ladder in millimetres, for style pickers. */
export const ISO_PEN_LADDER_MM = [
  0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1.0, 1.4, 2.0,
];

/** Millimetre width for a named line weight. */
export function lineWeightMm(name: LineWeightName): number {
  return LINE_WEIGHTS[name];
}

// --- line types ------------------------------------------------------------

export const LINE_TYPES: Record<LineTypeName, LineTypeDef> = {
  continuous: { name: "continuous", label: "Continuous", pattern: [] },
  hidden: { name: "hidden", label: "Hidden", pattern: [2, 1.5] },
  center: { name: "center", label: "Center", pattern: [10, 2, 2, 2] },
  phantom: { name: "phantom", label: "Phantom", pattern: [12, 2, 2, 2, 2, 2] },
  dashed: { name: "dashed", label: "Dashed", pattern: [4, 2] },
  dashdot: { name: "dashdot", label: "Dash-dot", pattern: [8, 2, 1, 2] },
  dotted: { name: "dotted", label: "Dotted", pattern: [0.5, 2] },
  property: {
    name: "property",
    label: "Property line",
    pattern: [14, 3, 3, 3],
  },
  break: { name: "break", label: "Break", pattern: [6, 2, 1, 2] },
  matchline: { name: "matchline", label: "Match line", pattern: [16, 3, 3, 3] },
};

/** The dash pattern (mm) for a line type — empty array for continuous. */
export function lineTypePattern(name: LineTypeName): number[] {
  return LINE_TYPES[name]?.pattern ?? [];
}

// --- drawing scales --------------------------------------------------------

/**
 * Imperial architectural scales are quoted as `x" = 1'-0"`, i.e. `x` paper
 * inches represents 12 model inches, so modelPerPaper = 12 / x.
 */
function arch(
  id: string,
  label: string,
  paperInchesPerFoot: number,
): DrawingScale {
  return {
    id,
    label,
    system: "architectural",
    modelPerPaper: 12 / paperInchesPerFoot,
  };
}

/**
 * Imperial engineering scales are quoted as `1" = N'`, i.e. one paper inch
 * represents N model feet (12·N model inches), so modelPerPaper = 12·N.
 */
function eng(id: string, label: string, feetPerInch: number): DrawingScale {
  return { id, label, system: "engineering", modelPerPaper: 12 * feetPerInch };
}

/** Metric ratios are direct: `1:N` → N model units per paper unit. */
function metric(n: number): DrawingScale {
  return { id: `1:${n}`, label: `1:${n}`, system: "metric", modelPerPaper: n };
}

export const DRAWING_SCALES: DrawingScale[] = [
  arch("arch-1-16", '1/16" = 1\'-0"', 1 / 16),
  arch("arch-3-32", '3/32" = 1\'-0"', 3 / 32),
  arch("arch-1-8", '1/8" = 1\'-0"', 1 / 8),
  arch("arch-3-16", '3/16" = 1\'-0"', 3 / 16),
  arch("arch-1-4", '1/4" = 1\'-0"', 1 / 4),
  arch("arch-3-8", '3/8" = 1\'-0"', 3 / 8),
  arch("arch-1-2", '1/2" = 1\'-0"', 1 / 2),
  arch("arch-3-4", '3/4" = 1\'-0"', 3 / 4),
  arch("arch-1", '1" = 1\'-0"', 1),
  arch("arch-1-1-2", '1-1/2" = 1\'-0"', 1.5),
  arch("arch-3", '3" = 1\'-0"', 3),
  eng("eng-10", "1\" = 10'", 10),
  eng("eng-20", "1\" = 20'", 20),
  eng("eng-30", "1\" = 30'", 30),
  eng("eng-40", "1\" = 40'", 40),
  eng("eng-50", "1\" = 50'", 50),
  eng("eng-60", "1\" = 60'", 60),
  eng("eng-100", "1\" = 100'", 100),
  eng("eng-200", "1\" = 200'", 200),
  metric(1),
  metric(5),
  metric(10),
  metric(20),
  metric(50),
  metric(100),
  metric(200),
  metric(500),
  metric(1000),
];

const SCALE_BY_ID = new Map(DRAWING_SCALES.map((s) => [s.id, s]));

/** Look up a drawing scale by id (falls back to 1"=20'). */
export function drawingScale(id: string): DrawingScale {
  return SCALE_BY_ID.get(id) ?? SCALE_BY_ID.get("eng-20")!;
}

/** Model units per paper unit for a named scale. */
export function scaleRatio(id: string): number {
  return drawingScale(id).modelPerPaper;
}

/** Human label for a named scale. */
export function formatScale(id: string): string {
  return drawingScale(id).label;
}

// --- disciplines (NCS designators) -----------------------------------------

/** Human name for each discipline designator. */
export const DISCIPLINES: Record<DisciplineCode, string> = {
  G: "General",
  H: "Hazardous Materials",
  V: "Survey / Mapping",
  B: "Geotechnical",
  C: "Civil",
  L: "Landscape",
  S: "Structural",
  A: "Architectural",
  I: "Interiors",
  Q: "Equipment",
  F: "Fire Protection",
  P: "Plumbing",
  D: "Process",
  M: "Mechanical",
  E: "Electrical",
  W: "Distributed Energy",
  T: "Telecommunications",
  R: "Resource",
  X: "Other Disciplines",
  Z: "Contractor / Shop Drawings",
  O: "Operations",
};

/** Canonical ordering of disciplines for sheet-set sorting. */
export const DISCIPLINE_ORDER: DisciplineCode[] = [
  "G",
  "H",
  "V",
  "B",
  "C",
  "L",
  "S",
  "A",
  "I",
  "Q",
  "F",
  "P",
  "D",
  "M",
  "E",
  "W",
  "T",
  "R",
  "X",
  "Z",
  "O",
];

/** Name for a discipline code. */
export function disciplineName(code: DisciplineCode): string {
  return DISCIPLINES[code] ?? code;
}

// --- CAD layers (NCS / AIA long format) ------------------------------------

/** Format an NCS/AIA layer name from its parts. */
export function formatLayerName(
  discipline: DisciplineCode,
  major: string,
  minor?: string,
): string {
  const base = `${discipline}-${major.toUpperCase()}`;
  return minor ? `${base}-${minor.toUpperCase()}` : base;
}

/** Build a CAD layer, formatting its name from the parts. */
export function cadLayer(
  discipline: DisciplineCode,
  major: string,
  attrs: {
    minor?: string;
    color: string;
    lineWeight: LineWeightName;
    lineType?: LineTypeName;
    plot?: boolean;
  },
): CadLayer {
  return {
    name: formatLayerName(discipline, major, attrs.minor),
    discipline,
    major: major.toUpperCase(),
    minor: attrs.minor?.toUpperCase(),
    color: attrs.color,
    lineWeight: attrs.lineWeight,
    lineType: attrs.lineType ?? "continuous",
    plot: attrs.plot ?? true,
  };
}

/** A standard starter layer set spanning the common disciplines. */
export const STANDARD_CAD_LAYERS: CadLayer[] = [
  cadLayer("G", "ANNO", {
    minor: "TTLB",
    color: "#0f172a",
    lineWeight: "thin",
  }),
  cadLayer("C", "PROP", {
    color: "#0f172a",
    lineWeight: "wide",
    lineType: "property",
  }),
  cadLayer("C", "TOPO", { color: "#92400e", lineWeight: "thin" }),
  cadLayer("C", "ROAD", { color: "#334155", lineWeight: "medium" }),
  cadLayer("C", "ESMT", {
    color: "#7c3aed",
    lineWeight: "thin",
    lineType: "dashdot",
  }),
  cadLayer("L", "PLNT", { color: "#15803d", lineWeight: "thin" }),
  cadLayer("S", "GRID", {
    color: "#64748b",
    lineWeight: "thin",
    lineType: "center",
  }),
  cadLayer("A", "WALL", {
    minor: "FULL",
    color: "#0f172a",
    lineWeight: "wide",
  }),
  cadLayer("A", "GLAZ", { color: "#0284c7", lineWeight: "thin" }),
  cadLayer("A", "DOOR", { color: "#0f172a", lineWeight: "light" }),
  cadLayer("A", "ANNO", {
    minor: "DIMS",
    color: "#0f172a",
    lineWeight: "fine",
  }),
  cadLayer("A", "ROOM", { color: "#475569", lineWeight: "fine" }),
];

// --- plot styles -----------------------------------------------------------

/** Common plot styles (monochrome and grayscale). */
export const PLOT_STYLES: PlotStyle[] = [
  { name: "Monochrome", screening: 100 },
  { name: "Grayscale 50%", screening: 50 },
  { name: "Screened 25%", screening: 25 },
];
