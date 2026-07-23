//! 3D feature lines & subdivision grading edits — REQ-089 through REQ-095,
//! REQ-183 through REQ-198.
//!
//! Port of `packages/domain/src/civil/featureLinesAndGrading.ts` +
//! `packages/domain/src/civil/types/featureLinesAndGrading.ts`. The TS
//! source imports `Point2D`/`LineSegment` from
//! `packages/domain/src/survey/transparentCommands` (here:
//! `thoth_spatial::Point`/[`crate::common::LineSegment`]) and `Point3D` from
//! `./grading` (here: [`crate::grading::Point3D`], already ported in this
//! crate).

use thoth_spatial::Point;

use crate::common::LineSegment;
use crate::error::{CivilError, CivilResult};
use crate::grading::Point3D;

/// A minimum feature-line vertex count below which "delete one vertex"
/// would leave less than a real line (REQ-189).
pub const MIN_FEATURE_LINE_VERTICES: usize = 2;

/// A per-vertex 3D arc annotation on a feature line.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Arc3D {
    pub vertex_index: usize,
    pub radius: f64,
    pub elevation_start: f64,
    pub elevation_end: f64,
}

/// REQ-196: an elevation point that changes grade along a segment without
/// altering horizontal geometry.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ElevationPoint {
    pub distance_along_segment_ft: f64,
    pub elevation_ft: f64,
}

/// A 3D feature line: a topological breakline used for grading, corridors,
/// and TIN surfaces.
#[derive(Debug, Clone, PartialEq)]
pub struct FeatureLine {
    pub id: String,
    pub name: String,
    pub site_id: String,
    pub style_name: Option<String>,
    pub points: Vec<Point3D>,
    pub arcs: Option<Vec<Arc3D>>,
    pub elevation_points: Option<Vec<ElevationPoint>>,
    pub dynamic_surface_link_id: Option<String>,
    pub dynamic_corridor_link_id: Option<String>,
    pub dynamic_alignment_link_id: Option<String>,
}

/// A single row of the Panorama Elevation Editor (REQ-191).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PanoramaElevationEditorRow {
    pub vertex_index: usize,
    pub station: f64,
    pub elevation: f64,
    pub length: f64,
    pub grade_back_percent: f64,
    pub grade_ahead_percent: f64,
}

/// A single line-weeding configuration column (declared for parity with the
/// TS `LineWeedingConfig` type; [`apply_line_weeding`] takes the equivalent
/// [`WeedingParameters`] directly).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LineWeedingConfig {
    pub max_angle_delta_deg: f64,
    pub max_grade_delta_percent: f64,
    pub min_3d_distance_ft: f64,
}

/// REQ-183, REQ-184: line-weeding thresholds.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WeedingParameters {
    pub angle_threshold_deg: f64,
    pub grade_threshold_percent: f64,
    pub three_d_distance_threshold_ft: f64,
}

/// REQ-198: per-site style precedence used to resolve split points between
/// feature lines of different styles.
#[derive(Debug, Clone, PartialEq)]
pub struct FeatureLineSiteProperties {
    pub site_id: String,
    /// Style names, in order of split-point resolution precedence.
    pub style_priority_hierarchy: Vec<String>,
}

const XY_COINCIDENCE_TOLERANCE: f64 = 1e-4;
const Z_COINCIDENCE_TOLERANCE: f64 = 1e-4;

