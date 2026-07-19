import type { ElementKind, LandUseCategory } from "@thoth/domain";
import { landUseColor } from "@thoth/domain";

/** Presentation metadata for a planning element kind. */
export interface ElementKindMeta {
  kind: ElementKind;
  label: string;
  /** Default layer id new elements of this kind are created on. */
  defaultLayerId: string;
  /** Stroke color on the canvas. */
  stroke: string;
  /** Base fill color on the canvas (rendered with low opacity). */
  fill: string;
  /** Prefix used when auto-naming new elements. */
  namePrefix: string;
}

const META: Record<ElementKind, ElementKindMeta> = {
  region: {
    kind: "region",
    label: "Region",
    defaultLayerId: "layer-base",
    stroke: "#0d9488",
    fill: "#0d9488",
    namePrefix: "Region",
  },
  parcel: {
    kind: "parcel",
    label: "Parcel",
    defaultLayerId: "layer-base",
    stroke: "#64748b",
    fill: "#64748b",
    namePrefix: "Parcel",
  },
  block: {
    kind: "block",
    label: "Block",
    defaultLayerId: "layer-base",
    stroke: "#475569",
    fill: "#475569",
    namePrefix: "Block",
  },
  zone: {
    kind: "zone",
    label: "Zone",
    defaultLayerId: "layer-zoning",
    stroke: "#8b5cf6",
    fill: "#8b5cf6",
    namePrefix: "Zone",
  },
  landuse: {
    kind: "landuse",
    label: "Land Use",
    defaultLayerId: "layer-landuse",
    stroke: "#22c55e",
    fill: "#22c55e",
    namePrefix: "Land Use",
  },
  lot: {
    kind: "lot",
    label: "Lot",
    defaultLayerId: "layer-lots",
    stroke: "#0ea5e9",
    fill: "#0ea5e9",
    namePrefix: "Lot",
  },
  building: {
    kind: "building",
    label: "Building",
    defaultLayerId: "layer-buildings",
    stroke: "#f59e0b",
    fill: "#f59e0b",
    namePrefix: "Building",
  },
  row: {
    kind: "row",
    label: "Right-of-Way",
    defaultLayerId: "layer-row",
    stroke: "#94a3b8",
    fill: "#94a3b8",
    namePrefix: "ROW",
  },
  easement: {
    kind: "easement",
    label: "Easement",
    defaultLayerId: "layer-base",
    stroke: "#a855f7",
    fill: "#a855f7",
    namePrefix: "Easement",
  },
  openspace: {
    kind: "openspace",
    label: "Open Space",
    defaultLayerId: "layer-landuse",
    stroke: "#14b8a6",
    fill: "#14b8a6",
    namePrefix: "Open Space",
  },
  water: {
    kind: "water",
    label: "Water",
    defaultLayerId: "layer-landscape",
    stroke: "#0284c7",
    fill: "#38bdf8",
    namePrefix: "Water",
  },
  planting: {
    kind: "planting",
    label: "Planting",
    defaultLayerId: "layer-landscape",
    stroke: "#16a34a",
    fill: "#4ade80",
    namePrefix: "Planting",
  },
  grade: {
    kind: "grade",
    label: "Grading",
    defaultLayerId: "layer-terrain",
    stroke: "#b45309",
    fill: "#f59e0b",
    namePrefix: "Grade",
  },
  tree: {
    kind: "tree",
    label: "Tree",
    defaultLayerId: "layer-landscape",
    stroke: "#15803d",
    fill: "#22c55e",
    namePrefix: "Tree",
  },
  spot: {
    kind: "spot",
    label: "Spot Elevation",
    defaultLayerId: "layer-terrain",
    stroke: "#92400e",
    fill: "#d97706",
    namePrefix: "Spot",
  },
  note: {
    kind: "note",
    label: "Note",
    defaultLayerId: "layer-base",
    stroke: "#eab308",
    fill: "#eab308",
    namePrefix: "Note",
  },
};

export function elementMeta(kind: ElementKind): ElementKindMeta {
  return META[kind];
}

/** The canvas color for an element, honoring land-use category when relevant. */
export function elementColor(kind: ElementKind, category?: LandUseCategory): string {
  if (kind === "landuse" && category) return landUseColor(category);
  return META[kind].fill;
}
