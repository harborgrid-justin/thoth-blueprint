//! Road corridor modeling: sweeping an assembly's cross-section along a
//! horizontal alignment/vertical profile to build 3D section points, feature
//! lines, and surface meshes.
//!
//! Port of `packages/domain/src/civil/corridor.ts` +
//! `packages/domain/src/civil/types/corridor.ts`. The TS source reads its
//! default sampling frequency from the parts-catalog registry's civil design
//! standards (`corridorSamplingIntervalFt`), which has no registered value —
//! so it always falls through to its own literal fallback of `25.0`,
//! mirrored here as [`DEFAULT_SAMPLING_FREQUENCY`].

use thoth_spatial::{add, scale, Point};

use crate::alignment::{point_at_station, resolve_alignment, HorizontalAlignment};
use crate::assembly::{resolve_assembly_offset, Assembly};
use crate::grading::Point3D;
use crate::profile::{profile_elevation_at, VerticalProfile};
use crate::superelevation::SuperelevationCurve;
use crate::terrain::{elevation_at, ElevationGrid};

/// Default corridor station sampling frequency, plan units.
pub const DEFAULT_SAMPLING_FREQUENCY: f64 = 25.0;

/// A target-referenced assembly region — a corridor sub-region driven by a
/// non-default assembly, terrain target, or offset alignment.
#[derive(Debug, Clone)]
pub struct CorridorTarget {
    pub id: String,
    pub subassembly_id: String,
    pub target_type: CorridorTargetType,
    pub target_id: String,
}

/// What a [`CorridorTarget`] resolves against.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CorridorTargetType {
    Surface,
    OffsetAlignment,
    ElevationProfile,
    Polyline,
}

/// A station-range region of a corridor using a specific assembly.
#[derive(Debug, Clone)]
pub struct CorridorRegion {
    pub id: String,
    pub name: String,
    pub assembly_id: String,
    pub start_station: f64,
    pub end_station: f64,
    pub frequency: Option<f64>,
    pub targets: Vec<CorridorTarget>,
}

/// A single station-specific parameter override on a corridor.
#[derive(Debug, Clone, Copy)]
pub struct StationParameterOverride {
    pub station: f64,
    pub subassembly_id: &'static str,
    pub parameter_name: &'static str,
    pub value: f64,
}

/// A road corridor: an alignment + profile + assembly swept at a station
/// frequency, optionally overridden by [`CorridorRegion`]s.
#[derive(Debug, Clone)]
pub struct Corridor {
    pub id: String,
    pub name: String,
    pub alignment_id: String,
    pub profile_id: String,
    pub assembly_id: String,
    /// Station interval (e.g. 50 or 100 feet).
    pub frequency: f64,
    pub regions: Vec<CorridorRegion>,
    pub overrides: Vec<StationParameterOverride>,
}

/// A single resolved 3D corridor section point (station + world coordinate).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CorridorSectionPoint {
    pub station: f64,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

/// A resolved 3D corridor section point tagged with its feature code (e.g.
/// `Centerline`, `EdgeOfPavement_left`).
#[derive(Debug, Clone, PartialEq)]
pub struct CorridorSection {
    pub code: String,
    pub point: CorridorSectionPoint,
}

/// A 3D polyline extracted from a corridor sweep for one feature code (e.g.
/// `Centerline`, `EdgeOfPavement_left`).
#[derive(Debug, Clone, PartialEq)]
pub struct CorridorFeatureLine {
    pub code: String,
    pub points: Vec<Point3D>,
}

/// One triangle of a corridor surface mesh.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MeshTriangle {
    pub p1: Point3D,
    pub p2: Point3D,
    pub p3: Point3D,
}

