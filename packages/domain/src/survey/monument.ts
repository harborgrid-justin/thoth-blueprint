/**
 * Survey monuments — the physical control a plat references and depicts with a
 * standard symbology legend: Permanent Reference Monuments (PRM), Permanent
 * Control Points (PCP), section/quarter corners, iron rods/pipes, rebar & cap,
 * nail & disc, concrete monuments, and benchmarks, each **found** or **set**.
 */

import type {
  MonumentType,
  MonumentStatus,
  SurveyMonument,
  MonumentDefinition,
} from "./types/monument";

export type {
  MonumentType,
  MonumentStatus,
  SurveyMonument,
  MonumentDefinition,
};

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
