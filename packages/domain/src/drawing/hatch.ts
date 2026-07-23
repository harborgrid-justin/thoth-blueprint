/**
 * Hatch pattern registry — the standardized fills that give a drawing its
 * material read: diagonal (ANSI31), crosshatch, concrete, earth, gravel, sand,
 * steel, insulation, and so on. This is the framework-agnostic *spec* (angle,
 * spacing, weight); the web layer renders each id as an SVG `<pattern>` or a PDF
 * tiled fill.
 */

import type { HatchKind, HatchPattern } from "./types/hatch";
import { globalPartsDb } from "../parts/registry";

export type { HatchKind, HatchPattern };

const catalogHatchParts = globalPartsDb.getHatchPatterns();

/** The standard hatch patterns. */
export const HATCH_PATTERNS: HatchPattern[] = [
  {
    id: (catalogHatchParts[0]?.properties?.patternName as string)?.toLowerCase() || "ansi31",
    label: catalogHatchParts[0]?.name || "ANSI31 (diagonal)",
    kind: "lines",
    angleDeg: (catalogHatchParts[0]?.properties?.angleDegrees as number) || 45,
    spacing: 2.5,
    lineWeight: "fine",
    color: "#334155",
  },
  {
    id: "ansi37",
    label: "ANSI37 (crosshatch)",
    kind: "crosshatch",
    angleDeg: 45,
    spacing: 2.5,
    lineWeight: "fine",
    color: "#334155",
  },
  {
    id: "concrete",
    label: "Concrete",
    kind: "dots",
    angleDeg: 0,
    spacing: 2,
    lineWeight: "fine",
    color: "#64748b",
  },
  {
    id: "earth",
    label: "Earth",
    kind: "lines",
    angleDeg: 45,
    spacing: 3,
    lineWeight: "fine",
    color: "#92400e",
  },
  {
    id: "gravel",
    label: "Gravel",
    kind: "dots",
    angleDeg: 0,
    spacing: 2.5,
    lineWeight: "fine",
    color: "#78716c",
  },
  {
    id: "sand",
    label: "Sand",
    kind: "dots",
    angleDeg: 0,
    spacing: 1.4,
    lineWeight: "fine",
    color: "#a16207",
  },
  {
    id: "steel",
    label: "Steel",
    kind: "lines",
    angleDeg: 45,
    spacing: 1.8,
    lineWeight: "thin",
    color: "#1e293b",
  },
  {
    id: "insulation",
    label: "Insulation (batt)",
    kind: "lines",
    angleDeg: 0,
    spacing: 3,
    lineWeight: "fine",
    color: "#0ea5e9",
  },
  {
    id: "brick",
    label: "Brick",
    kind: "grid",
    angleDeg: 0,
    spacing: 3,
    lineWeight: "fine",
    color: "#b91c1c",
  },
  {
    id: "water",
    label: "Water",
    kind: "lines",
    angleDeg: 0,
    spacing: 2.5,
    lineWeight: "fine",
    color: "#0284c7",
  },
  {
    id: "wood",
    label: "Wood",
    kind: "lines",
    angleDeg: 0,
    spacing: 1.6,
    lineWeight: "fine",
    color: "#a16207",
  },
  {
    id: "grass",
    label: "Grass / turf",
    kind: "dots",
    angleDeg: 0,
    spacing: 3,
    lineWeight: "fine",
    color: "#15803d",
  },
];

const BY_ID = new Map(HATCH_PATTERNS.map((h) => [h.id, h]));

/** Look up a hatch pattern by id. */
export function hatchPattern(id: string): HatchPattern | undefined {
  return BY_ID.get(id);
}

/**
 * Material → hatch id mapping keyed by element kind / land-use category /
 * building material. Supersedes ad-hoc per-element switches.
 */
export const MATERIAL_HATCH: Record<string, string> = {
  water: "water",
  wetland: "water",
  concrete: "concrete",
  gravel: "gravel",
  earth: "earth",
  grade: "earth",
  planting: "grass",
  openspace: "grass",
  park: "grass",
  agricultural: "earth",
  building: "concrete",
  wall: "concrete",
  steel: "steel",
  masonry: "brick",
  wood: "wood",
  insulation: "insulation",
};

/** Resolve a hatch id for a material/kind key, if any. */
export function hatchForMaterial(key: string | undefined): string | undefined {
  return key ? MATERIAL_HATCH[key] : undefined;
}