/// Builds 3D points representing the corridor model, one [`CorridorSection`]
/// per (station, assembly-offset-point) pair. `superelevation` defaults lane
/// slopes to `-0.02`/`-0.02` (normal crown) when absent; `target_terrain`, if
/// given, re-projects any `DaylightTarget_*` point straight down/up onto the
/// terrain surface (a simplified daylight intersection, matching the TS
/// source's own documented simplification — a full triangle-mesh ray
/// intersection is out of scope for both).
pub fn build_corridor_sections(corridor: &Corridor, alignment: &HorizontalAlignment, profile: &VerticalProfile, assembly: &Assembly, superelevation: Option<&SuperelevationCurve>, target_terrain: Option<&ElevationGrid>) -> Vec<CorridorSection> {
    let Ok(resolved) = resolve_alignment(alignment) else {
        return Vec::new();
    };

    let mut sections = Vec::new();
    let freq = if corridor.frequency > 0.0 { corridor.frequency } else { DEFAULT_SAMPLING_FREQUENCY };
    let stations_count = (resolved.length / freq).floor() as i64;

    for i in 0..=stations_count {
        let station = i as f64 * freq;
        let base_station = resolved.start_station + station;
        let Ok(at_station) = point_at_station(&resolved, base_station) else {
            continue;
        };

        let z_base = profile_elevation_at(profile, station);

        let slopes = superelevation.map_or((-0.02, -0.02), |s| {
            let ls = crate::superelevation::get_superelevation_slope(s, station);
            (ls.left_slope, ls.right_slope)
        });

        let offset_points = resolve_assembly_offset(assembly, slopes.0, slopes.1);

        let rad = at_station.bearing * std::f64::consts::PI / 180.0;
        let dir = Point::new(rad.sin(), -rad.cos());
        let normal = Point::new(-dir.y, dir.x);

        let base_pos = at_station.point;

        for offset_pt in offset_points {
            let pos = add(base_pos, scale(normal, offset_pt.x));
            let mut z = z_base + offset_pt.y;
            let mut code = offset_pt.code;

            if code.starts_with("DaylightTarget_") {
                if let Some(terrain) = target_terrain {
                    // Daylight intersection: project straight down/up to the
                    // terrain elevation at this X,Y. A full ray/mesh
                    // intersection is out of scope, matching the TS source.
                    z = elevation_at(terrain, pos);
                    code = code.replacen("DaylightTarget_", "Daylight_", 1);
                }
            }

            sections.push(CorridorSection { code, point: CorridorSectionPoint { station, x: pos.x, y: pos.y, z } });
        }
    }

    sections
}

/// Extracts 3D coordinate lines for specific point codes (e.g. `Centerline`,
/// `EdgeOfPavement_left`), grouping every section point sharing a code into
/// one polyline in station order.
pub fn extract_corridor_feature_lines(sections: &[CorridorSection]) -> Vec<CorridorFeatureLine> {
    let mut order: Vec<&str> = Vec::new();
    let mut groups: std::collections::HashMap<&str, Vec<Point3D>> = std::collections::HashMap::new();

    for s in sections {
        groups.entry(s.code.as_str()).or_insert_with(|| {
            order.push(s.code.as_str());
            Vec::new()
        });
        groups.get_mut(s.code.as_str()).unwrap().push(Point3D::new(s.point.x, s.point.y, s.point.z));
    }

    order.into_iter().map(|code| CorridorFeatureLine { code: code.to_string(), points: groups.remove(code).unwrap_or_default() }).collect()
}

/// Builds 3D Top TIN surface mesh triangles from corridor section point
/// sweeps, connecting adjacent stations' offset points into a triangle
/// strip.
pub fn build_corridor_surfaces(sections: &[CorridorSection]) -> Vec<MeshTriangle> {
    let mut station_order: Vec<i64> = Vec::new();
    let mut station_groups: std::collections::HashMap<i64, Vec<&CorridorSection>> = std::collections::HashMap::new();

    // Station keys as integer-scaled to give stable HashMap keys for f64 stations.
    let key = |s: f64| -> i64 { (s * 1e6).round() as i64 };

    for s in sections {
        let k = key(s.point.station);
        station_groups.entry(k).or_insert_with(|| {
            station_order.push(k);
            Vec::new()
        });
        station_groups.get_mut(&k).unwrap().push(s);
    }
    station_order.sort_unstable();

    let mut triangles = Vec::new();
    for w in station_order.windows(2) {
        let pts1 = &station_groups[&w[0]];
        let pts2 = &station_groups[&w[1]];
        let min_len = pts1.len().min(pts2.len());

        for j in 0..min_len.saturating_sub(1) {
            let a = Point3D::new(pts1[j].point.x, pts1[j].point.y, pts1[j].point.z);
            let b = Point3D::new(pts1[j + 1].point.x, pts1[j + 1].point.y, pts1[j + 1].point.z);
            let c = Point3D::new(pts2[j].point.x, pts2[j].point.y, pts2[j].point.z);
            let d = Point3D::new(pts2[j + 1].point.x, pts2[j + 1].point.y, pts2[j + 1].point.z);

            triangles.push(MeshTriangle { p1: a, p2: b, p3: c });
            triangles.push(MeshTriangle { p1: b, p2: d, p3: c });
        }
    }

    triangles
}

