//! Planning metrics — coverage, density, floor-area ratio, and land-use
//! allocation — computed over a [`Site`]. These are the numbers a metrics
//! panel would show live; keeping them in this crate means every consumer
//! (client, services, tooling) reports identical figures.
//!
//! Port of `packages/domain/src/planning/metrics.ts`.

use serde::{Deserialize, Serialize};
use thoth_spatial::{AreaUnit, ElementBase, SpatialContext};

use crate::common::clamp01;
use crate::curve::boundary_area;
use crate::elements::{Building, LandUse, Lot, Parcel, PlanElement, Site};
use crate::land_use::{land_use_definition, LandUseCategory};

/// Convert a raw plan-unit area (units²) into square meters, honoring the
/// plan's [`SpatialContext`] units. Local equivalent of TS `areaToSquareMeters`
/// composed from `thoth_spatial::Unit::meters_per_unit`.
pub fn area_to_square_meters(plan_area: f64, spatial: &SpatialContext) -> f64 {
    let factor = spatial.units.meters_per_unit();
    plan_area * factor * factor
}

/// Convert a square-meter area into the requested [`AreaUnit`]. Local
/// equivalent of TS `squareMetersTo` composed from `AreaUnit::sqm_per_unit`.
pub fn square_meters_to(sqm: f64, unit: AreaUnit) -> f64 {
    sqm / unit.sqm_per_unit()
}

/// A single slice of the land-use allocation breakdown.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LandUseAllocation {
    pub category: LandUseCategory,
    pub label: String,
    pub color: String,
    /// Area in the requested unit.
    pub area: f64,
    /// Share of total allocated land use (0–1).
    pub share: f64,
}

/// A snapshot of the headline metrics for a site.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SiteMetrics {
    pub site_area: f64,
    pub built_area: f64,
    pub gross_floor_area: f64,
    pub coverage: f64,
    pub floor_area_ratio: f64,
    pub density: f64,
    pub dwelling_units: f64,
    pub lot_count: u32,
    pub impervious_ratio: f64,
    pub open_space_ratio: f64,
    pub area_unit: AreaUnit,
    pub allocation: Vec<LandUseAllocation>,
}

/// Community-scale metrics derived from the plan and an assumed household size.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CommunityMetrics {
    pub dwelling_units: f64,
    /// Estimated resident population = dwelling units × household size.
    pub population: f64,
    /// Residents per square kilometre of site.
    pub population_per_square_km: f64,
    /// Open-space + park land per resident, in square metres.
    pub open_space_per_capita_sq_m: f64,
    /// Park land per 1,000 residents, in acres (a common LOS standard).
    pub park_acres_per_thousand: f64,
    pub household_size: f64,
}

/// Exact plan-unit area of one region's base, honoring any curved edges.
fn region_area(base: &ElementBase) -> f64 {
    boundary_area(&base.boundary, base.arcs.as_ref())
}

fn parcels(site: &Site) -> impl Iterator<Item = &Parcel> {
    site.elements.iter().filter_map(|e| match e {
        PlanElement::Parcel(p) => Some(p),
        _ => None,
    })
}

fn buildings(site: &Site) -> impl Iterator<Item = &Building> {
    site.elements.iter().filter_map(|e| match e {
        PlanElement::Building(b) => Some(b),
        _ => None,
    })
}

fn land_uses(site: &Site) -> impl Iterator<Item = &LandUse> {
    site.elements.iter().filter_map(|e| match e {
        PlanElement::LandUse(l) => Some(l),
        _ => None,
    })
}

fn lots(site: &Site) -> impl Iterator<Item = &Lot> {
    site.elements.iter().filter_map(|e| match e {
        PlanElement::Lot(l) => Some(l),
        _ => None,
    })
}

/// Total site area (sum of all parcels), reported in `unit`.
pub fn site_area(site: &Site, unit: AreaUnit) -> f64 {
    let plan_area: f64 = parcels(site).map(|p| region_area(&p.base)).sum();
    square_meters_to(area_to_square_meters(plan_area, &site.spatial), unit)
}

/// Total building footprint area, reported in `unit`.
pub fn built_area(site: &Site, unit: AreaUnit) -> f64 {
    let plan_area: f64 = buildings(site).map(|b| region_area(&b.base)).sum();
    square_meters_to(area_to_square_meters(plan_area, &site.spatial), unit)
}

/// Gross floor area = Σ(footprint × storeys), reported in `unit`.
pub fn gross_floor_area(site: &Site, unit: AreaUnit) -> f64 {
    let plan_area: f64 = buildings(site)
        .map(|b| region_area(&b.base) * b.storeys.max(1.0))
        .sum();
    square_meters_to(area_to_square_meters(plan_area, &site.spatial), unit)
}

