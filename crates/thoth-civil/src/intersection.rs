//! Intersection and roundabout design solvers: crown-matching between
//! intersecting roads, curb-return arc generation, parametric roundabout
//! geometry, and AASHTO fastest-path speed analysis.
//!
//! Port of `packages/domain/src/civil/intersection.ts` +
//! `packages/domain/src/civil/types/intersection.ts`. The TS source reads
//! its default curb-return radius from the parts-catalog registry's civil
//! design standards (`curbReturnRadiusFt`), which has no registered value —
//! so it always falls through to its own literal fallback of `25.0`,
//! mirrored here as [`DEFAULT_CURB_RADIUS`].

use thoth_spatial::{add, normalize, scale, Point};

use crate::profile::{profile_elevation_at, VerticalProfile};

/// Default curb-return radius, plan units.
pub const DEFAULT_CURB_RADIUS: f64 = 25.0;

/// How a secondary road's profile is reconciled with the primary road's at
/// an intersection.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntersectionType {
    /// Both roads maintain their normal crowns; grades are simply compared.
    PeerRoadAllCrowns,
    /// The secondary road's PVI locks to the primary road's elevation.
    PrimaryRoadCrown,
}

/// Which quadrant of a 4-way intersection a curb return occupies.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Quadrant {
    Ne,
    Nw,
    Se,
    Sw,
}

/// A curb-return arc definition for one quadrant of an intersection.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CurbReturnQuadrant {
    pub quadrant: Quadrant,
    pub radius: f64,
    pub entry_taper_length: Option<f64>,
    pub exit_taper_length: Option<f64>,
}

/// A road-road intersection definition.
#[derive(Debug, Clone)]
pub struct Intersection {
    pub id: String,
    pub name: String,
    pub primary_alignment_id: String,
    pub secondary_alignment_id: String,
    pub intersection_point: Point,
    pub intersection_type: IntersectionType,
    pub primary_station: f64,
    pub secondary_station: f64,
    pub quadrants: Vec<CurbReturnQuadrant>,
    pub locked_pvis: bool,
}

/// Splitter-island geometry parameters for a roundabout approach.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SplitterIslandPreset {
    pub construction_triangle_length: f64,
    pub splitter_island_width: f64,
    pub crosswalk_offset: f64,
}

/// A named roundabout geometry preset (ring radii + splitter island shape).
#[derive(Debug, Clone)]
pub struct RoundaboutPreset {
    pub id: String,
    pub name: String,
    pub outer_radius: f64,
    pub circulatory_width: f64,
    pub apron_width: f64,
    pub entry_width: f64,
    pub exit_width: f64,
    pub splitter_island: SplitterIslandPreset,
}

/// A roundabout instance placed at a center point.
#[derive(Debug, Clone)]
pub struct Roundabout {
    pub id: String,
    pub name: String,
    pub center_point: Point,
    pub preset: RoundaboutPreset,
    pub approach_alignment_ids: Vec<String>,
}

/// Result of solving crown/grade matching between a primary and secondary
/// road at their intersection.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CrownSolution {
    pub primary_elevation: f64,
    pub secondary_pvi_elevation: f64,
    pub crown_grade_match: f64,
}

/// The generated ring/island geometry of a roundabout.
#[derive(Debug, Clone, PartialEq)]
pub struct RoundaboutGeometry {
    pub center_island: Vec<Point>,
    pub apron_ring: Vec<Point>,
    pub circulatory_outer_ring: Vec<Point>,
    pub splitter_islands: Vec<Vec<Point>>,
}

/// AASHTO fastest-path vehicle trajectory speed results for a roundabout.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FastestPathAnalysisResult {
    pub r1_entry_radius: f64,
    pub r2_circulatory_radius: f64,
    pub r3_exit_radius: f64,
    pub max_entry_speed_mph: f64,
    pub max_circulatory_speed_mph: f64,
    pub max_exit_speed_mph: f64,
    pub is_compliant: bool,
}

/// Solves intersection elevation and crown-grade matching between primary
/// and secondary roads.
pub fn solve_intersection_crown(primary_profile: &VerticalProfile, primary_station: f64, secondary_profile: &VerticalProfile, secondary_station: f64, intersection_type: IntersectionType) -> CrownSolution {
    let primary_elevation = profile_elevation_at(primary_profile, primary_station);

    match intersection_type {
        IntersectionType::PrimaryRoadCrown => {
            // Secondary road grade locks to the primary road's elevation at the intersection PVI.
            CrownSolution { primary_elevation, secondary_pvi_elevation: primary_elevation, crown_grade_match: 0.0 }
        }
        IntersectionType::PeerRoadAllCrowns => {
            // Peer road / all crowns maintained: both roads keep their normal crowns.
            let secondary_elevation = profile_elevation_at(secondary_profile, secondary_station);
            CrownSolution { primary_elevation, secondary_pvi_elevation: secondary_elevation, crown_grade_match: (primary_elevation - secondary_elevation).abs() }
        }
    }
}

