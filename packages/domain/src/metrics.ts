/**
 * Planning metrics — coverage, density, floor-area ratio, and land-use
 * allocation — computed over a {@link Site}. These are the numbers the metrics
 * panel shows live; keeping them here means the client, services, and tooling
 * report identical figures.
 */

import type { Polygon } from "./geometry";
import { boundaryArea, type EdgeArcs } from "./curve";
import type { AreaUnit } from "./spatial";
import { areaToSquareMeters, squareMetersTo } from "./spatial";
import type { Building, LandUse, Lot, Parcel, Site } from "./primitives";
import type { LandUseCategory } from "./landuse";
import { landUseDefinition } from "./landuse";

/** Exact plan-unit area of one region, honoring any curved edges. */
function regionArea(el: { boundary: Polygon; arcs?: EdgeArcs }): number {
  return boundaryArea(el.boundary, el.arcs);
}

/** Sum of raw plan-unit areas for a set of elements' boundaries. */
function totalPlanArea(elements: { boundary: Polygon; arcs?: EdgeArcs }[]): number {
  return elements.reduce((sum, e) => sum + regionArea(e), 0);
}

function elementsOfKind<K extends Site["elements"][number]["kind"]>(
  site: Site,
  kind: K,
): Extract<Site["elements"][number], { kind: K }>[] {
  return site.elements.filter((e) => e.kind === kind) as Extract<
    Site["elements"][number],
    { kind: K }
  >[];
}

/** Total site area (sum of all parcels), reported in `unit`. */
export function siteArea(site: Site, unit: AreaUnit = "sqm"): number {
  const parcels = elementsOfKind(site, "parcel") as Parcel[];
  const planArea = totalPlanArea(parcels);
  return squareMetersTo(areaToSquareMeters(planArea, site.spatial), unit);
}

/** Total building footprint area, reported in `unit`. */
export function builtArea(site: Site, unit: AreaUnit = "sqm"): number {
  const buildings = elementsOfKind(site, "building") as Building[];
  const planArea = totalPlanArea(buildings);
  return squareMetersTo(areaToSquareMeters(planArea, site.spatial), unit);
}

/** Gross floor area = Σ(footprint × storeys), reported in `unit`. */
export function grossFloorArea(site: Site, unit: AreaUnit = "sqm"): number {
  const buildings = elementsOfKind(site, "building") as Building[];
  const planArea = buildings.reduce(
    (sum, b) => sum + regionArea(b) * Math.max(1, b.storeys),
    0,
  );
  return squareMetersTo(areaToSquareMeters(planArea, site.spatial), unit);
}

/**
 * Coverage: fraction of site (parcel) area occupied by building footprints.
 * Returns 0 when there is no parcel area. Clamped to [0, 1].
 */
export function coverage(site: Site): number {
  const site_ = siteArea(site, "sqm");
  if (site_ <= 0) return 0;
  return clamp01(builtArea(site, "sqm") / site_);
}

/** Floor Area Ratio: gross floor area ÷ site area. */
export function floorAreaRatio(site: Site): number {
  const site_ = siteArea(site, "sqm");
  if (site_ <= 0) return 0;
  return grossFloorArea(site, "sqm") / site_;
}

/** Total dwelling units across all buildings. */
export function dwellingUnits(site: Site): number {
  const buildings = elementsOfKind(site, "building") as Building[];
  return buildings.reduce((sum, b) => sum + (b.dwellingUnits ?? 0), 0);
}

/** Residential density in dwelling units per acre. */
export function density(site: Site): number {
  const acres = siteArea(site, "acres");
  if (acres <= 0) return 0;
  return dwellingUnits(site) / acres;
}

/** Number of lots in the plan. */
export function lotCount(site: Site): number {
  return (elementsOfKind(site, "lot") as Lot[]).length;
}

/**
 * Impervious-surface ratio: fraction of site area under impervious cover.
 * Uses land-use areas classified as impervious plus all building footprints.
 */
export function imperviousRatio(site: Site): number {
  const site_ = siteArea(site, "sqm");
  if (site_ <= 0) return 0;
  const landUses = elementsOfKind(site, "landuse") as LandUse[];
  const imperviousLandUse = landUses
    .filter((l) => landUseDefinition(l.category).impervious)
    .reduce((sum, l) => sum + regionArea(l), 0);
  const impSqm =
    areaToSquareMeters(imperviousLandUse, site.spatial) + builtArea(site, "sqm");
  return clamp01(impSqm / site_);
}