/// Coverage: fraction of site (parcel) area occupied by building footprints.
/// Returns 0 when there is no parcel area. Clamped to `[0, 1]`.
pub fn coverage(site: &Site) -> f64 {
    let site_ = site_area(site, AreaUnit::Sqm);
    if site_ <= 0.0 {
        return 0.0;
    }
    clamp01(built_area(site, AreaUnit::Sqm) / site_)
}

/// Floor Area Ratio: gross floor area ÷ site area.
pub fn floor_area_ratio(site: &Site) -> f64 {
    let site_ = site_area(site, AreaUnit::Sqm);
    if site_ <= 0.0 {
        return 0.0;
    }
    gross_floor_area(site, AreaUnit::Sqm) / site_
}

/// Total dwelling units across all buildings.
pub fn dwelling_units(site: &Site) -> f64 {
    buildings(site)
        .map(|b| b.dwelling_units.unwrap_or(0.0))
        .sum()
}

/// Residential density in dwelling units per acre.
pub fn density(site: &Site) -> f64 {
    let acres = site_area(site, AreaUnit::Acres);
    if acres <= 0.0 {
        return 0.0;
    }
    dwelling_units(site) / acres
}

/// Number of lots in the plan.
pub fn lot_count(site: &Site) -> u32 {
    lots(site).count() as u32
}

/// Impervious-surface ratio: fraction of site area under impervious cover.
/// Uses land-use areas classified as impervious plus all building footprints.
pub fn impervious_ratio(site: &Site) -> f64 {
    let site_ = site_area(site, AreaUnit::Sqm);
    if site_ <= 0.0 {
        return 0.0;
    }
    let impervious_land_use: f64 = land_uses(site)
        .filter(|l| land_use_definition(l.category).impervious)
        .map(|l| region_area(&l.base))
        .sum();
    let imp_sqm =
        area_to_square_meters(impervious_land_use, &site.spatial) + built_area(site, AreaUnit::Sqm);
    clamp01(imp_sqm / site_)
}

/// Open-space ratio: fraction of site area classified as open space.
pub fn open_space_ratio(site: &Site) -> f64 {
    let site_ = site_area(site, AreaUnit::Sqm);
    if site_ <= 0.0 {
        return 0.0;
    }
    let open_sqm: f64 = land_uses(site)
        .filter(|l| land_use_definition(l.category).open_space)
        .map(|l| area_to_square_meters(region_area(&l.base), &site.spatial))
        .sum();
    clamp01(open_sqm / site_)
}

