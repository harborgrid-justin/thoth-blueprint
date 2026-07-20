/**
 * Civil / erosion-control line features — the special linear symbology a
 * construction plan sheet carries (silt fence, tree line, construction fence,
 * slope-intercept / daylight lines, and surface-water flow). Each is a polyline
 * drawn with a distinctive drafting symbol rather than a plain stroke.
 */

import type { Point, Polyline } from "../spatial/geometry";

export type ControlLineType =
  | "silt-fence"
  | "tree-line"
  | "construction-fence"
  | "slope-intercept"
  | "flow";

/** A civil control feature: a typed polyline with special symbology. */
export interface ControlLine {
  id: string;
  type: ControlLineType;
  path: Polyline;
  label?: string;
}

export interface ControlLineDefinition {
  type: ControlLineType;
  label: string;
}

export const CONTROL_LINE_DEFINITIONS: ControlLineDefinition[] = [
  { type: "silt-fence", label: "Silt fence" },
  { type: "tree-line", label: "Tree line / clearing limit" },
  { type: "construction-fence", label: "Construction fence" },
  { type: "slope-intercept", label: "Slope intercept" },
  { type: "flow", label: "Surface-water flow" },
];

const BY_TYPE = new Map(CONTROL_LINE_DEFINITIONS.map((d) => [d.type, d]));

export function controlLineDefinition(type: ControlLineType): ControlLineDefinition {
  return BY_TYPE.get(type) ?? { type, label: type };
}

// --- point symbols ---------------------------------------------------------

/** Civil/erosion-control point symbols placed on a plan sheet. */
export type CivilSymbolType =
  | "inlet-protection"
  | "ditch-check"
  | "culvert"
  | "erosion-bale"
  | "riprap"
  | "sign"
  | "flow-arrow";

/** A placed civil symbol (box-X inlet protection, ditch check, culvert, …). */
export interface CivilSymbol {
  id: string;
  type: CivilSymbolType;
  position: Point;
  /** Rotation in degrees, for directional symbols (arrows, ditch checks). */
  rotation?: number;
  /** Inlet-protection type letter (A/B/C) or other qualifier. */
  subtype?: string;
  label?: string;
}

export interface CivilSymbolDefinition {
  type: CivilSymbolType;
  label: string;
}

export const CIVIL_SYMBOL_DEFINITIONS: CivilSymbolDefinition[] = [
  { type: "inlet-protection", label: "Inlet protection (A/B/C)" },
  { type: "ditch-check", label: "Ditch check" },
  { type: "culvert", label: "Culvert pipe" },
  { type: "erosion-bale", label: "Erosion bale / barrier" },
  { type: "riprap", label: "Rip-rap / stone" },
  { type: "sign", label: "Sign" },
  { type: "flow-arrow", label: "Surface-water flow" },
];

const SYMBOL_BY_TYPE = new Map(CIVIL_SYMBOL_DEFINITIONS.map((d) => [d.type, d]));

export function civilSymbolDefinition(type: CivilSymbolType): CivilSymbolDefinition {
  return SYMBOL_BY_TYPE.get(type) ?? { type, label: type };
}