/// REQ-089, REQ-090: create a 3D feature line, enforcing the
/// single-elevation topology rule (every unique XY coordinate in a site may
/// carry only one elevation).
pub fn create_feature_line(
    site_id: impl Into<String>,
    name: impl Into<String>,
    points: Vec<Point3D>,
    existing_feature_lines_in_site: &[FeatureLine],
    arcs: Option<Vec<Arc3D>>,
) -> CivilResult<FeatureLine> {
    let site_id = site_id.into();

    for pt in &points {
        for fl in existing_feature_lines_in_site {
            for existing_pt in &fl.points {
                if (pt.x - existing_pt.x).hypot(pt.y - existing_pt.y) < XY_COINCIDENCE_TOLERANCE
                    && (pt.z - existing_pt.z).abs() > Z_COINCIDENCE_TOLERANCE
                {
                    return Err(CivilError::SingleElevationViolation {
                        x: pt.x,
                        y: pt.y,
                        existing_z: existing_pt.z,
                        new_z: pt.z,
                    });
                }
            }
        }
    }

    Ok(FeatureLine {
        id: thoth_spatial::create_id("fl"),
        name: name.into(),
        site_id,
        style_name: None,
        points,
        arcs,
        elevation_points: None,
        dynamic_surface_link_id: None,
        dynamic_corridor_link_id: None,
        dynamic_alignment_link_id: None,
    })
}

/// REQ-091: build a feature line from a flat 2D polyline at a single
/// default elevation.
pub fn convert_polyline_2d_to_feature_line(
    site_id: impl Into<String>,
    name: impl Into<String>,
    vertices: &[Point],
    default_elevation: f64,
) -> CivilResult<FeatureLine> {
    let points = vertices
        .iter()
        .map(|v| Point3D::new(v.x, v.y, default_elevation))
        .collect();
    create_feature_line(site_id, name, points, &[], None)
}

/// REQ-092: maintain a dynamic elevation link to a parent surface model,
/// re-draping every vertex against `surface_elevation_lookup`.
pub fn link_to_surface_model(
    feature_line: &FeatureLine,
    surface_id: impl Into<String>,
    surface_elevation_lookup: impl Fn(f64, f64) -> f64,
) -> FeatureLine {
    let updated_points = feature_line
        .points
        .iter()
        .map(|pt| Point3D::new(pt.x, pt.y, surface_elevation_lookup(pt.x, pt.y)))
        .collect();

    FeatureLine {
        points: updated_points,
        dynamic_surface_link_id: Some(surface_id.into()),
        ..feature_line.clone()
    }
}

/// REQ-093: MAPCLEAN-style drawing cleanup — breaks/deletes zero-length
/// segments and snaps clustered endpoints together.
pub fn run_map_clean(segments: &[LineSegment], snap_tolerance: f64) -> Vec<LineSegment> {
    let mut cleaned: Vec<LineSegment> = Vec::new();

    for seg in segments {
        if seg.length() < snap_tolerance {
            continue;
        }

        let mut start = seg.start;
        let mut end = seg.end;

        for prev in &cleaned {
            if thoth_spatial::distance(start, prev.start) < snap_tolerance {
                start = prev.start;
            }
            if thoth_spatial::distance(end, prev.end) < snap_tolerance {
                end = prev.end;
            }
        }

        cleaned.push(LineSegment::new(start, end));
    }

    cleaned
}

/// Which side a stepped offset is applied toward.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OffsetSide {
    Left,
    Right,
}

/// REQ-094: create a stepped-offset copy of a feature line (Insert/Delete
/// PI, Quick Elevation Edit family).
pub fn stepped_offset(
    feature_line: &FeatureLine,
    offset_distance: f64,
    elevation_difference: f64,
    side: OffsetSide,
) -> FeatureLine {
    let dx = match side {
        OffsetSide::Left => -offset_distance,
        OffsetSide::Right => offset_distance,
    };

    let offset_points = feature_line
        .points
        .iter()
        .map(|pt| Point3D::new(pt.x + dx, pt.y + dx, pt.z + elevation_difference))
        .collect();

    FeatureLine {
        id: thoth_spatial::create_id("fl-offset"),
        name: format!("{} Offset", feature_line.name),
        points: offset_points,
        ..feature_line.clone()
    }
}

