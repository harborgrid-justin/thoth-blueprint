//! Tree-preservation / canopy-retention ordinance compliance: a preservation-
//! percentage rule layered over the existing `canopyCover`-tracking
//! [`PlantingArea`]/[`Tree`] elements.
//!
//! Item 47 of the Theme 4 subdivision-design-automation gap analysis. Many
//! municipal tree-preservation ordinances share one structure: a development
//! may remove up to some percentage of the site's pre-development canopy
//! without penalty, and any removal beyond that threshold must be offset by
//! newly planted canopy at a fixed replacement ratio (an "inch-for-inch" or
//! area-for-area mitigation ratio). This module implements that generic
//! structure via a caller-supplied [`CanopyPreservationRule`] rather than any
//! one jurisdiction's numbers.
//!
//! This crate already tracks per-element [`RenovationStatus`] (existing/new/
//! demolished). This module reuses that status to derive a before/after
//! canopy audit instead of introducing a parallel bookkeeping mechanism:
//! `Existing` + `Demolished` elements together are the pre-development
//! baseline; `Demolished` elements are the removed canopy; `New` elements are
//! newly planted (mitigation) canopy.

use serde::{Deserialize, Serialize};
use thoth_spatial::{
    area as polygon_area, ComplianceFinding, ComplianceSeverity, RenovationStatus,
};

use crate::elements::{PlantingArea, Site, Tree};

/// A jurisdiction's canopy-preservation threshold and mitigation ratio.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CanopyPreservationRule {
    /// Maximum fraction (0-1) of pre-development canopy that may be removed
    /// without triggering mitigation.
    pub max_removal_fraction: f64,
    /// Required area of newly planted canopy per unit area removed beyond
    /// the allowed fraction (e.g. `2.0` for a 2:1 replacement ratio).
    pub mitigation_replacement_ratio: f64,
}

/// The result of auditing a site's plan against a [`CanopyPreservationRule`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CanopyAudit {
    /// Pre-development canopy area (existing + demolished), plan units².
    pub existing_canopy_area: f64,
    /// Canopy area retained (existing, not demolished), plan units².
    pub retained_canopy_area: f64,
    /// Canopy area removed (demolished), plan units².
    pub removed_canopy_area: f64,
    /// Newly planted canopy area, plan units².
    pub new_canopy_area: f64,
    /// `removed / existing`, or 0 if there was no pre-development canopy.
    pub removal_fraction: f64,
    /// Canopy area that must be replanted to offset removal beyond the
    /// allowed fraction (0 if within the allowance).
    pub required_mitigation_area: f64,
    /// `max(0, required_mitigation_area - new_canopy_area)`.
    pub mitigation_shortfall: f64,
    pub compliant: bool,
    pub findings: Vec<ComplianceFinding>,
}

/// Canopy area of a single [`PlantingArea`]: its boundary area times
/// `canopy_cover` if set, otherwise the full boundary area (an unspecified
/// cover fraction is treated as fully canopied — the same "no data means
/// don't undercount" convention [`crate::metrics::impervious_ratio`] uses
/// for its own optional flags).
fn planting_area_canopy(p: &PlantingArea) -> f64 {
    polygon_area(&p.base.boundary) * p.canopy_cover.unwrap_or(1.0)
}

/// Canopy area of a single [`Tree`], modeled as a circular canopy of the
/// tree's `canopy_radius`.
fn tree_canopy(t: &Tree) -> f64 {
    std::f64::consts::PI * t.canopy_radius * t.canopy_radius
}

/// Total canopy area across every `PlantingArea`/`Tree` element in `site`
/// matching `status`.
fn canopy_area_by_status(site: &Site, status: RenovationStatus) -> f64 {
    use crate::elements::PlanElement;
    site.elements
        .iter()
        .map(|e| match e {
            PlanElement::PlantingArea(p) if p.base.renovation_status == status => {
                planting_area_canopy(p)
            }
            PlanElement::Tree(t) if t.renovation_status == status => tree_canopy(t),
            _ => 0.0,
        })
        .sum()
}

