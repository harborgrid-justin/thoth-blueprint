/**
 * GEOID Adapter — Integration layer between RegionPlugin and LocalCodePlugin.
 *
 * Allows existing RegionPlugin definitions (from planning/regions.ts) to be seamlessly
 * registered as GEOID location plugins.
 */

import type { RegionPlugin } from "../regions.js";
import type { LocalCodePlugin } from "./types.js";
import { parseGeoid } from "./utils.js";

/**
 * Convert a RegionPlugin into a GEOID LocalCodePlugin.
 *
 * @param region Region plugin (e.g. NEWTON_COUNTY_GA)
 * @param geoid Numerical Census GEOID identifier (e.g., "13217")
 */
export function regionToGeoidPlugin(
  region: RegionPlugin,
  geoid: string | number,
): LocalCodePlugin {
  const parsed = parseGeoid(geoid);
  const minLotAreaSqFt = region.standards?.minLotAreaAcres
    ? region.standards.minLotAreaAcres * 43560
    : undefined;

  return {
    geoid: parsed.raw || String(geoid),
    areaType: parsed.areaType,
    name: region.name,
    stateName: region.state,
    countyName: region.county,
    standards: {
      zoning: {
        frontSetback: region.standards?.frontSetback,
        sideSetback: region.standards?.sideSetback,
        rearSetback: region.standards?.rearSetback,
        minLotArea: minLotAreaSqFt,
        minRowWidth: region.standards?.minRowWidth,
      },
      custom: {
        surveyFramework: region.surveyFramework,
        defaults: region.defaults,
        certificatesCount: region.certificates?.length ?? 0,
      },
    },
    metadata: {
      regionPluginId: region.id,
      country: region.country,
    },
  };
}

/** Attach a GEOID string to a RegionPlugin object. */
export function attachGeoidToRegion<T extends RegionPlugin>(
  region: T,
  geoid: string | number,
): T & { geoid: string } {
  return {
    ...region,
    geoid: String(geoid),
  };
}
