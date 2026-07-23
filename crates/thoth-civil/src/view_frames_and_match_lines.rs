//! Plan Production view frames & match lines — REQ-056 through REQ-070,
//! REQ-143 through REQ-145.
//!
//! Port of `packages/domain/src/civil/viewFramesAndMatchLines.ts` +
//! its inline types. The TS source imports `Point2D`/`LineSegment` from
//! `packages/domain/src/survey/transparentCommands`; here those are
//! `thoth_spatial::Point` and [`crate::common::LineSegment`] (see that
//! module's doc comment). `CivilDomainError` is replaced by
//! [`crate::error::CivilError`].
//!
//! **Adapted**: the TS `createViewFrameGroup` default-parameterizes
//! `stationIncrementRounding`, `overlapDistanceFt`, and `alignmentPoints`.
//! Rust has no default-parameter sugar, so those become required arguments;
//! [`DEFAULT_STATION_INCREMENT_ROUNDING_FT`] and
//! [`DEFAULT_OVERLAP_DISTANCE_FT`] are exposed as named constants callers can
//! pass explicitly, matching the convention already used elsewhere in this
//! crate (e.g. `sections::DEFAULT_SWATH_WIDTH`).

use thoth_spatial::Point;

use crate::common::LineSegment;
use crate::error::{CivilError, CivilResult};

/// Default station rounding increment for match-line labels (REQ-064).
pub const DEFAULT_STATION_INCREMENT_ROUNDING_FT: f64 = 50.0;

/// Default overlap distance between adjacent view frames.
pub const DEFAULT_OVERLAP_DISTANCE_FT: f64 = 50.0;

/// A sheet layout's plan/profile viewport arrangement.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SheetConfiguration {
    PlanOnly,
    ProfileOnly,
    PlanOverPlan,
    ProfileOverProfile,
    PlanAndProfile,
}

/// Whether a view frame's rotation follows the alignment tangent or stays
/// fixed to true north.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViewFrameOrientation {
    AlongAlignment,
    TrueNorth,
}

/// Where a match line's station label sits relative to the frame.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchLineLabelPosition {
    Top,
    Middle,
    End,
}

/// A plot viewport's physical dimensions and print scale.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ViewportDimensions {
    pub width_ft: f64,
    pub height_ft: f64,
    /// e.g. `40.0` for a 1"=40' scale.
    pub scale_factor: f64,
    pub aspect_ratio: f64,
}

/// A match line drawn where two adjacent view frames meet.
#[derive(Debug, Clone, PartialEq)]
pub struct PlanProductionMatchLine {
    pub id: String,
    pub station: f64,
    pub rounded_station: f64,
    pub intersection_point: Point,
    pub segment: LineSegment,
    pub left_label: String,
    pub right_label: String,
    pub label_position: MatchLineLabelPosition,
    pub mask_hatch_true_color: String,
    pub mask_linetype: Option<String>,
    pub mask_color: Option<String>,
    pub mask_lineweight: Option<f64>,
}

/// A single sheet-scale view window along an alignment.
#[derive(Debug, Clone, PartialEq)]
pub struct PlanProductionViewFrame {
    pub id: String,
    pub name: String,
    pub station_start: f64,
    pub station_end: f64,
    pub center: Point,
    pub width: f64,
    pub height: f64,
    pub rotation_deg: f64,
    pub orientation: ViewFrameOrientation,
    pub aspect_ratio: f64,
    pub layer: Option<String>,
}

/// A complete set of view frames and match lines generated along one
/// alignment.
#[derive(Debug, Clone, PartialEq)]
pub struct PlanProductionViewFrameGroup {
    pub id: String,
    pub name: String,
    pub alignment_id: String,
    pub sheet_config: SheetConfiguration,
    pub view_frames: Vec<PlanProductionViewFrame>,
    pub match_lines: Vec<PlanProductionMatchLine>,
    pub station_increment_rounding: f64,
    pub overlap_distance_ft: f64,
    pub start_offset_distance_ft: Option<f64>,
    /// REQ-144: view frame groups always move as one rigid unit.
    pub is_unified_move_locked: bool,
}

