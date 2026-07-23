//! Grading-optimization solver: cut/fill balance minimization over a
//! candidate pad-elevation search.
//!
//! Item 40 of the Theme 4 subdivision-design-automation gap analysis. Per
//! the task brief's explicit alternative, this is a **self-contained**
//! solver built only on [`Site`]/[`GradeRegion`] data already in this crate
//! — it does not depend on `thoth-civil`'s grading/mass-haul/earthwork
//! engine (which models a real triangulated terrain surface and would be
//! the correct tool for a construction-document-grade earthwork take-off).
//! See `GAP_ANALYSIS_STATUS.md` for why that dependency was not added.
//!
//! ## Model
//! Existing ground elevation at a [`GradeRegion`]'s centroid is estimated by
//! inverse-distance-weighted (IDW) interpolation over the site's
//! [`SpotElevationPoint`] elements — the only "terrain" this crate has
//! without a real triangulated surface. Each region is then treated as a
//! single flat pad: `cut_or_fill_volume = area × (existing_elevation −
//! target_elevation)`, a first-order (prismoidal-free) approximation that
//! ignores side-slope volumes, compaction/shrink-swell factors, and
//! subgrade preparation.
//!
//! The "optimization" is a bounded 1-D search over a uniform elevation
//! offset applied to every region's target elevation together (e.g. "raise
//! the whole pad plan by 0.3 m"), minimizing the site-wide cut/fill
//! imbalance `|total_cut − total_fill|`. This models the common real-world
//! decision of shifting a whole graded plan up or down to balance earthwork
//! without re-deriving individual pad elevations; it does **not**
//! independently optimize each pad's elevation (that would be a linear/
//! quadratic program over all region elevations jointly, subject to
//! min/max elevation and slope-tie-in constraints — out of scope here).
//! Because the objective is exactly linear in the offset, the search result
//! is cross-checked in tests against the closed-form solution.

use serde::{Deserialize, Serialize};
use thoth_spatial::Point;

use crate::curve::boundary_area;
use crate::elements::{GradeRegion, PlanElement, Site, SpotElevationPoint};

/// IDW power exponent — 2 is the conventional default for spot-elevation
/// interpolation (heavier weight to nearby points than power 1, without the
/// numerical instability of higher powers near sparse point sets).
const IDW_POWER: f64 = 2.0;

/// Estimate the existing ground elevation at `point` via inverse-distance-
/// weighted interpolation over `site`'s [`SpotElevationPoint`] elements.
/// Returns `None` if the site has no spot elevations to interpolate from. A
/// query point exactly coincident with a spot elevation returns that spot's
/// elevation directly (avoiding a division by zero).
pub fn estimate_existing_elevation(site: &Site, point: Point) -> Option<f64> {
    let spots: Vec<&SpotElevationPoint> = site
        .elements
        .iter()
        .filter_map(|e| match e {
            PlanElement::Spot(s) => Some(s),
            _ => None,
        })
        .collect();
    if spots.is_empty() {
        return None;
    }

    for s in &spots {
        let d = thoth_spatial::distance(point, s.position);
        if d < 1e-9 {
            return Some(s.z);
        }
    }

    let mut weighted_sum = 0.0;
    let mut weight_total = 0.0;
    for s in &spots {
        let d = thoth_spatial::distance(point, s.position);
        let w = 1.0 / d.powf(IDW_POWER);
        weighted_sum += w * s.z;
        weight_total += w;
    }
    Some(weighted_sum / weight_total)
}

/// Cut/fill earthwork for one [`GradeRegion`] under the flat-pad model.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct RegionEarthwork {
    pub area: f64,
    pub existing_elevation: f64,
    pub target_elevation: f64,
    /// Volume of material to remove (existing above target), plan units³.
    pub cut_volume: f64,
    /// Volume of material to import (existing below target), plan units³.
    pub fill_volume: f64,
}

/// Site-wide earthwork summary across every [`GradeRegion`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EarthworkSummary {
    pub regions: Vec<RegionEarthwork>,
    pub total_cut: f64,
    pub total_fill: f64,
    /// `total_cut - total_fill`: positive means excess material to export,
    /// negative means material must be imported.
    pub net_export: f64,
}

