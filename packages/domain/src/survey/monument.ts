/**
 * Survey monuments — the physical control a plat references and depicts with a
 * standard symbology legend: Permanent Reference Monuments (PRM), Permanent
 * Control Points (PCP), section/quarter corners, iron rods/pipes, rebar & cap,
 * nail & disc, concrete monuments, and benchmarks, each **found** or **set**.
 */

import type { Point } from "./geometry";

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

export const MONUMENT_DEFINITIONS: MonumentDefinition[] = [
  { type: "prm", label: "Permanent Reference Monument", abbrev: "PRM" },
  { type: "pcp", label: "Permanent Control Point", abbrev: "PCP" },
  { type: "section-corner", label: "Section corner", abbrev: "SEC COR" },
  { type: "quarter-corner", label: "Quarter corner", abbrev: "1/4 COR" },
  { type: "concrete", label: "Concrete monument", abbrev: "CM" },
  { type: "iron-rod", label: "Iron rod", abbrev: "IR" },
  { type: "iron-pipe", label: "Iron pipe", abbrev: "IP" },
  { type: "rebar-cap", label: "Rebar & cap", abbrev: "RB+C" },
  { type: "nail-disc", label: "Nail & disc", abbrev: "NL+D" },
  { type: "benchmark", label: "Benchmark", abbrev: "BM" },
];

const BY_TYPE = new Map(MONUMENT_DEFINITIONS.map((d) => [d.type, d]));

/** The definition for a monument type. */
export function monumentDefinition(type: MonumentType): MonumentDefinition {
  return BY_TYPE.get(type) ?? { type, label: type, abbrev: type.toUpperCase() };
}

/** Human label combining status and type, e.g. "Set PRM". */
export function monumentLabel(m: SurveyMonument): string {
  const def = monumentDefinition(m.type);
  const status = m.status === "set" ? "Set" : "Found";
  return `${status} ${def.abbrev}`;
}
