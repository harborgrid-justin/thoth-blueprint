//! Development impact-fee calculation: schools/utilities/roads/parks capacity
//! fees assessed against a proposed development, parameterized so each
//! jurisdiction supplies its own rate schedule.
//!
//! Item 45 of the Theme 4 subdivision-design-automation gap analysis. Impact
//! fees are near-universally structured as a flat rate per dwelling unit
//! (residential) or per square foot of gross floor area (nonresidential) —
//! see e.g. the enabling frameworks in Cal. Gov. Code §66000 et seq.
//! ("Mitigation Fee Act"), Fla. Stat. §163.31801, and the many county/city
//! fee schedules modeled on the same per-unit / per-square-foot structure.
//! This module implements that structure generically; it does not hardcode
//! any one jurisdiction's rates — those are the [`ImpactFeeSchedule`] a
//! caller supplies.

use serde::{Deserialize, Serialize};
use thoth_spatial::AreaUnit;

use crate::elements::{PlanElement, Site};
use crate::land_use::LandUseCategory;
use crate::metrics::{area_to_square_meters, dwelling_units, square_meters_to};

/// A jurisdiction's per-category impact-fee rates. All per-dwelling-unit
/// rates are currency-per-unit; the nonresidential rate is currency per
/// square foot of gross floor area. Leave a rate at `0.0` to disable that
/// category's fee.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ImpactFeeSchedule {
    /// Fee per dwelling unit funding school-capacity expansion.
    pub school_fee_per_dwelling_unit: f64,
    /// Fee per dwelling unit funding park/recreation-capacity expansion.
    pub park_fee_per_dwelling_unit: f64,
    /// Fee per dwelling unit funding utility (water/sewer/storm) capacity.
    pub utility_fee_per_dwelling_unit: f64,
    /// Fee per dwelling unit funding road/transportation capacity.
    pub road_fee_per_dwelling_unit: f64,
    /// Fee per square foot of nonresidential gross floor area (all
    /// categories combined — most schedules do not split nonresidential
    /// development by school/park/utility/road the way residential is).
    pub nonresidential_fee_per_sq_ft: f64,
}

/// The computed fee assessment for a proposed development.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ImpactFeeAssessment {
    pub school_fee: f64,
    pub park_fee: f64,
    pub utility_fee: f64,
    pub road_fee: f64,
    pub nonresidential_fee: f64,
    pub total_fee: f64,
    /// The dwelling-unit count the residential fees were assessed against.
    pub dwelling_units: f64,
    /// The nonresidential gross floor area (sq ft) the nonresidential fee
    /// was assessed against.
    pub nonresidential_gross_floor_area_sq_ft: f64,
}

/// Assess impact fees given a dwelling-unit count and nonresidential gross
/// floor area directly (unit-testable without a [`Site`]).
pub fn assess_impact_fees(
    schedule: &ImpactFeeSchedule,
    dwelling_units: f64,
    nonresidential_gross_floor_area_sq_ft: f64,
) -> ImpactFeeAssessment {
    let school_fee = schedule.school_fee_per_dwelling_unit * dwelling_units;
    let park_fee = schedule.park_fee_per_dwelling_unit * dwelling_units;
    let utility_fee = schedule.utility_fee_per_dwelling_unit * dwelling_units;
    let road_fee = schedule.road_fee_per_dwelling_unit * dwelling_units;
    let nonresidential_fee =
        schedule.nonresidential_fee_per_sq_ft * nonresidential_gross_floor_area_sq_ft;

    ImpactFeeAssessment {
        school_fee,
        park_fee,
        utility_fee,
        road_fee,
        nonresidential_fee,
        total_fee: school_fee + park_fee + utility_fee + road_fee + nonresidential_fee,
        dwelling_units,
        nonresidential_gross_floor_area_sq_ft,
    }
}

