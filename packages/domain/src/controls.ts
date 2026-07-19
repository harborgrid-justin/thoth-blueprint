/**
 * Civil / erosion-control line features — the special linear symbology a
 * construction plan sheet carries (silt fence, tree line, construction fence,
 * slope-intercept / daylight lines, and surface-water flow). Each is a polyline
 * drawn with a distinctive drafting symbol rather than a plain stroke.
 */

import type { Polyline } from "./geometry";

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
