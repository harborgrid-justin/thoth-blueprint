import type { Polyline } from "../../spatial/geometry";

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

/** Civil/erosion-control point symbols placed on a plan sheet. */
export type CivilSymbolType =
  | "inlet-protection"
  | "ditch-check"
  | "culvert"
  | "erosion-bale"
  | "riprap"
  | "sign"
  | "flow-arrow"
  | "stabilized-entrance"
  | "silt-basin";

/** A placed civil symbol (box-X inlet protection, ditch check, culvert, …). */
export interface CivilSymbol {
  id: string;
  type: CivilSymbolType;
  position: { x: number; y: number };
  rotationDeg?: number;
  label?: string;
}