fn validate_wizard_params(
    station_start: f64,
    station_end: f64,
    viewport: ViewportDimensions,
    station_increment_rounding: f64,
) -> CivilResult<()> {
    if station_start >= station_end {
        return Err(CivilError::InvalidStationRange {
            start: station_start,
            end: station_end,
        });
    }
    if viewport.width_ft <= 0.0 || viewport.height_ft <= 0.0 || viewport.scale_factor <= 0.0 {
        return Err(CivilError::InvalidViewportDimensions {
            width_ft: viewport.width_ft,
            height_ft: viewport.height_ft,
            scale_factor: viewport.scale_factor,
        });
    }
    if station_increment_rounding <= 0.0 {
        return Err(CivilError::NonPositiveInterval {
            value: station_increment_rounding,
        });
    }
    Ok(())
}

/// REQ-056, REQ-057, REQ-058, REQ-059, REQ-060, REQ-061, REQ-064, REQ-065,
/// REQ-070, REQ-063, REQ-144: parametrically build a view frame group with
/// match lines along an alignment vector.
///
/// `alignment_points` must have at least one point; the first and last
/// points define the alignment's overall tangent direction (matching the
/// TS source's own use of only the first/last of its default two-point
/// array).
#[allow(clippy::too_many_arguments)]
pub fn create_view_frame_group(
    name: impl Into<String>,
    alignment_id: impl Into<String>,
    sheet_config: SheetConfiguration,
    viewport: ViewportDimensions,
    station_start: f64,
    station_end: f64,
    orientation: ViewFrameOrientation,
    station_increment_rounding: f64,
    overlap_distance_ft: f64,
    alignment_points: &[Point],
) -> CivilResult<PlanProductionViewFrameGroup> {
    validate_wizard_params(
        station_start,
        station_end,
        viewport,
        station_increment_rounding,
    )?;

    let total_length = station_end - station_start;
    let view_frame_width = viewport.width_ft * viewport.scale_factor;
    let view_frame_height = viewport.height_ft * viewport.scale_factor;
    let effective_step = (view_frame_width - overlap_distance_ft).max(10.0);

    let frame_count = ((total_length / effective_step).ceil() as i64).max(1);

    let start_pt = alignment_points.first().copied().unwrap_or(Point::ZERO);
    let end_pt = alignment_points
        .last()
        .copied()
        .unwrap_or(Point::new(1000.0, 500.0));
    let dx = end_pt.x - start_pt.x;
    let dy = end_pt.y - start_pt.y;
    let total_dist = {
        let d = dx.hypot(dy);
        if d == 0.0 {
            1.0
        } else {
            d
        }
    };
    let ux = dx / total_dist;
    let uy = dy / total_dist;
    let tangent_angle_deg = dx.atan2(dy).to_degrees();

    let mut current_station = station_start;
    let mut view_frames = Vec::with_capacity(frame_count as usize);
    let mut match_lines = Vec::new();

    for i in 0..frame_count {
        let start = current_station;
        let end = (station_start + total_length).min(current_station + view_frame_width);
        let center_station = (start + end) / 2.0;

        let center_pt = Point::new(
            start_pt.x + ux * center_station,
            start_pt.y + uy * center_station,
        );

        let rotation_deg = match orientation {
            ViewFrameOrientation::TrueNorth => 0.0,
            ViewFrameOrientation::AlongAlignment => tangent_angle_deg,
        };

        view_frames.push(PlanProductionViewFrame {
            id: format!("vf-{}", i + 1),
            name: format!("View Frame - {}", i + 1),
            station_start: start,
            station_end: end,
            center: center_pt,
            width: view_frame_width,
            height: view_frame_height,
            rotation_deg,
            orientation,
            aspect_ratio: viewport.aspect_ratio,
            layer: None,
        });

        // REQ-063: automatic match lines where adjacent view frames intersect.
        if i > 0 {
            let raw_station = start;
            let rounded_station =
                (raw_station / station_increment_rounding).floor() * station_increment_rounding;

            let match_pt = Point::new(start_pt.x + ux * raw_station, start_pt.y + uy * raw_station);

            let perp_x = -uy * 100.0;
            let perp_y = ux * 100.0;

            let match_seg = LineSegment::new(
                Point::new(match_pt.x - perp_x, match_pt.y - perp_y),
                Point::new(match_pt.x + perp_x, match_pt.y + perp_y),
            );

            match_lines.push(PlanProductionMatchLine {
                id: format!("ml-{i}"),
                station: raw_station,
                rounded_station,
                intersection_point: match_pt,
                segment: match_seg,
                left_label: format!("MATCH LINE STA {rounded_station}+00 (SEE SHEET C-10{i})"),
                right_label: format!(
                    "MATCH LINE STA {rounded_station}+00 (SEE SHEET C-10{})",
                    i + 1
                ),
                label_position: MatchLineLabelPosition::Middle,
                mask_hatch_true_color: "255,255,255".to_string(),
                mask_linetype: None,
                mask_color: None,
                mask_lineweight: None,
            });
        }

        current_station += effective_step;
    }

    Ok(PlanProductionViewFrameGroup {
        id: thoth_spatial::create_id("vfg"),
        name: name.into(),
        alignment_id: alignment_id.into(),
        sheet_config,
        view_frames,
        match_lines,
        station_increment_rounding,
        overlap_distance_ft,
        start_offset_distance_ft: None,
        is_unified_move_locked: true,
    })
}