/// Automatically builds median/splitter island bottom-of-curb and
/// top-of-curb feature lines at a constant elevation near the surrounding
/// corridor's average.
pub fn build_intersection_islands(island_outline: &[Point], corridor_sections: &[CorridorSection]) -> Vec<CorridorFeatureLine> {
    let avg_z = if corridor_sections.is_empty() { 0.0 } else { corridor_sections.iter().map(|s| s.point.z).sum::<f64>() / corridor_sections.len() as f64 };

    let bottom_of_curb: Vec<Point3D> = island_outline.iter().map(|p| Point3D::new(p.x, p.y, avg_z)).collect();
    let top_of_curb: Vec<Point3D> = island_outline.iter().map(|p| Point3D::new(p.x, p.y, avg_z + 0.5)).collect();

    vec![CorridorFeatureLine { code: "Island_BOC".to_string(), points: bottom_of_curb }, CorridorFeatureLine { code: "Island_TOC".to_string(), points: top_of_curb }]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::alignment::AlignmentPi;
    use crate::assembly::{Side, Subassembly, SubassemblyParam, SubassemblyType};
    use crate::profile::VerticalPvi;
    use approx::assert_relative_eq;

    #[test]
    fn builds_3d_coordinate_points_along_baseline_stations() {
        let align = HorizontalAlignment::new("a1", "Road Corridor", vec![AlignmentPi::simple(Point::new(0.0, 0.0)), AlignmentPi::simple(Point::new(500.0, 0.0))], 0.0);
        let profile = VerticalProfile { id: "p1".into(), name: "Profile".into(), alignment_id: "a1".into(), pvis: vec![VerticalPvi { station: 0.0, elevation: 100.0, curve_length: None }, VerticalPvi { station: 500.0, elevation: 110.0, curve_length: None }] };
        let assembly = Assembly {
            id: "as-1".into(),
            name: "Assembly A".into(),
            left_subassemblies: vec![Subassembly { id: "l1".into(), name: "Left Lane".into(), side: Side::Left, subassembly_type: SubassemblyType::Lane, parameters: vec![SubassemblyParam { name: "Width", value: 10.0 }] }],
            right_subassemblies: vec![Subassembly { id: "r1".into(), name: "Right Lane".into(), side: Side::Right, subassembly_type: SubassemblyType::Lane, parameters: vec![SubassemblyParam { name: "Width", value: 10.0 }] }],
        };
        let corridor = Corridor { id: "c1".into(), name: "Corridor".into(), alignment_id: "a1".into(), profile_id: "p1".into(), assembly_id: "as-1".into(), frequency: 100.0, regions: vec![], overrides: vec![] };

        let sections = build_corridor_sections(&corridor, &align, &profile, &assembly, None, None);
        assert!(!sections.is_empty());
        let cl = sections.iter().find(|s| s.point.station == 100.0 && s.code == "Centerline").unwrap();
        assert_relative_eq!(cl.point.z, 102.0, epsilon = 0.1);
    }

    #[test]
    fn extract_and_build_surfaces_from_sections() {
        let sections = vec![
            CorridorSection { code: "Centerline".into(), point: CorridorSectionPoint { station: 0.0, x: 0.0, y: 0.0, z: 100.0 } },
            CorridorSection { code: "Centerline".into(), point: CorridorSectionPoint { station: 100.0, x: 100.0, y: 0.0, z: 101.0 } },
            CorridorSection { code: "EdgeOfPavement_left".into(), point: CorridorSectionPoint { station: 0.0, x: -10.0, y: 0.0, z: 100.2 } },
            CorridorSection { code: "EdgeOfPavement_left".into(), point: CorridorSectionPoint { station: 100.0, x: 90.0, y: 0.0, z: 101.2 } },
        ];
        let lines = extract_corridor_feature_lines(&sections);
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0].points.len(), 2);

        let mesh = build_corridor_surfaces(&sections);
        assert_eq!(mesh.len(), 2);
    }

    #[test]
    fn build_corridor_sections_returns_empty_for_degenerate_alignment() {
        let align = HorizontalAlignment::new("a1", "Degenerate", vec![AlignmentPi::simple(Point::ZERO)], 0.0);
        let profile = VerticalProfile { id: "p1".into(), name: "P".into(), alignment_id: "a1".into(), pvis: vec![] };
        let assembly = Assembly { id: "as-1".into(), name: "A".into(), left_subassemblies: vec![], right_subassemblies: vec![] };
        let corridor = Corridor { id: "c1".into(), name: "C".into(), alignment_id: "a1".into(), profile_id: "p1".into(), assembly_id: "as-1".into(), frequency: 100.0, regions: vec![], overrides: vec![] };
        assert!(build_corridor_sections(&corridor, &align, &profile, &assembly, None, None).is_empty());
    }
}