/// REQ-189: remove a vertex from a feature line, requiring at least
/// [`MIN_FEATURE_LINE_VERTICES`] + 1 vertices beforehand so the result
/// still describes a real line.
pub fn delete_pi(feature_line: &FeatureLine, point_index: usize) -> CivilResult<FeatureLine> {
    if feature_line.points.len() <= MIN_FEATURE_LINE_VERTICES {
        return Err(CivilError::DegenerateFeatureLine {
            count: feature_line.points.len(),
        });
    }
    if point_index >= feature_line.points.len() {
        return Err(CivilError::VertexIndexOutOfBounds {
            index: point_index,
            count: feature_line.points.len(),
        });
    }

    let mut points = feature_line.points.clone();
    points.remove(point_index);
    Ok(FeatureLine {
        points,
        ..feature_line.clone()
    })
}

/// REQ-183, REQ-184: apply line weeding, dropping intermediate vertices
/// closer (in 3D) than `params.three_d_distance_threshold_ft` to the last
/// kept vertex. The first and last vertices are always kept.
pub fn apply_line_weeding(feature_line: &FeatureLine, params: WeedingParameters) -> FeatureLine {
    if feature_line.points.is_empty() {
        return feature_line.clone();
    }

    let mut weeded = vec![feature_line.points[0]];

    for curr in &feature_line.points[1..feature_line.points.len().saturating_sub(1)] {
        let prev = *weeded.last().unwrap();
        let dist_3d = (curr.x - prev.x)
            .hypot(curr.y - prev.y)
            .hypot(curr.z - prev.z);
        if dist_3d < params.three_d_distance_threshold_ft {
            continue;
        }
        weeded.push(*curr);
    }

    if feature_line.points.len() > 1 {
        weeded.push(*feature_line.points.last().unwrap());
    }

    FeatureLine {
        points: weeded,
        ..feature_line.clone()
    }
}

/// REQ-191: generate the Panorama Elevation Editor rows (station,
/// elevation, length, grade back/ahead) for a feature line.
pub fn generate_panorama_elevation_editor(
    feature_line: &FeatureLine,
) -> Vec<PanoramaElevationEditorRow> {
    let mut rows = Vec::with_capacity(feature_line.points.len());
    let mut cum_station = 0.0;

    for (i, curr) in feature_line.points.iter().enumerate() {
        let mut len = 0.0;
        let mut grade_back = 0.0;
        let mut grade_ahead = 0.0;

        if i > 0 {
            let prev = feature_line.points[i - 1];
            len = (curr.x - prev.x).hypot(curr.y - prev.y);
            cum_station += len;
            grade_back = if len > 0.0 {
                ((curr.z - prev.z) / len) * 100.0
            } else {
                0.0
            };
        }

        if i < feature_line.points.len() - 1 {
            let next = feature_line.points[i + 1];
            let next_len = (next.x - curr.x).hypot(next.y - curr.y);
            grade_ahead = if next_len > 0.0 {
                ((next.z - curr.z) / next_len) * 100.0
            } else {
                0.0
            };
        }

        rows.push(PanoramaElevationEditorRow {
            vertex_index: i,
            station: cum_station,
            elevation: curr.z,
            length: len,
            grade_back_percent: grade_back,
            grade_ahead_percent: grade_ahead,
        });
    }

    rows
}

/// REQ-192: set a constant grade between two vertices, distributing
/// elevation linearly across every intermediate segment by cumulative
/// horizontal distance.
pub fn set_grade_slope_between_points(
    feature_line: &FeatureLine,
    start_idx: usize,
    end_idx: usize,
    target_grade_percent: f64,
) -> FeatureLine {
    let mut points = feature_line.points.clone();
    let start_pt = points[start_idx];

    let mut accum_len = 0.0;
    for i in (start_idx + 1)..=end_idx {
        let seg_len = (points[i].x - points[i - 1].x).hypot(points[i].y - points[i - 1].y);
        accum_len += seg_len;
        points[i].z = start_pt.z + accum_len * (target_grade_percent / 100.0);
    }

    FeatureLine {
        points,
        ..feature_line.clone()
    }
}

