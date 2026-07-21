/**
 * Civil / erosion-control line features — the special linear symbology a
 * construction plan sheet carries (silt fence, tree line, construction fence,
 * slope-intercept / daylight lines, and surface-water flow). Each is a polyline
 * drawn with a distinctive drafting symbol rather than a plain stroke.
 */

import type {
  ControlLineType,
  ControlLine,
  ControlLineDefinition,
  CivilSymbolType,
  CivilSymbol,
} from "./types/controls";

export type {
  ControlLineType,
  ControlLine,
  ControlLineDefinition,
  CivilSymbolType,
  CivilSymbol,
};

export const CONTROL_LINE_DEFINITIONS: ControlLineDefinition[] = [
  { type: "silt-fence", label: "Silt fence" },
  { type: "tree-line", label: "Tree line / clearing limit" },
  { type: "construction-fence", label: "Construction fence" },
  { type: "slope-intercept", label: "Slope intercept" },
  { type: "flow", label: "Surface-water flow" },
];

const BY_TYPE = new Map(CONTROL_LINE_DEFINITIONS.map((d) => [d.type, d]));

export function controlLineDefinition(
  type: ControlLineType,
): ControlLineDefinition {
  return BY_TYPE.get(type) ?? { type, label: type };
}

// --- point symbols ---------------------------------------------------------

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
  { type: "stabilized-entrance", label: "Stabilized construction entrance" },
  { type: "silt-basin", label: "Sediment basin / trap" },
];

const SYMBOL_BY_TYPE = new Map(
  CIVIL_SYMBOL_DEFINITIONS.map((d) => [d.type, d]),
);

export function civilSymbolDefinition(
  type: CivilSymbolType,
): CivilSymbolDefinition {
  return SYMBOL_BY_TYPE.get(type) ?? { type, label: type };
}
