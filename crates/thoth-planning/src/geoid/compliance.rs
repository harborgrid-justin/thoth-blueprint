//! GEOID local-code compliance audit engine. Port of
//! `packages/domain/src/planning/geoid/compliance.ts`'s
//! `auditGeoidCompliance`.
//!
//! Evaluates site elements (lots, buildings, zones) against resolved local
//! standards for a specific GEOID location, running both the standard
//! zoning/building checks below and any dynamic plugin rule evaluators.

use thoth_spatial::{
    area as polygon_area, centroid, point_in_polygon, ComplianceFinding, ComplianceSeverity,
};

use crate::elements::{Building, Lot, PlanElement, Site, Zone};
use crate::rules::buildable_envelope;

use super::registry::GeoidPluginRegistry;
use super::types::LocalCodeStandardsOverride;
use super::utils::GeoidInput;

/// Audit a site for compliance against local GEOID requirements.
///
/// * `site` — the spatial site model to evaluate.
/// * `geoid` — US Census GEOID (state 2-digit, county 5-digit, or cousub
///   10-digit).
/// * `registry` — the plugin registry to resolve `geoid` against (see the
///   [`super::registry`] module docs for why this is an explicit parameter
///   rather than a global singleton).
/// * `custom_overrides` — optional site-level overrides applied on top of
///   the resolved local code.
pub fn audit_geoid_compliance(
    site: &Site,
    geoid: GeoidInput,
    registry: &GeoidPluginRegistry,
    custom_overrides: Option<&LocalCodeStandardsOverride>,
) -> Vec<ComplianceFinding> {
    let resolved = registry.resolve(geoid, custom_overrides);
    let zoning = &resolved.standards.zoning;
    let mut findings = Vec::new();

    let lots: Vec<&Lot> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::Lot(l) => Some(l),
            _ => None,
        })
        .collect();
    let buildings: Vec<&Building> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::Building(b) => Some(b),
            _ => None,
        })
        .collect();
    let zones: Vec<&Zone> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::Zone(z) => Some(z),
            _ => None,
        })
        .collect();

    // 1. Audit lot standards.
    for lot in &lots {
        let lot_area = polygon_area(&lot.base.boundary);
        if let Some(min_lot_area) = zoning.min_lot_area {
            if lot_area > 0.0 && lot_area < min_lot_area {
                findings.push(ComplianceFinding {
                    severity: ComplianceSeverity::Warning,
                    code: "geoid.lotArea.insufficient".to_string(),
                    message: format!(
                        "{} area {:.0} sq ft is below GEOID {} ({}) minimum lot area of {} sq ft.",
                        lot.base.name, lot_area, resolved.target_geoid, resolved.name, min_lot_area
                    ),
                    element_id: Some(lot.base.id.clone()),
                });
            }
        }

        let lot_setback = lot.setback.or(zoning.front_setback).unwrap_or(0.0);
        if lot_setback > 0.0 {
            let mut lot_with_setback = (*lot).clone();
            lot_with_setback.setback = Some(lot_setback);
            if buildable_envelope(&lot_with_setback).is_none() {
                findings.push(ComplianceFinding {
                    severity: ComplianceSeverity::Warning,
                    code: "geoid.setback.consumesLot".to_string(),
                    message: format!(
                        "{} setback of {lot_setback} ft leaves no buildable envelope under local GEOID standard.",
                        lot.base.name
                    ),
                    element_id: Some(lot.base.id.clone()),
                });
            }
        }
    }

    // 2. Audit building & zone standards.
    for building in &buildings {
        let footprint = polygon_area(&building.base.boundary);
        let center = centroid(&building.base.boundary);
        let lot = lots
            .iter()
            .find(|l| point_in_polygon(center, &l.base.boundary));
        let lot_area = lot.map(|l| polygon_area(&l.base.boundary));

        if let (Some(max_height), Some(height)) = (zoning.max_height, building.height) {
            if height > max_height {
                findings.push(ComplianceFinding {
                    severity: ComplianceSeverity::Error,
                    code: "geoid.height.exceeded".to_string(),
                    message: format!(
                        "{} height {height} ft exceeds local GEOID {} limit of {max_height} ft.",
                        building.base.name, resolved.target_geoid
                    ),
                    element_id: Some(building.base.id.clone()),
                });
            }
        }

        if let (Some(max_coverage), Some(lot_area)) = (zoning.max_coverage, lot_area) {
            if lot_area > 0.0 {
                let cov = footprint / lot_area;
                if cov > max_coverage + 1e-6 {
                    findings.push(ComplianceFinding {
                        severity: ComplianceSeverity::Error,
                        code: "geoid.coverage.exceeded".to_string(),
                        message: format!(
                            "{} lot coverage {:.1}% exceeds GEOID limit of {:.0}%.",
                            building.base.name,
                            cov * 100.0,
                            max_coverage * 100.0
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }

        if let (Some(max_far), Some(lot_area)) = (zoning.max_far, lot_area) {
            if lot_area > 0.0 {
                let storeys = building.storeys.max(1.0);
                let far = (footprint * storeys) / lot_area;
                if far > max_far + 1e-6 {
                    findings.push(ComplianceFinding {
                        severity: ComplianceSeverity::Error,
                        code: "geoid.far.exceeded".to_string(),
                        message: format!(
                            "{} FAR {far:.2} exceeds GEOID limit of {max_far:.2}.",
                            building.base.name
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }

        if let (Some(allowed_uses), Some(use_)) = (&zoning.allowed_uses, &building.use_) {
            if !allowed_uses.is_empty() {
                // `LandUseCategory` serializes kebab-case (`"mixed-use"`,
                // `"open-space"`, ...), matching the plain strings a GEOID
                // plugin's `allowedUses` list carries.
                let use_str = land_use_category_str(*use_);
                if !allowed_uses.iter().any(|u| u == use_str) {
                    findings.push(ComplianceFinding {
                        severity: ComplianceSeverity::Warning,
                        code: "geoid.use.disallowed".to_string(),
                        message: format!(
                            "{} use \"{use_str}\" is not permitted under local GEOID standard [{}].",
                            building.base.name,
                            allowed_uses.join(", ")
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }

        let zone = zones
            .iter()
            .find(|z| point_in_polygon(center, &z.base.boundary));
        if let Some(zone) = zone {
            if let (Some(zone_max_height), Some(height)) = (zone.max_height, building.height) {
                if height > zone_max_height {
                    findings.push(ComplianceFinding {
                        severity: ComplianceSeverity::Error,
                        code: "zone.height.exceeded".to_string(),
                        message: format!(
                            "{} height {height} ft exceeds zone {} limit of {zone_max_height} ft.",
                            building.base.name, zone.designation
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }
    }

    // 3. Execute plugin dynamic custom rule evaluators.
    for plugin in &resolved.applied_plugins {
        for rule in &plugin.custom_rules {
            findings.extend(rule(site, &resolved));
        }
    }

    if findings.is_empty() {
        findings.push(ComplianceFinding {
            severity: ComplianceSeverity::Info,
            code: "geoid.compliant".to_string(),
            message: format!(
                "Site fully complies with resolved local GEOID standards for {} ({}).",
                resolved.name, resolved.target_geoid
            ),
            element_id: None,
        });
    }

    findings
}

/// The kebab-case string [`crate::land_use::LandUseCategory`] serializes as
/// (matching the plain strings a GEOID plugin's `zoning.allowedUses` list
/// carries, e.g. `"mixed-use"`), without hand-duplicating the enum's
/// `#[serde(rename_all = "kebab-case")]` mapping.
fn land_use_category_str(category: crate::land_use::LandUseCategory) -> &'static str {
    match category {
        crate::land_use::LandUseCategory::Residential => "residential",
        crate::land_use::LandUseCategory::Commercial => "commercial",
        crate::land_use::LandUseCategory::MixedUse => "mixed-use",
        crate::land_use::LandUseCategory::Civic => "civic",
        crate::land_use::LandUseCategory::Industrial => "industrial",
        crate::land_use::LandUseCategory::Park => "park",
        crate::land_use::LandUseCategory::OpenSpace => "open-space",
        crate::land_use::LandUseCategory::Agricultural => "agricultural",
        crate::land_use::LandUseCategory::Infrastructure => "infrastructure",
        crate::land_use::LandUseCategory::Unassigned => "unassigned",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, Zone};
    use crate::geoid::types::{GeoidAreaType, LocalCodePlugin, ZoningStandards};
    use crate::land_use::LandUseCategory;
    use thoth_spatial::{ElementKind, SpatialContext, Unit};

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Feet,
            scale: 1.0,
        }
    }

    fn square(size: f64) -> Vec<thoth_spatial::Point> {
        vec![
            thoth_spatial::Point::new(0.0, 0.0),
            thoth_spatial::Point::new(size, 0.0),
            thoth_spatial::Point::new(size, size),
            thoth_spatial::Point::new(0.0, size),
        ]
    }

    fn site_with(elements: Vec<PlanElement>) -> Site {
        Site {
            id: "s1".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements,
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        }
    }

    #[test]
    fn an_empty_site_is_reported_compliant() {
        let site = site_with(vec![]);
        let registry = GeoidPluginRegistry::new();
        let findings = audit_geoid_compliance(&site, GeoidInput::Str("48"), &registry, None);
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].code, "geoid.compliant");
    }

    #[test]
    fn an_undersized_lot_triggers_a_warning() {
        let mut registry = GeoidPluginRegistry::new();
        registry.register(LocalCodePlugin {
            geoid: "48".to_string(),
            area_type: GeoidAreaType::State,
            name: "Texas".to_string(),
            state_name: None,
            county_name: None,
            cousub_name: None,
            effective_date: None,
            jurisdiction_url: None,
            standards: crate::geoid::types::LocalCodeStandardsOverride {
                zoning: Some(ZoningStandards {
                    min_lot_area: Some(5000.0),
                    ..Default::default()
                }),
                ..Default::default()
            },
            custom_rules: vec![],
            survey_framework: None,
            metadata: Default::default(),
        });

        let lot = Lot {
            base: new_base("l1", ElementKind::Lot, "Lot 1", "layer", square(50.0)),
            parcel_id: None,
            block_id: None,
            setback: None,
        };
        let site = site_with(vec![PlanElement::Lot(lot)]);
        let findings = audit_geoid_compliance(&site, GeoidInput::Str("48"), &registry, None);
        assert!(findings
            .iter()
            .any(|f| f.code == "geoid.lotArea.insufficient"));
    }

    #[test]
    fn a_building_over_the_height_limit_is_an_error() {
        let mut registry = GeoidPluginRegistry::new();
        registry.register(LocalCodePlugin {
            geoid: "48".to_string(),
            area_type: GeoidAreaType::State,
            name: "Texas".to_string(),
            state_name: None,
            county_name: None,
            cousub_name: None,
            effective_date: None,
            jurisdiction_url: None,
            standards: crate::geoid::types::LocalCodeStandardsOverride {
                zoning: Some(ZoningStandards {
                    max_height: Some(35.0),
                    ..Default::default()
                }),
                ..Default::default()
            },
            custom_rules: vec![],
            survey_framework: None,
            metadata: Default::default(),
        });

        let building = Building {
            base: new_base("b1", ElementKind::Building, "Tower", "layer", square(20.0)),
            lot_id: None,
            storeys: 10.0,
            height: Some(80.0),
            dwelling_units: None,
            use_: Some(LandUseCategory::Residential),
        };
        let site = site_with(vec![PlanElement::Building(building)]);
        let findings = audit_geoid_compliance(&site, GeoidInput::Str("48"), &registry, None);
        assert!(findings
            .iter()
            .any(|f| f.code == "geoid.height.exceeded" && f.severity == ComplianceSeverity::Error));
    }

    #[test]
    fn zone_specific_height_limit_is_also_enforced() {
        let registry = GeoidPluginRegistry::new();
        let building = Building {
            base: new_base("b1", ElementKind::Building, "House", "layer", square(20.0)),
            lot_id: None,
            storeys: 2.0,
            height: Some(30.0),
            dwelling_units: None,
            use_: Some(LandUseCategory::Residential),
        };
        let zone = Zone {
            base: new_base("z1", ElementKind::Zone, "R-1", "layer", square(100.0)),
            designation: "R-1".to_string(),
            allowed_uses: vec![],
            max_coverage: None,
            max_far: None,
            max_height: Some(25.0),
            min_setback: None,
        };
        let site = site_with(vec![
            PlanElement::Zone(zone),
            PlanElement::Building(building),
        ]);
        let findings = audit_geoid_compliance(&site, GeoidInput::Str("48"), &registry, None);
        assert!(findings.iter().any(|f| f.code == "zone.height.exceeded"));
    }
}