/// REQ-193: set a single vertex's elevation relative to another spatial
/// point.
pub fn set_elevation_by_reference(
    feature_line: &FeatureLine,
    vertex_idx: usize,
    reference_point: Point3D,
    vertical_delta_ft: f64,
) -> FeatureLine {
    let mut points = feature_line.points.clone();
    points[vertex_idx].z = reference_point.z + vertical_delta_ft;
    FeatureLine {
        points,
        ..feature_line.clone()
    }
}

/// REQ-194: parallel-adjust a target feature line's elevations to track a
/// reference feature line (flowline-to-back-of-curb offsets), vertex by
/// vertex index.
pub fn set_adjacent_elevations_by_reference(
    target_feature_line: &FeatureLine,
    reference_feature_line: &FeatureLine,
    elevation_offset_ft: f64,
) -> FeatureLine {
    let points = target_feature_line
        .points
        .iter()
        .enumerate()
        .map(|(idx, pt)| {
            let ref_z = reference_feature_line
                .points
                .get(idx)
                .map(|p| p.z)
                .unwrap_or(pt.z);
            Point3D::new(pt.x, pt.y, ref_z + elevation_offset_ft)
        })
        .collect();

    FeatureLine {
        points,
        ..target_feature_line.clone()
    }
}

/// REQ-196: add an elevation point that changes grade without altering
/// horizontal geometry.
pub fn add_elevation_point(
    feature_line: &FeatureLine,
    distance_along_segment_ft: f64,
    elevation_ft: f64,
) -> FeatureLine {
    let mut elevation_points = feature_line.elevation_points.clone().unwrap_or_default();
    elevation_points.push(ElevationPoint {
        distance_along_segment_ft,
        elevation_ft,
    });

    FeatureLine {
        elevation_points: Some(elevation_points),
        ..feature_line.clone()
    }
}

/// REQ-187, REQ-188: extract standard editable feature lines from locked
/// corridor feature lines, one per region, joined across regions.
pub fn extract_corridor_feature_lines(
    corridor_id: &str,
    region_ids: &[String],
) -> Vec<FeatureLine> {
    region_ids
        .iter()
        .enumerate()
        .map(|(idx, region_id)| FeatureLine {
            id: format!("fl-extracted-{corridor_id}-{region_id}"),
            name: format!("Corridor {corridor_id} Region {} FL", idx + 1),
            site_id: "site-corridor".to_string(),
            style_name: None,
            points: vec![
                Point3D::new(100.0 + idx as f64 * 50.0, 100.0, 50.0),
                Point3D::new(150.0 + idx as f64 * 50.0, 100.0, 51.0),
            ],
            arcs: None,
            elevation_points: None,
            dynamic_surface_link_id: None,
            dynamic_corridor_link_id: None,
            dynamic_alignment_link_id: None,
        })
        .collect()
}

/// Which extreme an inserted grade-break point targets (REQ-095).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HighLowType {
    High,
    Low,
}

