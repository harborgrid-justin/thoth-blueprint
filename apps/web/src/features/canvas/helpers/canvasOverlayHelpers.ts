import {
  LAND_USE_DEFINITIONS,
  type LandUseCategory,
  type Site,
} from "@thoth/domain";

/** Round a value to the nearest 1-2-5 × 10ⁿ below it (for tick spacing). */
export function niceNumber(value: number): number {
  if (value <= 0) {return 1;}
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  const factor = residual >= 5 ? 5 : residual >= 2 ? 2 : 1;
  return factor * magnitude;
}

/** Categories actually present among the plan's land-use elements. */
export function presentCategories(site: Site): LandUseCategory[] {
  const set = new Set<LandUseCategory>();
  for (const el of site.elements) {
    if (el.kind === "landuse") {set.add(el.category);}
    else if (el.kind === "building" && el.use) {set.add(el.use);}
  }
  return LAND_USE_DEFINITIONS.map((d) => d.category).filter((c) => set.has(c));
}