fn region_earthwork(site: &Site, region: &GradeRegion) -> RegionEarthwork {
    let area = boundary_area(&region.base.boundary, region.base.arcs.as_ref());
    let centroid = thoth_spatial::centroid(&region.base.boundary);
    // No spot elevations on site: assume existing == target (zero net
    // earthwork) rather than fabricating a number — see the module doc.
    let existing_elevation = estimate_existing_elevation(site, centroid).unwrap_or(region.target_elevation);
    let volume = area * (existing_elevation - region.target_elevation);
    RegionEarthwork {
        area,
        existing_elevation,
        target_elevation: region.target_elevation,
        cut_volume: volume.max(0.0),
        fill_volume: (-volume).max(0.0),
    }
}

fn grade_regions(site: &Site) -> impl Iterator<Item = &GradeRegion> {
    site.elements.iter().filter_map(|e| match e {
        PlanElement::GradeRegion(g) => Some(g),
        _ => None,
    })
}

/// Compute the site-wide earthwork summary under the flat-pad model, with
/// every region's target elevation shifted by `offset` (pass `0.0` for the
/// plan as drawn).
pub fn site_earthwork_summary(site: &Site, offset: f64) -> EarthworkSummary {
    let regions: Vec<RegionEarthwork> = grade_regions(site)
        .map(|g| {
            let mut shifted = g.clone();
            shifted.target_elevation += offset;
            region_earthwork(site, &shifted)
        })
        .collect();
    let total_cut = regions.iter().map(|r| r.cut_volume).sum();
    let total_fill = regions.iter().map(|r| r.fill_volume).sum();
    EarthworkSummary {
        regions,
        total_cut,
        total_fill,
        net_export: total_cut - total_fill,
    }
}

/// The result of a uniform-offset grading-balance search.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct GradingOptimizationResult {
    /// The elevation offset (applied uniformly to every region) that
    /// minimizes `|total_cut - total_fill|` over the searched range.
    pub best_offset: f64,
    pub total_cut: f64,
    pub total_fill: f64,
    pub net_export: f64,
    pub candidates_evaluated: u32,
}

