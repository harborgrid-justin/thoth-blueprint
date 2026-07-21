/**
 * GEOID Local Code Plugin System — Type Definitions.
 *
 * Supports geographical classification (State = 2 digits, County = 5 digits,
 * County Subdivision = 10 digits) and multi-domain local standards (zoning,
 * stairs, egress, civil/erosion, custom key-value standards, and custom rule logic).
 */

import type { Site, ComplianceFinding } from "../../spatial/types";

/** Area classifications corresponding to US Census GEOID structure. */
export type GeoidAreaType = "state" | "county" | "cousub" | "unknown";

/** Parsed representation of a GEOID numerical code. */
export interface ParsedGeoid {
  /** The normalized raw input string. */
  raw: string;
  /** Recognized area classification based on digit length. */
  areaType: GeoidAreaType;
  /** 2-digit FIPS state code (e.g. "48" for Texas). */
  stateCode: string;
  /** 3-digit FIPS county code (e.g. "201" for Harris County). Present for county & cousub. */
  countyCode?: string;
  /** 5-digit FIPS county subdivision code. Present for cousub. */
  cousubCode?: string;
  /** 5-digit full county GEOID (stateCode + countyCode). Present for county & cousub. */
  fullCountyGeoid?: string;
  /** 10-digit full cousub GEOID (stateCode + countyCode + cousubCode). Present for cousub. */
  fullCousubGeoid?: string;
  /** Whether the GEOID string matches standard 2, 5, or 10 digit structure. */
  isValid: boolean;
}

/** Local Zoning & Site Development Standards. */
export interface ZoningStandards {
  frontSetback?: number;
  rearSetback?: number;
  sideSetback?: number;
  cornerSetback?: number;
  maxHeight?: number;
  maxFar?: number;
  maxCoverage?: number;
  minLotArea?: number;
  minRowWidth?: number;
  allowedUses?: string[];
}

/** Architectural Stair Design Standards. */
export interface StairStandards {
  maxRiserHeight?: number;
  minTreadDepth?: number;
  minStairWidth?: number;
  minHeadroom?: number;
  handrailHeightMin?: number;
  handrailHeightMax?: number;
}

/** Building Egress, Door, and Window Standards. */
export interface EgressStandards {
  minDoorWidth?: number;
  minDoorHeight?: number;
  minEgressWindowArea?: number;
  maxWindowSillHeight?: number;
}

/** Civil, Stormwater & Erosion Control Standards. */
export interface CivilErosionStandards {
  minSiltFenceBuffer?: number;
  maxDisturbedSlopePercent?: number;
  maxRunoffCoefficient?: number;
  streamBufferDistance?: number;
}

/** Flexible dynamic standard container. */
export interface LocalCodeStandards {
  zoning: ZoningStandards;
  stairs: StairStandards;
  egress: EgressStandards;
  civil: CivilErosionStandards;
  roads: Record<string, unknown>;
  electrical: Record<string, unknown>;
  mechanical: Record<string, unknown>;
  /** Flexible key-value extensions for custom jurisdiction rules. */
  custom: Record<string, unknown>;
}

/** Custom compliance evaluator function that plugins can provide. */
export type GeoidRuleEvaluator = (
  site: Site,
  resolvedCode: ResolvedLocalCode,
) => ComplianceFinding[];

/** Definition of a GEOID Location Plugin. */
export interface LocalCodePlugin {
  /** Numerical GEOID identifier ("48", "48201", "4820192975"). */
  geoid: string;
  /** Recognized area classification. */
  areaType: GeoidAreaType;
  /** Human readable title (e.g. "Harris County, TX"). */
  name: string;
  /** Optional parent state name. */
  stateName?: string;
  /** Optional parent county name. */
  countyName?: string;
  /** Optional county subdivision name. */
  cousubName?: string;
  /** Effective date of local code adoption (ISO format). */
  effectiveDate?: string;
  /** Legal or municipal code documentation link. */
  jurisdictionUrl?: string;
  /** Partial code standards defined or overridden by this plugin. */
  standards: {
    zoning?: Partial<ZoningStandards>;
    stairs?: Partial<StairStandards>;
    egress?: Partial<EgressStandards>;
    civil?: Partial<CivilErosionStandards>;
    roads?: Record<string, unknown>;
    electrical?: Record<string, unknown>;
    mechanical?: Record<string, unknown>;
    custom?: Record<string, unknown>;
  };
  /** Executable rule evaluators provided by this plugin. */
  customRules?: GeoidRuleEvaluator[];
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
}

/** Result of cascading resolution for a given GEOID. */
export interface ResolvedLocalCode {
  /** The target GEOID evaluated. */
  targetGeoid: string;
  /** Parsed target GEOID structure. */
  parsed: ParsedGeoid;
  /** Human-readable title of the resolved jurisdiction context. */
  name: string;
  /** Ordered resolution lineage (e.g., ["baseline", "48", "48201", "4820192975", "overrides"]). */
  resolutionChain: string[];
  /** List of plugins that contributed to the final resolved standards. */
  appliedPlugins: LocalCodePlugin[];
  /** Merged effective standards. */
  standards: LocalCodeStandards;
}
