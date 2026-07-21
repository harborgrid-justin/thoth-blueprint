/**
 * Built-in GEOID Plugins — Standard State, County, and County Subdivision presets.
 *
 * Demonstrates hierarchical inheritance:
 * State (2) -> County (5) -> County Subdivision (10)
 */

import { geoidRegistry } from "./registry.js";
import type { LocalCodePlugin } from "./types.js";

// Import data payloads from JSON
import txData from "./data/48/_state/index.json";
import harrisData from "./data/48/201/_county/index.json";
import pasadenaData from "./data/48/201/92975/index.json";
import gaData from "./data/13/_state/index.json";
import newtonData from "./data/13/217/_county/index.json";
import caData from "./data/06/_state/index.json";
import laData from "./data/06/037/_county/index.json";
import vaData from "./data/51/_state/index.json";
import pwcData from "./data/51/153/_county/index.json";

/** Texas State GEOID Plugin (GEOID: 48) */
export const TEXAS_STATE_PLUGIN = txData as unknown as LocalCodePlugin;

/** Harris County, TX GEOID Plugin (GEOID: 48201) */
export const HARRIS_COUNTY_PLUGIN = harrisData as unknown as LocalCodePlugin;

/** Pasadena CCD, Harris County, TX GEOID Plugin (GEOID: 4820192975) */
export const PASADENA_CCD_PLUGIN = pasadenaData as unknown as LocalCodePlugin;

/** Georgia State GEOID Plugin (GEOID: 13) */
export const GEORGIA_STATE_PLUGIN = gaData as unknown as LocalCodePlugin;

/** Newton County, GA GEOID Plugin (GEOID: 13217) */
export const NEWTON_COUNTY_GEOID_PLUGIN = newtonData as unknown as LocalCodePlugin;

/** California State GEOID Plugin (GEOID: 06) */
export const CALIFORNIA_STATE_PLUGIN = caData as unknown as LocalCodePlugin;

/** Los Angeles County, CA GEOID Plugin (GEOID: 06037) */
export const LOS_ANGELES_COUNTY_PLUGIN = laData as unknown as LocalCodePlugin;

/** Virginia State GEOID Plugin (GEOID: 51) */
export const VIRGINIA_STATE_PLUGIN = vaData as unknown as LocalCodePlugin;

/** Prince William County, VA GEOID Plugin (GEOID: 51153) */
export const PRINCE_WILLIAM_COUNTY_GEOID_PLUGIN = pwcData as unknown as LocalCodePlugin;

/** Preset array of standard built-in plugins. */
export const PRESET_GEOID_PLUGINS: LocalCodePlugin[] = [
  TEXAS_STATE_PLUGIN,
  HARRIS_COUNTY_PLUGIN,
  PASADENA_CCD_PLUGIN,
  GEORGIA_STATE_PLUGIN,
  NEWTON_COUNTY_GEOID_PLUGIN,
  CALIFORNIA_STATE_PLUGIN,
  LOS_ANGELES_COUNTY_PLUGIN,
  VIRGINIA_STATE_PLUGIN,
  PRINCE_WILLIAM_COUNTY_GEOID_PLUGIN,
];

/** Utility to register all standard built-in plugins into the default registry. */
export function registerDefaultGeoidPlugins(): void {
  for (const plugin of PRESET_GEOID_PLUGINS) {
    geoidRegistry.register(plugin);
  }
}