/// Search `[min_offset, max_offset]` in steps of `step` for the uniform
/// elevation offset that best balances site-wide cut and fill. The
/// objective is exactly linear in the offset (see the module doc), so this
/// search's result should closely match the closed-form optimum; the
/// discrete step size is the only source of approximation error.
///
/// # Errors
/// Returns `None` if `step <= 0.0`, `max_offset < min_offset`, or the site
/// has no `GradeRegion` elements to balance.
pub fn optimize_grading_balance(
    site: &Site,
    min_offset: f64,
    max_offset: f64,
    step: f64,
) -> Option<GradingOptimizationResult> {
    if step <= 0.0 || max_offset < min_offset || grade_regions(site).next().is_none() {
        return None;
    }

    let mut best: Option<GradingOptimizationResult> = None;
    let mut offset = min_offset;
    let mut candidates_evaluated = 0u32;
    while offset <= max_offset + 1e-9 {
        let summary = site_earthwork_summary(site, offset);
        let imbalance = (summary.total_cut - summary.total_fill).abs();
        candidates_evaluated += 1;
        let better = match &best {
            None => true,
            Some(b) => imbalance < (b.total_cut - b.total_fill).abs(),
        };
        if better {
            best = Some(GradingOptimizationResult {
                best_offset: offset,
                total_cut: summary.total_cut,
                total_fill: summary.total_fill,
                net_export: summary.net_export,
                candidates_evaluated,
            });
        }
        offset += step;
    }
    best.map(|mut r| {
        r.candidates_evaluated = candidates_evaluated;
        r
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::elements::new_base;
    use approx::assert_relative_eq;
    use thoth_spatial::{ElementKind, Polygon, SpatialContext, Unit};

    fn square(size: f64, ox: f64, oy: f64) -> Polygon {
        vec![
            Point::new(ox, oy),
            Point::new(ox + size, oy),
            Point::new(ox + size, oy + size),
            Point::new(ox, oy + size),
        ]
    }

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn spot(id: &str, x: f64, y: f64, z: f64) -> PlanElement {
        PlanElement::Spot(SpotElevationPoint {
            id: id.to_string(),
            kind: ElementKind::Spot,
            layer_id: "l".to_string(),
            position: Point::new(x, y),
            z,
            label: None,
            renovation_status: Default::default(),
        })
    }

    fn grade_region(id: &str, size: f64, ox: f64, oy: f64, target: f64) -> PlanElement {
        PlanElement::GradeRegion(GradeRegion {
            base: new_base(id, ElementKind::Grade, id, "l", square(size, ox, oy)),
            target_elevation: target,
            method: None,
        })
    }

    #[test]
    fn idw_returns_exact_elevation_at_a_coincident_point() {
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![spot("sp1", 0.0, 0.0, 100.0), spot("sp2", 100.0, 0.0, 110.0)],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };
        let e = estimate_existing_elevation(&site, Point::new(0.0, 0.0)).unwrap();
        assert_relative_eq!(e, 100.0, epsilon = 1e-9);
    }

    #[test]
    fn idw_interpolates_between_two_spots_at_the_midpoint() {
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![spot("sp1", 0.0, 0.0, 100.0), spot("sp2", 100.0, 0.0, 110.0)],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };
        // Equidistant from both spots -> equal weights -> simple average.
        let e = estimate_existing_elevation(&site, Point::new(50.0, 0.0)).unwrap();
        assert_relative_eq!(e, 105.0, epsilon = 1e-9);
    }

    #[test]
    fn no_spot_elevations_yields_none() {
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
        assert!(estimate_existing_elevation(&site, Point::ZERO).is_none());
    }

    /// Two pads of equal area, one requiring cut and one requiring fill, at
    /// a uniform-offset optimum that should drive them to an exact balance
    /// — cross-checked against the closed-form solution.
    #[test]
    fn optimizer_finds_the_balancing_offset_matching_the_closed_form_solution() {
        // Existing grade is flat at 100.0 everywhere (one spot far enough
        // that IDW is effectively constant across both small pads).
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![
                spot("sp1", 5.0, 5.0, 100.0),
                grade_region("g1", 10.0, 0.0, 0.0, 98.0), // area 100, existing-target=2 -> cut
                grade_region("g2", 10.0, 20.0, 0.0, 102.0), // area 100, existing-target=-2 -> fill
            ],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };
        // With a single spot at (5,5), both pad centroids are (5,5) and
        // (25,5) respectively -> IDW isn't perfectly flat, but the case is
        // still linear in the offset, so the closed form still applies:
        // net(delta) = sum(area_i*(existing_i - target_i - delta))
        //            = sum(area_i*(existing_i-target_i)) - delta*sum(area_i)
        // Solve net(delta)=0 for delta*.
        let baseline = site_earthwork_summary(&site, 0.0);
        let total_area: f64 = baseline.regions.iter().map(|r| r.area).sum();
        let net_at_zero = baseline.total_cut - baseline.total_fill;
        let closed_form_offset = net_at_zero / total_area;

        let result = optimize_grading_balance(&site, -5.0, 5.0, 0.01).unwrap();
        assert_relative_eq!(result.best_offset, closed_form_offset, epsilon = 0.05);
        assert!((result.total_cut - result.total_fill).abs() < 5.0);
        assert!(result.candidates_evaluated > 1);
    }

    #[test]
    fn returns_none_for_a_site_with_no_grade_regions_or_bad_search_range() {
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![spot("sp1", 0.0, 0.0, 100.0)],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };
        assert!(optimize_grading_balance(&site, -5.0, 5.0, 0.1).is_none());

        let with_region = Site {
            elements: vec![grade_region("g1", 10.0, 0.0, 0.0, 100.0)],
            ..site
        };
        assert!(optimize_grading_balance(&with_region, 5.0, -5.0, 0.1).is_none()); // max < min
        assert!(optimize_grading_balance(&with_region, -5.0, 5.0, 0.0).is_none()); // step <= 0
    }

    #[test]
    fn region_without_any_spot_elevations_assumes_zero_net_earthwork() {
        let site = Site {
            id: "s".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![grade_region("g1", 10.0, 0.0, 0.0, 100.0)],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };
        let summary = site_earthwork_summary(&site, 0.0);
        assert_eq!(summary.total_cut, 0.0);
        assert_eq!(summary.total_fill, 0.0);
    }
}