/// Audit a site's plan against a [`CanopyPreservationRule`].
pub fn audit_canopy_preservation(site: &Site, rule: &CanopyPreservationRule) -> CanopyAudit {
    let retained_canopy_area = canopy_area_by_status(site, RenovationStatus::Existing);
    let removed_canopy_area = canopy_area_by_status(site, RenovationStatus::Demolished);
    let new_canopy_area = canopy_area_by_status(site, RenovationStatus::New);
    let existing_canopy_area = retained_canopy_area + removed_canopy_area;

    let removal_fraction = if existing_canopy_area > 0.0 {
        removed_canopy_area / existing_canopy_area
    } else {
        0.0
    };

    let allowed_removal = rule.max_removal_fraction.clamp(0.0, 1.0) * existing_canopy_area;
    let excess_removal = (removed_canopy_area - allowed_removal).max(0.0);
    let required_mitigation_area = excess_removal * rule.mitigation_replacement_ratio;
    let mitigation_shortfall = (required_mitigation_area - new_canopy_area).max(0.0);
    let compliant = mitigation_shortfall <= 1e-6;

    let mut findings = Vec::new();
    if !compliant {
        findings.push(ComplianceFinding {
            severity: ComplianceSeverity::Error,
            code: "canopy.preservationExceeded".to_string(),
            message: format!(
                "Removing {removed_canopy_area:.0} of {existing_canopy_area:.0} plan-unit² of \
                 existing canopy ({:.0}%) exceeds the {:.0}% allowance; {required_mitigation_area:.0} \
                 plan-unit² of mitigation planting is required but only {new_canopy_area:.0} is proposed \
                 (shortfall {mitigation_shortfall:.0}).",
                removal_fraction * 100.0,
                rule.max_removal_fraction * 100.0
            ),
            element_id: None,
        });
    } else {
        findings.push(ComplianceFinding {
            severity: ComplianceSeverity::Info,
            code: "canopy.compliant".to_string(),
            message: "Canopy removal is within the preservation allowance (or fully mitigated)."
                .to_string(),
            element_id: None,
        });
    }

    CanopyAudit {
        existing_canopy_area,
        retained_canopy_area,
        removed_canopy_area,
        new_canopy_area,
        removal_fraction,
        required_mitigation_area,
        mitigation_shortfall,
        compliant,
        findings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, PlanElement};
    use approx::assert_relative_eq;
    use thoth_spatial::{ElementKind, Point, Polygon, SpatialContext, Unit};

    fn square(size: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(size, 0.0),
            Point::new(size, size),
            Point::new(0.0, size),
        ]
    }

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn site_with(elements: Vec<PlanElement>) -> Site {
        Site {
            id: "s".to_string(),
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

    fn planting(id: &str, size: f64, cover: f64, status: RenovationStatus) -> PlanElement {
        let mut base = new_base(id, ElementKind::Planting, id, "l", square(size));
        base.renovation_status = status;
        PlanElement::PlantingArea(PlantingArea {
            base,
            planting_type: None,
            canopy_cover: Some(cover),
        })
    }

    #[test]
    fn compliant_when_removal_is_within_the_allowance() {
        // 1,000 sqm forest pre-development (900 retained + 100 removed);
        // 10% removal is within a 20% allowance -> compliant, no mitigation.
        let site = site_with(vec![
            planting("keep", 30.0, 1.0, RenovationStatus::Existing), // 900 sqm
            planting("remove", 10.0, 1.0, RenovationStatus::Demolished), // 100 sqm
        ]);

        let rule = CanopyPreservationRule {
            max_removal_fraction: 0.20,
            mitigation_replacement_ratio: 2.0,
        };
        let audit = audit_canopy_preservation(&site, &rule);
        assert_relative_eq!(audit.existing_canopy_area, 1000.0, epsilon = 1e-6);
        assert_relative_eq!(audit.removed_canopy_area, 100.0, epsilon = 1e-6);
        assert_relative_eq!(audit.removal_fraction, 0.10, epsilon = 1e-9);
        assert_relative_eq!(audit.required_mitigation_area, 0.0, epsilon = 1e-9);
        assert!(audit.compliant);
    }

    #[test]
    fn requires_mitigation_when_removal_exceeds_the_allowance() {
        let site = site_with(vec![
            planting("keep", 30.0, 1.0, RenovationStatus::Existing), // 900 sqm
            planting("remove", 20.0, 1.0, RenovationStatus::Demolished), // 400 sqm
        ]);
        // existing_canopy_area = 900 + 400 = 1300; removal_fraction = 400/1300 ≈ 30.8%.
        let rule = CanopyPreservationRule {
            max_removal_fraction: 0.20,
            mitigation_replacement_ratio: 2.0,
        };
        let audit = audit_canopy_preservation(&site, &rule);
        assert_relative_eq!(audit.existing_canopy_area, 1300.0, epsilon = 1e-6);
        let allowed = 0.20 * 1300.0; // 260
        let excess = 400.0 - allowed; // 140
        assert_relative_eq!(audit.required_mitigation_area, excess * 2.0, epsilon = 1e-6);
        assert!(!audit.compliant);
        assert!(audit
            .findings
            .iter()
            .any(|f| f.code == "canopy.preservationExceeded"));
    }

    #[test]
    fn new_planting_can_fully_mitigate_excess_removal() {
        let site = site_with(vec![
            planting("keep", 30.0, 1.0, RenovationStatus::Existing),
            planting("remove", 20.0, 1.0, RenovationStatus::Demolished),
            planting("new", 20.0, 1.0, RenovationStatus::New), // 400 sqm new canopy
        ]);
        let rule = CanopyPreservationRule {
            max_removal_fraction: 0.20,
            mitigation_replacement_ratio: 2.0,
        };
        let audit = audit_canopy_preservation(&site, &rule);
        // Required mitigation is 140*2=280; 400 new sqm covers it fully.
        assert!(audit.new_canopy_area >= audit.required_mitigation_area);
        assert_eq!(audit.mitigation_shortfall, 0.0);
        assert!(audit.compliant);
    }

    #[test]
    fn site_with_no_pre_development_canopy_is_trivially_compliant() {
        let site = site_with(vec![]);
        let rule = CanopyPreservationRule {
            max_removal_fraction: 0.2,
            mitigation_replacement_ratio: 2.0,
        };
        let audit = audit_canopy_preservation(&site, &rule);
        assert_eq!(audit.existing_canopy_area, 0.0);
        assert_eq!(audit.removal_fraction, 0.0);
        assert!(audit.compliant);
    }
}
