/**
 * GEOID Local Code Compliance Audit Engine.
 *
 * Evaluates site elements (parcels, zones, buildings) against resolved local standards
 * for a specific GEOID location, executing both standard zoning/building/civil rules
 * and dynamic plugin rule evaluators.
 */

import { area as polygonArea, centroid, pointInPolygon } from "../../spatial/geometry.js";
import type { Building, ComplianceFinding, Lot, Site, Zone } from "../../spatial/types";
import { buildableEnvelope } from "../rules.js";
import { geoidRegistry } from "./registry.js";
import type { LocalCodeStandards, ResolvedLocalCode } from "./types.js";

/**
 * Audit a site for compliance against local GEOID requirements.
 *
 * @param site The spatial site model to evaluate.
 * @param geoid US Census GEOID (State 2-digit, County 5-digit, or Cousub 10-digit).
 * @param customOverrides Optional site-level overrides to apply on top of local code.
 * @returns Array of compliance findings (errors, warnings, info).
 */
export function auditGeoidCompliance(
  site: Site,
  geoid: string | number,
  customOverrides?: Partial<LocalCodeStandards>,
): ComplianceFinding[] {
  const resolved: ResolvedLocalCode = geoidRegistry.resolve(geoid, customOverrides);
  const { zoning } = resolved.standards;
  const findings: ComplianceFinding[] = [];

  const lots = site.elements.filter((e): e is Lot => e.kind === "lot");
  const buildings = site.elements.filter((e): e is Building => e.kind === "building");
  const zones = site.elements.filter((e): e is Zone => e.kind === "zone");

  // 1. Audit Lot Standards
  for (const lot of lots) {
    const lotArea = polygonArea(lot.boundary);
    if (zoning.minLotArea != null && lotArea > 0 && lotArea < zoning.minLotArea) {
      findings.push({
        severity: "warning",
        code: "geoid.lotArea.insufficient",
        message: `${lot.name} area ${lotArea.toFixed(0)} sq ft is below GEOID ${resolved.targetGeoid} (${resolved.name}) minimum lot area of ${zoning.minLotArea} sq ft.`,
        elementId: lot.id,
      });
    }

    // Check setback envelope
    const lotSetback = lot.setback ?? zoning.frontSetback ?? 0;
    if (lotSetback > 0) {
      const envelope = buildableEnvelope({ ...lot, setback: lotSetback });
      if (!envelope) {
        findings.push({
          severity: "warning",
          code: "geoid.setback.consumesLot",
          message: `${lot.name} setback of ${lotSetback} ft leaves no buildable envelope under local GEOID standard.`,
          elementId: lot.id,
        });
      }
    }
  }

  // 2. Audit Building & Zone Standards
  for (const building of buildings) {
    const footprint = polygonArea(building.boundary);
    const center = centroid(building.boundary);
    const lot = lots.find((l) => pointInPolygon(center, l.boundary));
    const lotArea = lot ? polygonArea(lot.boundary) : undefined;

    // Height limit check
    const maxHeight = zoning.maxHeight;
    if (maxHeight != null && building.height != null && building.height > maxHeight) {
      findings.push({
        severity: "error",
        code: "geoid.height.exceeded",
        message: `${building.name} height ${building.height} ft exceeds local GEOID ${resolved.targetGeoid} limit of ${maxHeight} ft.`,
        elementId: building.id,
      });
    }

    // Coverage check
    const maxCoverage = zoning.maxCoverage;
    if (maxCoverage != null && lotArea && lotArea > 0) {
      const cov = footprint / lotArea;
      if (cov > maxCoverage + 1e-6) {
        findings.push({
          severity: "error",
          code: "geoid.coverage.exceeded",
          message: `${building.name} lot coverage ${(cov * 100).toFixed(1)}% exceeds GEOID limit of ${(maxCoverage * 100).toFixed(0)}%.`,
          elementId: building.id,
        });
      }
    }

    // FAR check
    const maxFar = zoning.maxFar;
    if (maxFar != null && lotArea && lotArea > 0) {
      const storeys = Math.max(1, building.storeys ?? 1);
      const far = (footprint * storeys) / lotArea;
      if (far > maxFar + 1e-6) {
        findings.push({
          severity: "error",
          code: "geoid.far.exceeded",
          message: `${building.name} FAR ${far.toFixed(2)} exceeds GEOID limit of ${maxFar.toFixed(2)}.`,
          elementId: building.id,
        });
      }
    }

    // Allowed uses check
    const allowedUses = zoning.allowedUses;
    if (allowedUses && allowedUses.length > 0 && building.use) {
      if (!allowedUses.includes(building.use)) {
        findings.push({
          severity: "warning",
          code: "geoid.use.disallowed",
          message: `${building.name} use "${building.use}" is not permitted under local GEOID standard [${allowedUses.join(", ")}].`,
          elementId: building.id,
        });
      }
    }

    // Check against zone specific boundaries if zone elements exist
    const zone = zones.find((z) => pointInPolygon(center, z.boundary));
    if (zone && zone.maxHeight != null && building.height != null && building.height > zone.maxHeight) {
      findings.push({
        severity: "error",
        code: "zone.height.exceeded",
        message: `${building.name} height ${building.height} ft exceeds zone ${zone.designation} limit of ${zone.maxHeight} ft.`,
        elementId: building.id,
      });
    }
  }

  // 3. Execute Plugin Dynamic Custom Rule Evaluators
  for (const plugin of resolved.appliedPlugins) {
    if (plugin.customRules && plugin.customRules.length > 0) {
      for (const rule of plugin.customRules) {
        try {
          const ruleFindings = rule(site, resolved);
          findings.push(...ruleFindings);
        } catch (err) {
          findings.push({
            severity: "warning",
            code: "geoid.rule.error",
            message: `Custom rule execution error in plugin ${plugin.geoid}: ${String(err)}`,
          });
        }
      }
    }
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      code: "geoid.compliant",
      message: `Site fully complies with resolved local GEOID standards for ${resolved.name} (${resolved.targetGeoid}).`,
    });
  }

  return findings;
}
