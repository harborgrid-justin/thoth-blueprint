/**
 * GEOID Plugin Registry & Cascading Resolution Engine.
 *
 * Implements standard resolution order:
 * Baseline National Standard -> State (2-digit) -> County (5-digit) -> Cousub (10-digit) -> Project Overrides
 */

import type {
  LocalCodePlugin,
  LocalCodeStandards,
  ResolvedLocalCode,
} from "./types.js";
import { getGeoidHierarchy, normalizeGeoid, parseGeoid } from "./utils.js";

/** Default national baseline code standards (IRC / IBC sensible defaults). */
export const DEFAULT_NATIONAL_STANDARDS: LocalCodeStandards = {
  zoning: {
    frontSetback: 25,
    rearSetback: 20,
    sideSetback: 10,
    cornerSetback: 15,
    maxHeight: 35,
    maxFar: 1.5,
    maxCoverage: 0.5,
    minLotArea: 5000,
    minRowWidth: 50,
    allowedUses: ["residential", "commercial", "industrial", "mixed-use"],
  },
  stairs: {
    maxRiserHeight: 7.75, // inches (or 0.6458 ft)
    minTreadDepth: 10.0, // inches (or 0.833 ft)
    minStairWidth: 36.0, // inches (or 3.0 ft)
    minHeadroom: 80.0, // inches (or 6.67 ft)
    handrailHeightMin: 34.0,
    handrailHeightMax: 38.0,
  },
  egress: {
    minDoorWidth: 32.0, // inches
    minDoorHeight: 80.0, // inches
    minEgressWindowArea: 5.7, // sq ft net clear opening
    maxWindowSillHeight: 44.0, // inches
  },
  civil: {
    minSiltFenceBuffer: 10,
    maxDisturbedSlopePercent: 30,
    maxRunoffCoefficient: 0.8,
    streamBufferDistance: 25,
  },
  roads: {},
  electrical: {},
  mechanical: {},
  custom: {},
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Registry managing GEOID plugins and resolving hierarchical local requirements. */
export class GeoidPluginRegistry {
  private plugins = new Map<string, LocalCodePlugin>();

  /** Register a location code plugin. Keyed by normalized GEOID. */
  public register(plugin: LocalCodePlugin): void {
    const key = normalizeGeoid(plugin.geoid);
    this.plugins.set(key, { ...plugin, geoid: key });
  }

  /** Unregister a plugin by GEOID. */
  public unregister(geoid: string | number): boolean {
    const key = normalizeGeoid(geoid);
    return this.plugins.delete(key);
  }

  /** Look up a specific plugin by exact GEOID. */
  public getPlugin(geoid: string | number): LocalCodePlugin | undefined {
    const key = normalizeGeoid(geoid);
    return this.plugins.get(key);
  }

  /** Clear all registered plugins. */
  public clear(): void {
    this.plugins.clear();
  }

  /** List all registered plugins. */
  public listPlugins(): LocalCodePlugin[] {
    return Array.from(this.plugins.values());
  }

  /** Find all plugins belonging to a given State GEOID (2 digits). */
  public getPluginsByState(stateGeoid: string | number): LocalCodePlugin[] {
    const parsedState = parseGeoid(stateGeoid);
    const targetState = parsedState.stateCode;
    return this.listPlugins().filter((p) => {
      const pParsed = parseGeoid(p.geoid);
      return pParsed.stateCode === targetState;
    });
  }

  /**
   * Resolve local code standards for a target GEOID by cascading:
   * Baseline -> State (2) -> County (5) -> Cousub (10) -> Custom Overrides.
   */
  public resolve(
    geoid: string | number,
    customOverrides?: Partial<LocalCodeStandards>,
  ): ResolvedLocalCode {
    const parsed = parseGeoid(geoid);
    const hierarchy = getGeoidHierarchy(geoid);
    // Reverse hierarchy so broadest scope (State 2) applies first, up to narrowest (Cousub 10)
    const ascChain = hierarchy.slice().reverse();

    const merged: LocalCodeStandards = deepClone(DEFAULT_NATIONAL_STANDARDS);
    const resolutionChain: string[] = ["baseline"];
    const appliedPlugins: LocalCodePlugin[] = [];
    let resolvedName = "Default National Standard";

    for (const key of ascChain) {
      const plugin = this.plugins.get(key);
      if (plugin) {
        appliedPlugins.push(plugin);
        resolutionChain.push(key);
        resolvedName = plugin.name;

        // Cascade zoning
        if (plugin.standards.zoning) {
          Object.assign(merged.zoning, plugin.standards.zoning);
        }
        // Cascade stairs
        if (plugin.standards.stairs) {
          Object.assign(merged.stairs, plugin.standards.stairs);
        }
        // Cascade egress
        if (plugin.standards.egress) {
          Object.assign(merged.egress, plugin.standards.egress);
        }
        // Cascade civil
        if (plugin.standards.civil) {
          Object.assign(merged.civil, plugin.standards.civil);
        }
        if (plugin.standards.roads) {
          Object.assign(merged.roads, plugin.standards.roads);
        }
        if (plugin.standards.electrical) {
          Object.assign(merged.electrical, plugin.standards.electrical);
        }
        if (plugin.standards.mechanical) {
          Object.assign(merged.mechanical, plugin.standards.mechanical);
        }
        // Cascade custom key-values
        if (plugin.standards.custom) {
          Object.assign(merged.custom, plugin.standards.custom);
        }
      }
    }

    if (customOverrides) {
      resolutionChain.push("project-overrides");
      if (customOverrides.zoning) {
        Object.assign(merged.zoning, customOverrides.zoning);
      }
      if (customOverrides.stairs) {
        Object.assign(merged.stairs, customOverrides.stairs);
      }
      if (customOverrides.egress) {
        Object.assign(merged.egress, customOverrides.egress);
      }
      if (customOverrides.civil) {
        Object.assign(merged.civil, customOverrides.civil);
      }
      if (customOverrides.roads) {
        Object.assign(merged.roads, customOverrides.roads);
      }
      if (customOverrides.electrical) {
        Object.assign(merged.electrical, customOverrides.electrical);
      }
      if (customOverrides.mechanical) {
        Object.assign(merged.mechanical, customOverrides.mechanical);
      }
      if (customOverrides.custom) {
        Object.assign(merged.custom, customOverrides.custom);
      }
    }

    return {
      targetGeoid: parsed.raw || String(geoid),
      parsed,
      name: resolvedName,
      resolutionChain,
      appliedPlugins,
      standards: merged,
    };
  }
}

/** Global default singleton instance of GeoidPluginRegistry. */
export const geoidRegistry = new GeoidPluginRegistry();
