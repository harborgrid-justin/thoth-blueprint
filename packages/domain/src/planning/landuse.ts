/**
 * Land-use categories and their presentation. The set of categories is a
 * domain concern (they drive allocation metrics and compliance), so the
 * canonical registry lives here rather than in the UI.
 */

import type { LandUseCategory, LandUseDefinition } from "./types/landuse";

export type { LandUseCategory, LandUseDefinition };

/** The canonical, ordered registry of land-use categories. */
export const LAND_USE_DEFINITIONS: readonly LandUseDefinition[] = [
  {
    category: "residential",
    label: "Residential",
    color: "#f59e0b",
    impervious: true,
    openSpace: false,
    description: "Housing: single-family, multifamily, and mixed residential.",
  },
  {
    category: "commercial",
    label: "Commercial",
    color: "#ef4444",
    impervious: true,
    openSpace: false,
    description: "Retail, office, and services.",
  },
  {
    category: "mixed-use",
    label: "Mixed-Use",
    color: "#ec4899",
    impervious: true,
    openSpace: false,
    description: "Combined residential and commercial in one area.",
  },
  {
    category: "civic",
    label: "Civic",
    color: "#8b5cf6",
    impervious: true,
    openSpace: false,
    description: "Schools, government, cultural, and institutional uses.",
  },
  {
    category: "industrial",
    label: "Industrial",
    color: "#6b7280",
    impervious: true,
    openSpace: false,
    description: "Manufacturing, warehousing, and utilities.",
  },
  {
    category: "park",
    label: "Park",
    color: "#22c55e",
    impervious: false,
    openSpace: true,
    description: "Public parks and recreation as a designated land use.",
  },
  {
    category: "open-space",
    label: "Open Space",
    color: "#14b8a6",
    impervious: false,
    openSpace: true,
    description: "Unbuilt reserved land and common areas.",
  },
  {
    category: "agricultural",
    label: "Agricultural",
    color: "#84cc16",
    impervious: false,
    openSpace: true,
    description: "Farmland and cultivated open land.",
  },
  {
    category: "infrastructure",
    label: "Infrastructure",
    color: "#0ea5e9",
    impervious: true,
    openSpace: false,
    description: "Rights-of-way, streets, and utility corridors.",
  },
  {
    category: "unassigned",
    label: "Unassigned",
    color: "#94a3b8",
    impervious: false,
    openSpace: false,
    description: "Land with no designated use yet.",
  },
] as const;

const BY_CATEGORY = new Map<LandUseCategory, LandUseDefinition>(
  LAND_USE_DEFINITIONS.map((d) => [d.category, d]),
);

/** Look up the definition for a category (falls back to `unassigned`). */
export function landUseDefinition(category: LandUseCategory): LandUseDefinition {
  return BY_CATEGORY.get(category) ?? BY_CATEGORY.get("unassigned")!;
}

/** The stable color for a land-use category. */
export function landUseColor(category: LandUseCategory): string {
  return landUseDefinition(category).color;
}

/** The display label for a land-use category. */
export function landUseLabel(category: LandUseCategory): string {
  return landUseDefinition(category).label;
}
