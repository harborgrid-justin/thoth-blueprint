import { METERS_PER_UNIT, type Unit } from "../../spatial/spatial";
import { scaleRatio } from "../drafting";
import type { PaperUnit } from "../types/sheetsize";

const METERS_PER_PAPER_UNIT: Record<PaperUnit, number> = {
  in: 0.0254,
  mm: 0.001,
};

const IN_PER_MM = 1 / 25.4;

/**
 * Paper units per one model unit for a named scale, given the model's length
 * unit and the sheet's paper unit. A drawing scale is a dimensionless real-to-
 * paper ratio (e.g. 1"=20' → 240, 1:100 → 100); this reconciles the unit
 * families through metres so the result is unambiguous.
 */
export function paperPerModel(scaleId: string, modelUnit: Unit, paperUnit: PaperUnit): number {
  const ratio = scaleRatio(scaleId);
  return METERS_PER_UNIT[modelUnit] / (ratio * METERS_PER_PAPER_UNIT[paperUnit]);
}

/** Convert a paper measure to PDF points (1 in = 72 pt). */
export function paperToPoints(value: number, unit: PaperUnit): number {
  return unit === "in" ? value * 72 : value * IN_PER_MM * 72;
}