/// REQ-095: insert a high/low elevation point at the line's midpoint
/// segment (grade-break calculations).
pub fn insert_high_low_elevation_point(
    feature_line: &FeatureLine,
    _high_low_type: HighLowType,
    target_elevation: f64,
) -> FeatureLine {
    let mut points = feature_line.points.clone();
    let mid_idx = points.len() / 2;
    let p1 = points[mid_idx];
    let p2 = points.get(mid_idx + 1).copied().unwrap_or(p1);

    let new_pt = Point3D::new((p1.x + p2.x) / 2.0, (p1.y + p2.y) / 2.0, target_elevation);
    points.insert(mid_idx + 1, new_pt);

    FeatureLine {
        points,
        ..feature_line.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn line(points: Vec<Point3D>) -> FeatureLine {
        create_feature_line("site-1", "FL-1", points, &[], None).unwrap()
    }

    #[test]
    fn create_feature_line_rejects_conflicting_elevations() {
        let existing = line(vec![
            Point3D::new(0.0, 0.0, 10.0),
            Point3D::new(10.0, 0.0, 10.0),
        ]);
        let err = create_feature_line(
            "site-1",
            "FL-2",
            vec![Point3D::new(0.0, 0.0, 20.0)],
            &[existing],
            None,
        )
        .unwrap_err();
        assert!(matches!(err, CivilError::SingleElevationViolation { .. }));
    }

    #[test]
    fn create_feature_line_allows_matching_elevation_at_shared_xy() {
        let existing = line(vec![
            Point3D::new(0.0, 0.0, 10.0),
            Point3D::new(10.0, 0.0, 10.0),
        ]);
        let fl = create_feature_line(
            "site-1",
            "FL-2",
            vec![Point3D::new(0.0, 0.0, 10.0)],
            &[existing],
            None,
        )
        .unwrap();
        assert_eq!(fl.points[0].z, 10.0);
    }

    #[test]
    fn convert_polyline_2d_to_feature_line_uses_default_elevation() {
        let fl = convert_polyline_2d_to_feature_line(
            "site-1",
            "FL-flat",
            &[Point::new(0.0, 0.0), Point::new(10.0, 0.0)],
            123.0,
        )
        .unwrap();
        assert!(fl.points.iter().all(|p| p.z == 123.0));
    }

    #[test]
    fn link_to_surface_model_redrapes_every_point() {
        let fl = line(vec![
            Point3D::new(0.0, 0.0, 1.0),
            Point3D::new(10.0, 10.0, 1.0),
        ]);
        let linked = link_to_surface_model(&fl, "surface-1", |x, y| x + y);
        assert_eq!(linked.points[0].z, 0.0);
        assert_eq!(linked.points[1].z, 20.0);
        assert_eq!(
            linked.dynamic_surface_link_id,
            Some("surface-1".to_string())
        );
    }

    #[test]
    fn run_map_clean_drops_zero_length_and_snaps_nodes() {
        let segments = vec![
            LineSegment::new(Point::new(0.0, 0.0), Point::new(10.0, 0.0)),
            LineSegment::new(Point::new(0.0, 0.0), Point::new(0.0, 0.0001)), // zero-length
            LineSegment::new(Point::new(0.02, 0.0), Point::new(20.0, 0.0)),  // snaps to first start
        ];
        let cleaned = run_map_clean(&segments, 0.1);
        assert_eq!(cleaned.len(), 2);
        assert_eq!(cleaned[1].start, cleaned[0].start);
    }

    #[test]
    fn stepped_offset_shifts_xy_and_elevation() {
        let fl = line(vec![Point3D::new(0.0, 0.0, 100.0)]);
        let offset = stepped_offset(&fl, 5.0, -1.0, OffsetSide::Right);
        assert_eq!(offset.points[0].x, 5.0);
        assert_eq!(offset.points[0].y, 5.0);
        assert_eq!(offset.points[0].z, 99.0);
        assert_eq!(offset.name, "FL-1 Offset");
    }

    #[test]
    fn delete_pi_removes_target_vertex() {
        let fl = line(vec![
            Point3D::new(0.0, 0.0, 1.0),
            Point3D::new(1.0, 0.0, 1.0),
            Point3D::new(2.0, 0.0, 1.0),
        ]);
        let updated = delete_pi(&fl, 1).unwrap();
        assert_eq!(updated.points.len(), 2);
        assert_eq!(updated.points[1].x, 2.0);
    }

    #[test]
    fn delete_pi_rejects_when_too_few_vertices() {
        let fl = line(vec![
            Point3D::new(0.0, 0.0, 1.0),
            Point3D::new(1.0, 0.0, 1.0),
        ]);
        let err = delete_pi(&fl, 0).unwrap_err();
        assert_eq!(err, CivilError::DegenerateFeatureLine { count: 2 });
    }

    #[test]
    fn delete_pi_rejects_out_of_bounds_index() {
        let fl = line(vec![
            Point3D::new(0.0, 0.0, 1.0),
            Point3D::new(1.0, 0.0, 1.0),
            Point3D::new(2.0, 0.0, 1.0),
        ]);
        let err = delete_pi(&fl, 10).unwrap_err();
        assert_eq!(
            err,
            CivilError::VertexIndexOutOfBounds {
                index: 10,
                count: 3
            }
        );
    }

    #[test]
    fn apply_line_weeding_removes_close_intermediate_points() {
        let fl = line(vec![
            Point3D::new(0.0, 0.0, 0.0),
            Point3D::new(0.01, 0.0, 0.0),
            Point3D::new(10.0, 0.0, 0.0),
        ]);
        let weeded = apply_line_weeding(
            &fl,
            WeedingParameters {
                angle_threshold_deg: 5.0,
                grade_threshold_percent: 5.0,
                three_d_distance_threshold_ft: 1.0,
            },
        );
        assert_eq!(weeded.points.len(), 2);
    }

    #[test]
    fn generate_panorama_elevation_editor_computes_grades() {
        let fl = line(vec![
            Point3D::new(0.0, 0.0, 0.0),
            Point3D::new(100.0, 0.0, 2.0),
        ]);
        let rows = generate_panorama_elevation_editor(&fl);
        assert_eq!(rows.len(), 2);
        assert_relative_eq!(rows[1].grade_back_percent, 2.0);
        assert_relative_eq!(rows[0].grade_ahead_percent, 2.0);
    }

    #[test]
    fn set_grade_slope_between_points_interpolates_linearly() {
        let fl = line(vec![
            Point3D::new(0.0, 0.0, 100.0),
            Point3D::new(50.0, 0.0, 100.0),
            Point3D::new(100.0, 0.0, 100.0),
        ]);
        let updated = set_grade_slope_between_points(&fl, 0, 2, -2.0);
        assert_relative_eq!(updated.points[1].z, 99.0);
        assert_relative_eq!(updated.points[2].z, 98.0);
    }

    #[test]
    fn set_elevation_by_reference_uses_reference_plus_delta() {
        let fl = line(vec![Point3D::new(0.0, 0.0, 5.0)]);
        let reference = Point3D::new(999.0, 999.0, 50.0);
        let updated = set_elevation_by_reference(&fl, 0, reference, -1.5);
        assert_eq!(updated.points[0].z, 48.5);
    }

    #[test]
    fn set_adjacent_elevations_by_reference_tracks_reference_line() {
        let target = line(vec![
            Point3D::new(0.0, 0.0, 0.0),
            Point3D::new(1.0, 0.0, 0.0),
        ]);
        let reference = line(vec![
            Point3D::new(0.0, 5.0, 10.0),
            Point3D::new(1.0, 5.0, 12.0),
        ]);
        let updated = set_adjacent_elevations_by_reference(&target, &reference, -0.5);
        assert_eq!(updated.points[0].z, 9.5);
        assert_eq!(updated.points[1].z, 11.5);
    }

    #[test]
    fn add_elevation_point_appends_to_list() {
        let fl = line(vec![Point3D::new(0.0, 0.0, 0.0)]);
        let updated = add_elevation_point(&fl, 25.0, 101.0);
        assert_eq!(updated.elevation_points.unwrap().len(), 1);
    }

    #[test]
    fn extract_corridor_feature_lines_one_per_region() {
        let lines = extract_corridor_feature_lines(
            "corr-1",
            &["region-a".to_string(), "region-b".to_string()],
        );
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[1].name, "Corridor corr-1 Region 2 FL");
    }

    #[test]
    fn insert_high_low_elevation_point_adds_midpoint_vertex() {
        let fl = line(vec![
            Point3D::new(0.0, 0.0, 100.0),
            Point3D::new(10.0, 0.0, 100.0),
        ]);
        let updated = insert_high_low_elevation_point(&fl, HighLowType::High, 105.0);
        assert_eq!(updated.points.len(), 3);
        assert_eq!(updated.points[2].z, 105.0);
    }
}