/// Nonresidential gross floor area (footprint × storeys) across every
/// [`crate::elements::Building`] whose `use_` is set and is not
/// [`LandUseCategory::Residential`]/[`LandUseCategory::MixedUse`], reported
/// in square feet. Buildings with no `use_` set are treated as
/// nonresidential (conservative default: fee schedules are typically
/// residential-exempt only when a residential use is affirmatively on
/// record).
fn nonresidential_gross_floor_area_sq_ft(site: &Site) -> f64 {
    let plan_area: f64 = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::Building(b) => Some(b),
            _ => None,
        })
        .filter(|b| {
            !matches!(
                b.use_,
                Some(LandUseCategory::Residential) | Some(LandUseCategory::MixedUse)
            )
        })
        .map(|b| thoth_spatial::area(&b.base.boundary) * b.storeys.max(1.0))
        .sum();
    square_meters_to(
        area_to_square_meters(plan_area, &site.spatial),
        AreaUnit::Sqft,
    )
}

/// Assess impact fees for an entire [`Site`]: dwelling units come from
/// [`crate::metrics::dwelling_units`]; nonresidential floor area is summed
/// across non-residential/non-mixed-use buildings. Composes with the
/// existing metrics engine rather than re-deriving those figures.
pub fn assess_site_impact_fees(site: &Site, schedule: &ImpactFeeSchedule) -> ImpactFeeAssessment {
    assess_impact_fees(
        schedule,
        dwelling_units(site),
        nonresidential_gross_floor_area_sq_ft(site),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::{new_base, Building};
    use approx::assert_relative_eq;
    use thoth_spatial::{ElementKind, Point, Polygon, SpatialContext, Unit};

    /// Rates modeled loosely on published US suburban impact-fee schedules
    /// (a few thousand dollars per dwelling unit split across categories).
    fn schedule() -> ImpactFeeSchedule {
        ImpactFeeSchedule {
            school_fee_per_dwelling_unit: 4500.0,
            park_fee_per_dwelling_unit: 1200.0,
            utility_fee_per_dwelling_unit: 2800.0,
            road_fee_per_dwelling_unit: 1800.0,
            nonresidential_fee_per_sq_ft: 3.25,
        }
    }

    #[test]
    fn assesses_fees_for_a_120_unit_subdivision() {
        let a = assess_impact_fees(&schedule(), 120.0, 0.0);
        assert_relative_eq!(a.school_fee, 540_000.0, epsilon = 1e-6);
        assert_relative_eq!(a.park_fee, 144_000.0, epsilon = 1e-6);
        assert_relative_eq!(a.utility_fee, 336_000.0, epsilon = 1e-6);
        assert_relative_eq!(a.road_fee, 216_000.0, epsilon = 1e-6);
        assert_relative_eq!(a.total_fee, 1_236_000.0, epsilon = 1e-6);
    }

    #[test]
    fn assesses_nonresidential_fee_per_square_foot() {
        let a = assess_impact_fees(&schedule(), 0.0, 10_000.0);
        assert_relative_eq!(a.nonresidential_fee, 32_500.0, epsilon = 1e-6);
        assert_relative_eq!(a.total_fee, 32_500.0, epsilon = 1e-6);
    }

    #[test]
    fn assesses_a_mixed_site_by_composing_with_metrics() {
        fn square(size: f64) -> Polygon {
            vec![
                Point::new(0.0, 0.0),
                Point::new(size, 0.0),
                Point::new(size, size),
                Point::new(0.0, size),
            ]
        }
        let ctx = SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Feet,
            scale: 1.0,
        };
        let residential = Building {
            base: new_base("b1", ElementKind::Building, "Homes", "l", square(50.0)),
            lot_id: None,
            storeys: 2.0,
            height: None,
            dwelling_units: Some(40.0),
            use_: Some(LandUseCategory::Residential),
        };
        let retail = Building {
            base: new_base("b2", ElementKind::Building, "Shops", "l", square(100.0)),
            lot_id: None,
            storeys: 1.0,
            height: None,
            dwelling_units: None,
            use_: Some(LandUseCategory::Commercial),
        };
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx,
            layers: vec![],
            elements: vec![
                PlanElement::Building(residential),
                PlanElement::Building(retail),
            ],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        };
        let a = assess_site_impact_fees(&site, &schedule());
        assert_relative_eq!(a.dwelling_units, 40.0, epsilon = 1e-9);
        // Retail footprint is 100x100 ft = 10,000 sq ft (units are already feet).
        assert_relative_eq!(
            a.nonresidential_gross_floor_area_sq_ft,
            10_000.0,
            epsilon = 1e-3
        );
        assert!(a.total_fee > 0.0);
    }
}