/// Land-use allocation: how designated land-use area is distributed across
/// categories, sorted largest-first. Shares are relative to total land-use area.
pub fn land_use_breakdown(site: &Site, unit: AreaUnit) -> Vec<LandUseAllocation> {
    use std::collections::BTreeMap;

    let mut by_category: BTreeMap<LandUseCategory, f64> = BTreeMap::new();
    for l in land_uses(site) {
        *by_category.entry(l.category).or_insert(0.0) +=
            area_to_square_meters(region_area(&l.base), &site.spatial);
    }
    let total_sqm: f64 = by_category.values().sum();

    let mut results: Vec<LandUseAllocation> = by_category
        .into_iter()
        .map(|(category, sqm)| {
            let def = land_use_definition(category);
            LandUseAllocation {
                category,
                label: def.label.to_string(),
                color: def.color.to_string(),
                area: square_meters_to(sqm, unit),
                share: if total_sqm > 0.0 {
                    sqm / total_sqm
                } else {
                    0.0
                },
            }
        })
        .collect();

    results.sort_by(|a, b| {
        b.area
            .partial_cmp(&a.area)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results
}

/// Compute all headline metrics for a site in one pass-friendly call.
pub fn compute_site_metrics(site: &Site, unit: AreaUnit) -> SiteMetrics {
    SiteMetrics {
        site_area: site_area(site, unit),
        built_area: built_area(site, unit),
        gross_floor_area: gross_floor_area(site, unit),
        coverage: coverage(site),
        floor_area_ratio: floor_area_ratio(site),
        density: density(site),
        dwelling_units: dwelling_units(site),
        lot_count: lot_count(site),
        impervious_ratio: impervious_ratio(site),
        open_space_ratio: open_space_ratio(site),
        area_unit: unit,
        allocation: land_use_breakdown(site, unit),
    }
}

/// Compute community-scale metrics. `household_size` defaults to 2.5 persons.
pub fn compute_community_metrics(site: &Site, household_size: f64) -> CommunityMetrics {
    let du = dwelling_units(site);
    let population = du * household_size;
    let site_sq_km = site_area(site, AreaUnit::Sqkm);

    let open_sq_m: f64 = land_uses(site)
        .filter(|l| land_use_definition(l.category).open_space)
        .map(|l| area_to_square_meters(region_area(&l.base), &site.spatial))
        .sum();
    let park_sq_m: f64 = land_uses(site)
        .filter(|l| l.category == LandUseCategory::Park)
        .map(|l| area_to_square_meters(region_area(&l.base), &site.spatial))
        .sum();

    CommunityMetrics {
        dwelling_units: du,
        population,
        population_per_square_km: if site_sq_km > 0.0 {
            population / site_sq_km
        } else {
            0.0
        },
        open_space_per_capita_sq_m: if population > 0.0 {
            open_sq_m / population
        } else {
            0.0
        },
        park_acres_per_thousand: if population > 0.0 {
            square_meters_to(park_sq_m, AreaUnit::Acres) / (population / 1000.0)
        } else {
            0.0
        },
        household_size,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::new_base;
    use thoth_spatial::{ElementKind, Point, Polygon, Unit};

    fn square(size: f64, ox: f64, oy: f64) -> Polygon {
        vec![
            Point::new(ox, oy),
            Point::new(ox + size, oy),
            Point::new(ox + size, oy + size),
            Point::new(ox, oy + size),
        ]
    }

    fn default_ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn test_site() -> Site {
        let parcel = Parcel {
            base: new_base(
                "p1",
                ElementKind::Parcel,
                "Parcel 1",
                "l1",
                square(100.0, 0.0, 0.0),
            ),
            apn: None,
        };
        let building = Building {
            base: new_base(
                "b1",
                ElementKind::Building,
                "Building 1",
                "l1",
                square(50.0, 0.0, 0.0),
            ),
            lot_id: None,
            storeys: 3.0,
            height: None,
            dwelling_units: Some(20.0),
            use_: None,
        };
        let park = LandUse {
            base: new_base(
                "lu1",
                ElementKind::Landuse,
                "Park",
                "l1",
                square(40.0, 0.0, 0.0),
            ),
            category: LandUseCategory::Park,
        };
        let commercial = LandUse {
            base: new_base(
                "lu2",
                ElementKind::Landuse,
                "Shops",
                "l1",
                square(20.0, 0.0, 0.0),
            ),
            category: LandUseCategory::Commercial,
        };
        Site {
            id: "s1".to_string(),
            name: "Test Site".to_string(),
            spatial: default_ctx(),
            layers: vec![],
            elements: vec![
                PlanElement::Parcel(parcel),
                PlanElement::Building(building),
                PlanElement::LandUse(park),
                PlanElement::LandUse(commercial),
            ],
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
    fn sums_parcel_area() {
        assert!((site_area(&test_site(), AreaUnit::Sqm) - 10000.0).abs() < 1e-6);
    }

    #[test]
    fn computes_coverage_from_building_footprints() {
        assert!((coverage(&test_site()) - 0.25).abs() < 1e-9);
    }

    #[test]
    fn computes_far_from_footprint_times_storeys() {
        assert!((floor_area_ratio(&test_site()) - 0.75).abs() < 1e-9);
    }

    #[test]
    fn breaks_land_use_down_largest_first_with_correct_shares() {
        let breakdown = land_use_breakdown(&test_site(), AreaUnit::Sqm);
        assert_eq!(breakdown[0].category, LandUseCategory::Park);
        assert!((breakdown[0].area - 1600.0).abs() < 1e-6);
        assert!((breakdown[0].share - 0.8).abs() < 1e-9);
        assert_eq!(breakdown[1].category, LandUseCategory::Commercial);
    }

    #[test]
    fn computes_a_full_metrics_snapshot() {
        let m = compute_site_metrics(&test_site(), AreaUnit::Acres);
        assert_eq!(m.dwelling_units, 20.0);
        assert_eq!(m.lot_count, 0);
        assert!(m.density > 0.0);
        assert_eq!(m.area_unit, AreaUnit::Acres);
    }

    #[test]
    fn empty_site_reports_zeroed_metrics_without_dividing_by_zero() {
        let site = Site {
            id: "empty".to_string(),
            name: "Empty".to_string(),
            spatial: default_ctx(),
            layers: vec![],
            elements: vec![],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
            monuments: None,
            plss: None,
        };
        assert_eq!(site_area(&site, AreaUnit::Sqm), 0.0);
        assert_eq!(coverage(&site), 0.0);
        assert_eq!(floor_area_ratio(&site), 0.0);
        assert_eq!(density(&site), 0.0);
        assert_eq!(impervious_ratio(&site), 0.0);
        assert_eq!(open_space_ratio(&site), 0.0);
        assert!(land_use_breakdown(&site, AreaUnit::Sqm).is_empty());
    }
}
