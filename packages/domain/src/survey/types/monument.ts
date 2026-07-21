import type { Point } from "../../spatial/geometry";

/** The kinds of survey monument a plat depicts. */
export type MonumentType =
  | "prm" // Permanent Reference Monument (e.g. 4"×4" concrete)
  | "pcp" // Permanent Control Point (e.g. nail & disc)
  | "section-corner"
  | "quarter-corner"
  | "iron-rod"
  | "iron-pipe"
  | "rebar-cap"
  | "nail-disc"
  | "concrete"
  | "benchmark";

/** Whether a monument was recovered (found) or newly placed (set). */
export type MonumentStatus = "found" | "set";

/** A survey monument at a plan position. */
export interface SurveyMonument {
  id: string;
  type: MonumentType;
  status: MonumentStatus;
  position: Point;
  /** Stamp/label, e.g. "PRM LB6685" or "PLS1079". */
  label?: string;
  note?: string;
}

/** Presentation metadata for a monument type. */
export interface MonumentDefinition {
  type: MonumentType;
  label: string;
  abbrev: string;
}
