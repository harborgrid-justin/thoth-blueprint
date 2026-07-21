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
import federalData from "./data/federalReference.json";

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
  climate: {
    ...federalData.standards.climate,
  },
  hydraulics: {
    ...federalData.standards.hydraulics,
  },
  geometry: {
    ...federalData.standards.geometry,
  },
  grading: {
    ...federalData.standards.grading,
  },
  subdivision: {
    ...federalData.standards.subdivision,
  },
  structural: {
    ...federalData.standards.structural,
  },
  erosion: {
    ...federalData.standards.erosion,
  },
  planProduction: {
    ...federalData.standards.planProduction,
  },
  drafting: {
    ...federalData.standards.drafting,
  },
  roads: {
    ...federalData.standards.roads,
  },
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
      }
    }

    let surveyFramework: "plss" | "georgia-land-lot" | "metes-and-bounds" | "texas-headright" | undefined;

    for (const plugin of appliedPlugins) {
      if (plugin.surveyFramework) {
        surveyFramework = plugin.surveyFramework;
      }
      if (plugin.standards) {
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
        if (plugin.standards.climate) {
          Object.assign(merged.climate, plugin.standards.climate);
        }
        if (plugin.standards.hydraulics) {
          Object.assign(merged.hydraulics, plugin.standards.hydraulics);
        }
        if (plugin.standards.geometry) {
          Object.assign(merged.geometry, plugin.standards.geometry);
        }
        if (plugin.standards.grading) {
          Object.assign(merged.grading, plugin.standards.grading);
        }
        if (plugin.standards.subdivision) {
          Object.assign(merged.subdivision, plugin.standards.subdivision);
        }
        if (plugin.standards.structural) {
          Object.assign(merged.structural, plugin.standards.structural);
        }
        if (plugin.standards.erosion) {
          Object.assign(merged.erosion, plugin.standards.erosion);
        }
        if (plugin.standards.planProduction) {
          Object.assign(merged.planProduction, plugin.standards.planProduction);
        }
        if (plugin.standards.drafting) {
          Object.assign(merged.drafting, plugin.standards.drafting);
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
      if (customOverrides.climate) {
        Object.assign(merged.climate, customOverrides.climate);
      }
      if (customOverrides.hydraulics) {
        Object.assign(merged.hydraulics, customOverrides.hydraulics);
      }
      if (customOverrides.geometry) {
        Object.assign(merged.geometry, customOverrides.geometry);
      }
      if (customOverrides.grading) {
        Object.assign(merged.grading, customOverrides.grading);
      }
      if (customOverrides.subdivision) {
        Object.assign(merged.subdivision, customOverrides.subdivision);
      }
      if (customOverrides.structural) {
        Object.assign(merged.structural, customOverrides.structural);
      }
      if (customOverrides.erosion) {
        Object.assign(merged.erosion, customOverrides.erosion);
      }
      if (customOverrides.planProduction) {
        Object.assign(merged.planProduction, customOverrides.planProduction);
      }
      if (customOverrides.drafting) {
        Object.assign(merged.drafting, customOverrides.drafting);
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
      surveyFramework,
      standards: merged,
    };
  }
}

/** Global default singleton instance of GeoidPluginRegistry. */
export const geoidRegistry = new GeoidPluginRegistry();

import { isSpatialElement } from "../../spatial/primitives";
import { bounds, unionBounds } from "../../spatial/geometry";
import type { Site } from "../../spatial/types";

/**
 * Generically configures site survey framework baselines (e.g. Georgia Land Lot, PLSS, Texas Headright)
 * based on the resolved GEOID metadata without ad-hoc jurisdiction checks.
 */
export function initializeSiteSurveyFramework(site: Site, resolvedCode: ResolvedLocalCode): Site {
  const framework = resolvedCode.surveyFramework;
  if (!framework) {
    return site;
  }

  const next: Site = { ...site };

  if (framework === "georgia-land-lot" && !site.landLot) {
    const boxes = site.elements
      .filter(isSpatialElement)
      .map((e) => bounds(e.boundary));
    const b = boxes.length ? unionBounds(boxes) : null;
    const nwCorner = b
      ? { x: b.minX - 20, y: b.minY - 20 }
      : { x: 0, y: 0 };
    next.landLot = {
      ref: {
        district: 9,
        landLot: 12,
        acres: (resolvedCode.standards as any)?.landLotAcres ?? 202.5,
      },
      nwCorner,
    };
  }

  return next;
}