/** Open-space ratio: fraction of site area classified as open space. */
export function openSpaceRatio(site: Site): number {
  const site_ = siteArea(site, "sqm");
  if (site_ <= 0) return 0;
  const landUses = elementsOfKind(site, "landuse") as LandUse[];
  const openSqm = landUses
    .filter((l) => landUseDefinition(l.category).openSpace)
    .reduce((sum, l) => sum + areaToSquareMeters(regionArea(l), site.spatial), 0);
  return clamp01(openSqm / site_);
}

/** A single slice of the land-use allocation breakdown. */
export interface LandUseAllocation {
  category: LandUseCategory;
  label: string;
  color: string;
  /** Area in the requested unit. */
  area: number;
  /** Share of total allocated land use (0–1). */
  share: number;
}

/**
 * Land-use allocation: how designated land-use area is distributed across
 * categories, sorted largest-first. Shares are relative to total land-use area.
 */
export function landUseBreakdown(site: Site, unit: AreaUnit = "sqm"): LandUseAllocation[] {
  const landUses = elementsOfKind(site, "landuse") as LandUse[];
  const byCategory = new Map<LandUseCategory, number>();
  for (const lu of landUses) {
    const sqm = areaToSquareMeters(regionArea(lu), site.spatial);
    byCategory.set(lu.category, (byCategory.get(lu.category) ?? 0) + sqm);
  }
  const totalSqm = [...byCategory.values()].reduce((a, b) => a + b, 0);

  return [...byCategory.entries()]
    .map(([category, sqm]) => {
      const def = landUseDefinition(category);
      return {
        category,
        label: def.label,
        color: def.color,
        area: squareMetersTo(sqm, unit),
        share: totalSqm > 0 ? sqm / totalSqm : 0,
      };
    })
    .sort((a, b) => b.area - a.area);
}

/** A snapshot of the headline metrics for a site. */
export interface SiteMetrics {
  siteArea: number;
  builtArea: number;
  grossFloorArea: number;
  coverage: number;
  floorAreaRatio: number;
  density: number;
  dwellingUnits: number;
  lotCount: number;
  imperviousRatio: number;
  openSpaceRatio: number;
  areaUnit: AreaUnit;
  allocation: LandUseAllocation[];
}

/** Compute all headline metrics for a site in one pass-friendly call. */
export function computeSiteMetrics(site: Site, unit: AreaUnit = "sqm"): SiteMetrics {
  return {
    siteArea: siteArea(site, unit),
    builtArea: builtArea(site, unit),
    grossFloorArea: grossFloorArea(site, unit),
    coverage: coverage(site),
    floorAreaRatio: floorAreaRatio(site),
    density: density(site),
    dwellingUnits: dwellingUnits(site),
    lotCount: lotCount(site),
    imperviousRatio: imperviousRatio(site),
    openSpaceRatio: openSpaceRatio(site),
    areaUnit: unit,
    allocation: landUseBreakdown(site, unit),
  };
}

/** Community-scale metrics derived from the plan and an assumed household size. */
export interface CommunityMetrics {
  dwellingUnits: number;
  /** Estimated resident population = dwelling units × household size. */
  population: number;
  /** Residents per square kilometre of site. */
  populationPerSquareKm: number;
  /** Open-space + park land per resident, in square metres. */
  openSpacePerCapitaSqM: number;
  /** Park land per 1,000 residents, in acres (a common LOS standard). */
  parkAcresPerThousand: number;
  householdSize: number;
}

/** Compute community-scale metrics. `householdSize` defaults to 2.5 persons. */
export function computeCommunityMetrics(site: Site, householdSize = 2.5): CommunityMetrics {
  const du = dwellingUnits(site);
  const population = du * householdSize;
  const siteSqKm = siteArea(site, "sqkm");
  const siteSqM = siteArea(site, "sqm");

  const landUses = elementsOfKind(site, "landuse") as LandUse[];
  const openSqM = landUses
    .filter((l) => landUseDefinition(l.category).openSpace)
    .reduce((sum, l) => sum + areaToSquareMeters(regionArea(l), site.spatial), 0);
  const parkSqM = landUses
    .filter((l) => l.category === "park")
    .reduce((sum, l) => sum + areaToSquareMeters(regionArea(l), site.spatial), 0);
  void siteSqM;

  return {
    dwellingUnits: du,
    population,
    populationPerSquareKm: siteSqKm > 0 ? population / siteSqKm : 0,
    openSpacePerCapitaSqM: population > 0 ? openSqM / population : 0,
    parkAcresPerThousand: population > 0 ? squareMetersTo(parkSqM, "acres") / (population / 1000) : 0,
    householdSize,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