/// Summary of a cascading view-frame-group deletion (REQ-143).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CascadingDeleteResult {
    pub deleted_view_frames_count: usize,
    pub deleted_match_lines_count: usize,
    pub is_deleted: bool,
}

/// REQ-143: delete all associated view frames, match lines, and labels when
/// a view frame group is deleted.
pub fn delete_view_frame_group_cascading(
    group: &PlanProductionViewFrameGroup,
) -> CascadingDeleteResult {
    CascadingDeleteResult {
        deleted_view_frames_count: group.view_frames.len(),
        deleted_match_lines_count: group.match_lines.len(),
        is_deleted: true,
    }
}

/// REQ-145: insert a newly defined view frame into a previously
/// established view frame group, keeping the group's frames station-sorted.
pub fn insert_view_frame_into_group(
    group: &PlanProductionViewFrameGroup,
    station_start: f64,
    station_end: f64,
    center: Point,
) -> CivilResult<PlanProductionViewFrameGroup> {
    if station_start >= station_end {
        return Err(CivilError::InvalidStationRange {
            start: station_start,
            end: station_end,
        });
    }

    let new_frame_num = group.view_frames.len() + 1;
    let new_frame = PlanProductionViewFrame {
        id: format!("vf-inserted-{new_frame_num}"),
        name: format!("View Frame - {new_frame_num}"),
        station_start,
        station_end,
        center,
        width: 800.0,
        height: 600.0,
        rotation_deg: 0.0,
        orientation: ViewFrameOrientation::AlongAlignment,
        aspect_ratio: 1.33,
        layer: Some("C-PLAN-VFRM".to_string()),
    };

    let mut updated_frames = group.view_frames.clone();
    updated_frames.push(new_frame);
    updated_frames.sort_by(|a, b| {
        a.station_start
            .partial_cmp(&b.station_start)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(PlanProductionViewFrameGroup {
        view_frames: updated_frames,
        ..group.clone()
    })
}

/// The kind of interactive edit grip a view frame supports (REQ-062).
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ViewFrameGrip {
    Center(Point),
    /// Move the frame's start station, keeping its length constant.
    Slider(f64),
    Rotation(f64),
}

/// REQ-062: edit a view frame's position/rotation via its center, slider,
/// or rotation grip.
pub fn modify_view_frame_grip(
    group: &PlanProductionViewFrameGroup,
    frame_id: &str,
    grip: ViewFrameGrip,
) -> PlanProductionViewFrameGroup {
    let updated_frames = group
        .view_frames
        .iter()
        .map(|f| {
            if f.id != frame_id {
                return f.clone();
            }
            match grip {
                ViewFrameGrip::Center(new_center) => PlanProductionViewFrame {
                    center: new_center,
                    ..f.clone()
                },
                ViewFrameGrip::Slider(new_start) => {
                    let delta = new_start - f.station_start;
                    PlanProductionViewFrame {
                        station_start: new_start,
                        station_end: f.station_end + delta,
                        ..f.clone()
                    }
                }
                ViewFrameGrip::Rotation(new_rotation) => PlanProductionViewFrame {
                    rotation_deg: new_rotation,
                    ..f.clone()
                },
            }
        })
        .collect();

    PlanProductionViewFrameGroup {
        view_frames: updated_frames,
        ..group.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn viewport() -> ViewportDimensions {
        ViewportDimensions {
            width_ft: 20.0,
            height_ft: 15.0,
            scale_factor: 40.0,
            aspect_ratio: 1.33,
        }
    }

    fn default_alignment_points() -> Vec<Point> {
        vec![Point::new(0.0, 0.0), Point::new(1000.0, 500.0)]
    }

    #[test]
    fn create_view_frame_group_produces_frames_and_match_lines() {
        let group = create_view_frame_group(
            "Corridor VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            viewport(),
            0.0,
            2000.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap();

        assert!(group.view_frames.len() > 1);
        assert_eq!(group.match_lines.len(), group.view_frames.len() - 1);
        assert!(group.is_unified_move_locked);
        assert_eq!(group.view_frames[0].station_start, 0.0);
    }

    #[test]
    fn create_view_frame_group_rejects_backwards_station_range() {
        let err = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            viewport(),
            500.0,
            100.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap_err();
        assert_eq!(
            err,
            CivilError::InvalidStationRange {
                start: 500.0,
                end: 100.0
            }
        );
    }

    #[test]
    fn create_view_frame_group_rejects_non_positive_viewport() {
        let bad_viewport = ViewportDimensions {
            width_ft: 0.0,
            height_ft: 15.0,
            scale_factor: 40.0,
            aspect_ratio: 1.33,
        };
        let err = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            bad_viewport,
            0.0,
            1000.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap_err();
        assert!(matches!(err, CivilError::InvalidViewportDimensions { .. }));
    }

    #[test]
    fn create_view_frame_group_true_north_orientation_has_zero_rotation() {
        let group = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            viewport(),
            0.0,
            500.0,
            ViewFrameOrientation::TrueNorth,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap();
        for frame in &group.view_frames {
            assert_relative_eq!(frame.rotation_deg, 0.0);
        }
    }

    #[test]
    fn delete_view_frame_group_cascading_reports_counts() {
        let group = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            viewport(),
            0.0,
            2000.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap();
        let result = delete_view_frame_group_cascading(&group);
        assert_eq!(result.deleted_view_frames_count, group.view_frames.len());
        assert_eq!(result.deleted_match_lines_count, group.match_lines.len());
        assert!(result.is_deleted);
    }

    #[test]
    fn insert_view_frame_into_group_keeps_station_order() {
        let group = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            viewport(),
            0.0,
            500.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap();

        let updated =
            insert_view_frame_into_group(&group, -100.0, -10.0, Point::new(0.0, 0.0)).unwrap();

        assert_eq!(updated.view_frames.len(), group.view_frames.len() + 1);
        assert_eq!(updated.view_frames[0].station_start, -100.0);
    }

    #[test]
    fn insert_view_frame_into_group_rejects_backwards_range() {
        let group = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            viewport(),
            0.0,
            500.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap();
        let err = insert_view_frame_into_group(&group, 100.0, 50.0, Point::ZERO).unwrap_err();
        assert!(matches!(err, CivilError::InvalidStationRange { .. }));
    }

    #[test]
    fn modify_view_frame_grip_center_updates_only_target_frame() {
        let group = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            viewport(),
            0.0,
            500.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap();
        let frame_id = group.view_frames[0].id.clone();
        let new_center = Point::new(42.0, 42.0);

        let updated = modify_view_frame_grip(&group, &frame_id, ViewFrameGrip::Center(new_center));

        assert_eq!(updated.view_frames[0].center, new_center);
    }

    #[test]
    fn modify_view_frame_grip_slider_shifts_both_stations() {
        let group = create_view_frame_group(
            "VFG",
            "align-1",
            SheetConfiguration::PlanOnly,
            viewport(),
            0.0,
            500.0,
            ViewFrameOrientation::AlongAlignment,
            DEFAULT_STATION_INCREMENT_ROUNDING_FT,
            DEFAULT_OVERLAP_DISTANCE_FT,
            &default_alignment_points(),
        )
        .unwrap();
        let frame_id = group.view_frames[0].id.clone();
        let original_len = group.view_frames[0].station_end - group.view_frames[0].station_start;

        let updated = modify_view_frame_grip(&group, &frame_id, ViewFrameGrip::Slider(50.0));

        assert_eq!(updated.view_frames[0].station_start, 50.0);
        assert_relative_eq!(
            updated.view_frames[0].station_end - updated.view_frames[0].station_start,
            original_len
        );
    }
}