/// Generates a curb-return arc polyline connecting two intersecting
/// alignments' bearings for one quadrant.
pub fn generate_curb_return_geometry(intersection_pt: Point, primary_bearing_deg: f64, secondary_bearing_deg: f64, radius: f64, quadrant: Quadrant, samples: u32) -> Vec<Point> {
    let rad1 = primary_bearing_deg * std::f64::consts::PI / 180.0;
    let rad2 = secondary_bearing_deg * std::f64::consts::PI / 180.0;

    let dir1 = Point::new(rad1.sin(), -rad1.cos());
    let dir2 = Point::new(rad2.sin(), -rad2.cos());

    // Offset the corner center along the bisector.
    let bisector = normalize(add(dir1, dir2));
    let quadrant_sign = if matches!(quadrant, Quadrant::Ne | Quadrant::Nw) { 1.0 } else { -1.0 };
    let center = add(intersection_pt, scale(bisector, radius * 1.414 * quadrant_sign));

    let mut points = Vec::new();
    let start_ang = (intersection_pt.y - center.y).atan2(intersection_pt.x - center.x);
    let sweep = std::f64::consts::FRAC_PI_2;

    for i in 0..=samples {
        let ang = start_ang + (sweep * i as f64) / samples as f64;
        points.push(Point::new(center.x + radius * ang.cos(), center.y + radius * ang.sin()));
    }

    points
}

/// Builds parametric roundabout geometry: circulatory roadway ring, center
/// island, apron ring, and 4 splitter islands (one per cardinal approach).
pub fn build_roundabout_geometry(roundabout: &Roundabout, samples: u32) -> RoundaboutGeometry {
    let center_point = roundabout.center_point;
    let preset = &roundabout.preset;
    let r_center = preset.outer_radius - preset.circulatory_width - preset.apron_width;
    let r_apron = preset.outer_radius - preset.circulatory_width;
    let r_outer = preset.outer_radius;

    let make_ring = |r: f64| -> Vec<Point> {
        (0..=samples)
            .map(|i| {
                let ang = 2.0 * std::f64::consts::PI * i as f64 / samples as f64;
                Point::new(center_point.x + r * ang.cos(), center_point.y + r * ang.sin())
            })
            .collect()
    };

    let center_island = make_ring(r_center);
    let apron_ring = make_ring(r_apron);
    let circulatory_outer_ring = make_ring(r_outer);

    // Generate splitter islands for each approach.
    let approach_angles = [0.0, std::f64::consts::FRAC_PI_2, std::f64::consts::PI, 3.0 * std::f64::consts::FRAC_PI_2];
    let mut splitter_islands = Vec::new();

    for &ang in &approach_angles {
        let p1 = Point::new(center_point.x + r_outer * ang.cos(), center_point.y + r_outer * ang.sin());
        let r2 = r_outer + preset.splitter_island.construction_triangle_length;
        let p2 = Point::new(center_point.x + r2 * (ang + 0.1).cos(), center_point.y + r2 * (ang + 0.1).sin());
        let p3 = Point::new(center_point.x + r2 * (ang - 0.1).cos(), center_point.y + r2 * (ang - 0.1).sin());
        splitter_islands.push(vec![p1, p2, p3, p1]);
    }

    RoundaboutGeometry { center_island, apron_ring, circulatory_outer_ring, splitter_islands }
}

/// Calculates AASHTO fastest-path vehicle trajectory speeds inside a
/// roundabout: `V = sqrt(15 * R * (e + f))` where `e = 0.02` and `f` is the
/// side-friction factor.
pub fn analyze_roundabout_fastest_path(outer_radius: f64, side_friction: f64) -> FastestPathAnalysisResult {
    let r1_entry_radius = outer_radius * 0.6;
    let r2_circulatory_radius = outer_radius * 0.85;
    let r3_exit_radius = outer_radius * 1.2;

    let calc_speed = |r: f64| -> f64 { (15.0 * r * (0.02 + side_friction)).sqrt() };

    let max_entry_speed_mph = calc_speed(r1_entry_radius);
    let max_circulatory_speed_mph = calc_speed(r2_circulatory_radius);
    let max_exit_speed_mph = calc_speed(r3_exit_radius);

    // AASHTO rule: entry speed should not exceed 25 mph for single-lane roundabouts.
    let is_compliant = max_entry_speed_mph <= 25.5;

    FastestPathAnalysisResult { r1_entry_radius, r2_circulatory_radius, r3_exit_radius, max_entry_speed_mph, max_circulatory_speed_mph, max_exit_speed_mph, is_compliant }
}

