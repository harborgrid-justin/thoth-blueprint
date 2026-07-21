import type { AreaUnit } from "../../spatial/spatial";
import type { LandUseCategory } from "./landuse";

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
