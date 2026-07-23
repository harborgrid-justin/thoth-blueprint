//! Open-space / park-dedication requirement calculator: given a jurisdiction's
//! dedication ratio(s), compute the required open-space area for a site and
//! check a proposed [`OpenSpace`] allocation against it.
//!
//! Item 46 of the Theme 4 subdivision-design-automation gap analysis.
//! Dedication ordinances typically require the *greater of* a per-dwelling-
//! unit ratio and a percentage-of-gross-site-area ratio, subject to an
//! absolute floor (see e.g. the Quimby Act, Cal. Gov. Code §66477, which uses
//! a per-dwelling-unit park-land standard, and the many municipal codes that
//! instead or additionally require a flat percentage of gross acreage). This
//! module implements that "greater-of, floored" structure generically over a
//! caller-supplied [`DedicationStandard`] — it does not hardcode any single
//! jurisdiction's numbers.

use serde::{Deserialize, Serialize};
use thoth_spatial::AreaUnit;

use crate::elements::{OpenSpace, PlanElement, Site};
use crate::metrics::{area_to_square_meters, site_area};

/// A jurisdiction's open-space/park dedication requirement. Any combination
/// of the two ratio fields may be set; the effective requirement is the
/// greater of whichever are present, floored by `minimum_area_sq_m` if set.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DedicationStandard {
    /// Required open-space area per dwelling unit, in square meters.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sq_m_per_dwelling_unit: Option<f64>,
    /// Required open-space area as a fraction (0-1) of gross site area.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fraction_of_site_area: Option<f64>,
    /// An absolute floor on the requirement, in square meters, regardless of
    /// how small the ratio-derived figures come out (some ordinances set a
    /// minimum dedication even for very small developments).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minimum_area_sq_m: Option<f64>,
}

/// The result of checking a site's proposed open-space allocation against a
/// [`DedicationStandard`].
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DedicationRequirement {
    pub required_area_sq_m: f64,
    pub proposed_area_sq_m: f64,
    /// `proposed - required`; negative means a deficit.
    pub surplus_or_deficit_sq_m: f64,
    pub compliant: bool,
}

/// Compute the required open-space area (square meters) for a site of the
/// given gross area and dwelling-unit count under `standard`.
pub fn compute_required_open_space(
    standard: &DedicationStandard,
    site_area_sq_m: f64,
    dwelling_units: f64,
) -> f64 {
    let by_dwelling_units = standard
        .sq_m_per_dwelling_unit
        .map(|rate| rate * dwelling_units)
        .unwrap_or(0.0);
    let by_site_area = standard
        .fraction_of_site_area
        .map(|frac| frac * site_area_sq_m)
        .unwrap_or(0.0);
    let required = by_dwelling_units.max(by_site_area);
    standard
        .minimum_area_sq_m
        .map(|floor| required.max(floor))
        .unwrap_or(required)
}

/// Total area of every [`OpenSpace`] element in `site`, in square meters.
fn proposed_open_space_area_sq_m(site: &Site) -> f64 {
    let plan_area: f64 = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::OpenSpace(o) => Some(o),
            _ => None,
        })
        .map(|o: &OpenSpace| thoth_spatial::area(&o.base.boundary))
        .sum();
    area_to_square_meters(plan_area, &site.spatial)
}

/// Check a site's proposed [`OpenSpace`] allocation against `standard`,
/// using [`crate::metrics::site_area`] for gross site area and
/// [`crate::metrics::dwelling_units`] would double-count fee-style rounding
/// differences with [`crate::impact_fees`], so the dwelling-unit count is
/// taken as an explicit parameter here (a planner may be checking dedication
/// against a proposed unit count before any buildings exist on the plan).
pub fn check_open_space_dedication(
    site: &Site,
    standard: &DedicationStandard,
    dwelling_units: f64,
) -> DedicationRequirement {
    let site_area_sq_m = site_area(site, AreaUnit::Sqm);
    let required_area_sq_m = compute_required_open_space(standard, site_area_sq_m, dwelling_units);
    let proposed_area_sq_m = proposed_open_space_area_sq_m(site);
    let surplus_or_deficit_sq_m = proposed_area_sq_m - required_area_sq_m;

    DedicationRequirement {
        required_area_sq_m,
        proposed_area_sq_m,
        surplus_or_deficit_sq_m,
        compliant: surplus_or_deficit_sq_m >= -1e-6,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::new_base;
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

    #[test]
    fn requirement_is_the_greater_of_the_two_ratios() {
        let standard = DedicationStandard {
            sq_m_per_dwelling_unit: Some(50.0),
            fraction_of_site_area: Some(0.10),
            minimum_area_sq_m: None,
        };
        // 100 DU * 50 sqm = 5,000; 10% of 40,000 sqm site = 4,000 -> greater is 5,000.
        assert_relative_eq!(
            compute_required_open_space(&standard, 40_000.0, 100.0),
            5_000.0,
            epsilon = 1e-6
        );
        // Flip it: a huge site with few units should be driven by area share.
        assert_relative_eq!(
            compute_required_open_space(&standard, 200_000.0, 10.0),
            20_000.0,
            epsilon = 1e-6
        );
    }

    #[test]
    fn minimum_area_floors_a_small_requirement() {
        let standard = DedicationStandard {
            sq_m_per_dwelling_unit: Some(10.0),
            fraction_of_site_area: None,
            minimum_area_sq_m: Some(2_000.0),
        };
        assert_relative_eq!(
            compute_required_open_space(&standard, 10_000.0, 5.0),
            2_000.0,
            epsilon = 1e-6
        );
    }

    #[test]
    fn checks_a_realistic_subdivision_allocation() {
        // A ~40-acre (161,874 sqm) site, 120 dwelling units, a jurisdiction
        // requiring the greater of 10% of gross area or 30 sqm/DU.
        let parcel = crate::elements::Parcel {
            base: new_base(
                "p1",
                ElementKind::Parcel,
                "Parcel",
                "l",
                square(402.34), // ~161,878 sqm
            ),
            apn: None,
        };
        let open_space = OpenSpace {
            base: new_base("os1", ElementKind::Openspace, "Greenway", "l", square(120.0)),
            dedicated: Some(true),
        };
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![
                PlanElement::Parcel(parcel),
                PlanElement::OpenSpace(open_space),
            ],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };
        let standard = DedicationStandard {
            sq_m_per_dwelling_unit: Some(30.0),
            fraction_of_site_area: Some(0.10),
            minimum_area_sq_m: None,
        };
        let result = check_open_space_dedication(&site, &standard, 120.0);
        // Required = max(120*30=3,600; 0.10*161,878≈16,188) ≈ 16,188.
        assert!(result.required_area_sq_m > 16_000.0);
        // Proposed = 120x120 = 14,400 sqm, which is short of the requirement.
        assert_relative_eq!(result.proposed_area_sq_m, 14_400.0, epsilon = 1.0);
        assert!(!result.compliant);
        assert!(result.surplus_or_deficit_sq_m < 0.0);
    }

    #[test]
    fn empty_site_has_zero_requirement_and_is_trivially_compliant_or_not() {
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };
        let standard = DedicationStandard {
            sq_m_per_dwelling_unit: None,
            fraction_of_site_area: None,
            minimum_area_sq_m: None,
        };
        let result = check_open_space_dedication(&site, &standard, 0.0);
        assert_eq!(result.required_area_sq_m, 0.0);
        assert_eq!(result.proposed_area_sq_m, 0.0);
        assert!(result.compliant);
    }
}