/// Exports roundabout presets to an XML schema.
pub fn export_roundabout_presets_to_xml(presets: &[RoundaboutPreset]) -> String {
    let items = presets
        .iter()
        .map(|p| {
            format!(
                "    <Preset id=\"{}\" name=\"{}\" outerRadius=\"{}\" circulatoryWidth=\"{}\" apronWidth=\"{}\">\n      <SplitterIsland length=\"{}\" width=\"{}\"/>\n    </Preset>",
                p.id, p.name, p.outer_radius, p.circulatory_width, p.apron_width, p.splitter_island.construction_triangle_length, p.splitter_island.splitter_island_width
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<RoundaboutPresets>\n{}\n</RoundaboutPresets>", items)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::profile::VerticalPvi;
    use approx::assert_relative_eq;

    fn profile(elevs: &[(f64, f64)]) -> VerticalProfile {
        VerticalProfile { id: "p".into(), name: "P".into(), alignment_id: "a".into(), pvis: elevs.iter().map(|&(station, elevation)| VerticalPvi { station, elevation, curve_length: None }).collect() }
    }

    #[test]
    fn primary_road_crown_locks_secondary_to_primary_elevation() {
        let primary = profile(&[(0.0, 100.0), (100.0, 110.0)]);
        let secondary = profile(&[(0.0, 95.0), (100.0, 105.0)]);
        let solved = solve_intersection_crown(&primary, 50.0, &secondary, 50.0, IntersectionType::PrimaryRoadCrown);
        assert_relative_eq!(solved.secondary_pvi_elevation, solved.primary_elevation, epsilon = 1e-9);
        assert_eq!(solved.crown_grade_match, 0.0);
    }

    #[test]
    fn peer_road_reports_grade_mismatch() {
        let primary = profile(&[(0.0, 100.0), (100.0, 110.0)]);
        let secondary = profile(&[(0.0, 95.0), (100.0, 105.0)]);
        let solved = solve_intersection_crown(&primary, 50.0, &secondary, 50.0, IntersectionType::PeerRoadAllCrowns);
        assert!(solved.crown_grade_match > 0.0);
    }

    #[test]
    fn curb_return_geometry_is_a_quarter_circle_arc_of_the_given_radius() {
        let pt = Point::new(0.0, 0.0);
        let radius = 25.0;
        let pts = generate_curb_return_geometry(pt, 0.0, 90.0, radius, Quadrant::Ne, 16);
        assert_eq!(pts.len(), 17);

        // Reconstruct the same center the implementation computes (bearing 0 =
        // north, bearing 90 = east; NE quadrant => +bisector offset).
        let dir1 = Point::new(0.0, -1.0);
        let dir2 = Point::new(1.0, 0.0);
        let bisector = normalize(add(dir1, dir2));
        let center = add(pt, scale(bisector, radius * 1.414));

        for p in &pts {
            assert_relative_eq!(thoth_spatial::distance(*p, center), radius, epsilon = 1e-9);
        }
        // A 90-degree sweep: first and last arc points are perpendicular from the center.
        let v0 = thoth_spatial::subtract(pts[0], center);
        let v_last = thoth_spatial::subtract(*pts.last().unwrap(), center);
        assert_relative_eq!(thoth_spatial::dot(v0, v_last), 0.0, epsilon = 1e-6);
    }

    #[test]
    fn roundabout_geometry_rings_are_concentric_and_correctly_ordered() {
        let preset = RoundaboutPreset {
            id: "p1".into(),
            name: "Standard".into(),
            outer_radius: 100.0,
            circulatory_width: 20.0,
            apron_width: 10.0,
            entry_width: 16.0,
            exit_width: 16.0,
            splitter_island: SplitterIslandPreset { construction_triangle_length: 30.0, splitter_island_width: 6.0, crosswalk_offset: 10.0 },
        };
        let roundabout = Roundabout { id: "r1".into(), name: "R1".into(), center_point: Point::new(0.0, 0.0), preset, approach_alignment_ids: vec![] };
        let geo = build_roundabout_geometry(&roundabout, 64);
        assert_eq!(geo.splitter_islands.len(), 4);
        let r_center = thoth_spatial::distance(geo.center_island[0], Point::ZERO);
        let r_apron = thoth_spatial::distance(geo.apron_ring[0], Point::ZERO);
        let r_outer = thoth_spatial::distance(geo.circulatory_outer_ring[0], Point::ZERO);
        assert!(r_center < r_apron);
        assert!(r_apron < r_outer);
    }

    #[test]
    fn fastest_path_flags_noncompliant_large_roundabouts() {
        let small = analyze_roundabout_fastest_path(60.0, 0.2);
        assert!(small.is_compliant);
        let large = analyze_roundabout_fastest_path(400.0, 0.2);
        assert!(!large.is_compliant);
    }
}
