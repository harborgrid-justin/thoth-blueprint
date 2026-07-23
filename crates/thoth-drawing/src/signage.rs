//! Pavement-marking and signage plan symbol placement (competitive
//! gap-analysis Theme 5, item 56).
//!
//! Given a road centerline (a polyline of plan points, however it was
//! produced — this crate doesn't depend on `thoth-civil`'s alignment
//! resolver, so it accepts the resolved geometry directly) and a small set
//! of standard MUTCD marking/sign types, this places pavement-marking dash
//! segments and traffic-control-sign symbols along it by simple, documented
//! rules — station intervals and standard dash/gap lengths — rather than a
//! full traffic-engineering placement optimization (sight-distance-based
//! sign placement, warrant analysis, etc. — see gap items 14/25/56 in
//! `docs/COMPETITIVE_GAP_ANALYSIS.md` for what a fuller implementation would
//! add).
//!
//! MUTCD ("Manual on Uniform Traffic Control Devices") reference: broken
//! (skip) centerline/lane lines use a standard 10 ft line / 30 ft gap
//! pattern (MUTCD Section 3A.06); sign codes cited below (R1-1, R2-1) are
//! the MUTCD "Code" designators for STOP and Speed Limit signs
//! respectively.

use thoth_spatial::{distance, Point};

use crate::error::DrawingError;
use crate::scene::{Pt, SheetPrimitive, TextAnchor, INK};

/// Standard MUTCD broken-line dash/gap length, in plan units (feet):
/// 10 ft line, 30 ft gap (MUTCD Section 3A.06).
pub const MUTCD_BROKEN_LINE_DASH_FT: f64 = 10.0;
pub const MUTCD_BROKEN_LINE_GAP_FT: f64 = 30.0;

/// A pavement-marking type this module can place.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PavementMarkingKind {
    /// A single broken (skip) line, e.g. a lane line or two-way-passing
    /// centerline dash.
    BrokenLine,
    /// A continuous (solid) line, e.g. a no-passing centerline or edge line.
    SolidLine,
}

/// One placed dash segment of a pavement-marking pattern.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PlacedMarking {
    pub kind: PavementMarkingKind,
    pub station_start: f64,
    pub station_end: f64,
    pub from: Point,
    pub to: Point,
}

/// A MUTCD sign type this module can place (a small representative subset,
/// not the full MUTCD sign catalog).
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SignKind {
    /// MUTCD R1-1 "STOP".
    Stop,
    /// MUTCD R2-1 "Speed Limit".
    SpeedLimit,
}

impl SignKind {
    /// The MUTCD "Code" designator for this sign.
    pub const fn mutcd_code(self) -> &'static str {
        match self {
            SignKind::Stop => "R1-1",
            SignKind::SpeedLimit => "R2-1",
        }
    }
}

/// One placed sign.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PlacedSign {
    pub kind: SignKind,
    pub station: f64,
    /// Lateral offset from centerline, plan units. Positive = right of the
    /// direction of travel (US driving convention).
    pub offset: f64,
    pub at: Point,
    /// Heading of travel at this station, degrees, compass convention
    /// (0 = north, 90 = east), for orienting the sign symbol/label.
    pub heading_deg: f64,
    /// Free-text sign legend, e.g. `"STOP"` or `"SPEED LIMIT 25"`.
    pub legend: String,
}

/// Interpolate a point and travel heading along a polyline centerline at
/// arc-length `station` (0 at the first vertex). Stations beyond the
/// polyline's length clamp to the last vertex/heading.
///
/// # Errors
/// [`DrawingError::DegenerateCenterline`] if `centerline` has fewer than 2
/// vertices.
pub fn point_at_station(centerline: &[Point], station: f64) -> Result<(Point, f64), DrawingError> {
    if centerline.len() < 2 {
        return Err(DrawingError::DegenerateCenterline(centerline.len()));
    }
    let mut remaining = station.max(0.0);
    for pair in centerline.windows(2) {
        let (a, b) = (pair[0], pair[1]);
        let seg_len = distance(a, b);
        if seg_len <= 1e-12 {
            continue;
        }
        if remaining <= seg_len {
            let t = remaining / seg_len;
            let p = Point::new(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
            let heading = heading_deg(a, b);
            return Ok((p, heading));
        }
        remaining -= seg_len;
    }
    // Beyond the polyline's end: clamp to the last segment's endpoint/heading.
    let n = centerline.len();
    let (a, b) = (centerline[n - 2], centerline[n - 1]);
    Ok((b, heading_deg(a, b)))
}

fn heading_deg(a: Point, b: Point) -> f64 {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    // Compass bearing: 0 = north (+y), 90 = east (+x).
    (dx.atan2(dy).to_degrees() + 360.0) % 360.0
}

fn total_length(centerline: &[Point]) -> f64 {
    centerline
        .windows(2)
        .map(|pair| distance(pair[0], pair[1]))
        .sum()
}

/// Place a broken-line (dashed) pavement marking along the full length of
/// `centerline`, using `dash_length`/`gap_length` (defaulting to the MUTCD
/// standard 10 ft/30 ft pattern via [`MUTCD_BROKEN_LINE_DASH_FT`]/
/// [`MUTCD_BROKEN_LINE_GAP_FT`] when the caller has no project-specific
/// override).
///
/// # Errors
/// - [`DrawingError::DegenerateCenterline`] if `centerline` has fewer than 2
///   vertices.
/// - [`DrawingError::InvalidSignagePlanParameter`] if `dash_length` or
///   `gap_length` is non-positive or non-finite.
pub fn place_broken_line_marking(
    centerline: &[Point],
    dash_length: f64,
    gap_length: f64,
) -> Result<Vec<PlacedMarking>, DrawingError> {
    if centerline.len() < 2 {
        return Err(DrawingError::DegenerateCenterline(centerline.len()));
    }
    if !dash_length.is_finite() || dash_length <= 0.0 {
        return Err(DrawingError::InvalidSignagePlanParameter {
            name: "dash_length",
            value: dash_length,
        });
    }
    if !gap_length.is_finite() || gap_length <= 0.0 {
        return Err(DrawingError::InvalidSignagePlanParameter {
            name: "gap_length",
            value: gap_length,
        });
    }

    let total = total_length(centerline);
    let period = dash_length + gap_length;
    let mut markings = Vec::new();
    let mut station = 0.0;
    while station < total {
        let dash_end = (station + dash_length).min(total);
        let (from, _) = point_at_station(centerline, station)?;
        let (to, _) = point_at_station(centerline, dash_end)?;
        markings.push(PlacedMarking {
            kind: PavementMarkingKind::BrokenLine,
            station_start: station,
            station_end: dash_end,
            from,
            to,
        });
        station += period;
    }
    Ok(markings)
}

/// Place a single continuous (solid) line marking spanning the entire
/// centerline (e.g. a no-passing zone or edge line).
///
/// # Errors
/// [`DrawingError::DegenerateCenterline`] if `centerline` has fewer than 2
/// vertices.
pub fn place_solid_line_marking(centerline: &[Point]) -> Result<PlacedMarking, DrawingError> {
    if centerline.len() < 2 {
        return Err(DrawingError::DegenerateCenterline(centerline.len()));
    }
    let total = total_length(centerline);
    Ok(PlacedMarking {
        kind: PavementMarkingKind::SolidLine,
        station_start: 0.0,
        station_end: total,
        from: centerline[0],
        to: centerline[centerline.len() - 1],
    })
}

/// Rule-based options for [`generate_signage_plan`].
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SignagePlanOptions {
    /// Posted speed limit, mph — used for the repeater sign legend.
    pub speed_limit_mph: u32,
    /// Station interval between speed-limit repeater signs. Must be
    /// positive and finite.
    pub speed_sign_spacing: f64,
    /// Lateral offset from centerline at which signs are placed (positive =
    /// right of travel). Must be finite.
    pub sign_offset: f64,
    /// Whether to place a STOP sign at the start of the centerline.
    pub stop_at_start: bool,
    /// Whether to place a STOP sign at the end of the centerline.
    pub stop_at_end: bool,
}

/// Place STOP and speed-limit-repeater signs along a centerline by simple
/// station-interval rules (not a sight-distance or warrant-based
/// optimization — see the module rustdoc).
///
/// # Errors
/// - [`DrawingError::DegenerateCenterline`] if `centerline` has fewer than 2
///   vertices.
/// - [`DrawingError::InvalidSignagePlanParameter`] if
///   `options.speed_sign_spacing` is non-positive/non-finite, or
///   `options.sign_offset` is non-finite.
pub fn generate_signage_plan(
    centerline: &[Point],
    options: &SignagePlanOptions,
) -> Result<Vec<PlacedSign>, DrawingError> {
    if centerline.len() < 2 {
        return Err(DrawingError::DegenerateCenterline(centerline.len()));
    }
    if !options.speed_sign_spacing.is_finite() || options.speed_sign_spacing <= 0.0 {
        return Err(DrawingError::InvalidSignagePlanParameter {
            name: "speed_sign_spacing",
            value: options.speed_sign_spacing,
        });
    }
    if !options.sign_offset.is_finite() {
        return Err(DrawingError::InvalidSignagePlanParameter {
            name: "sign_offset",
            value: options.sign_offset,
        });
    }

    let total = total_length(centerline);
    let mut signs = Vec::new();

    let mut place = |station: f64, kind: SignKind, legend: String| -> Result<(), DrawingError> {
        let (center, heading) = point_at_station(centerline, station)?;
        let at = offset_point(center, heading, options.sign_offset);
        signs.push(PlacedSign {
            kind,
            station,
            offset: options.sign_offset,
            at,
            heading_deg: heading,
            legend,
        });
        Ok(())
    };

    if options.stop_at_start {
        place(0.0, SignKind::Stop, "STOP".to_string())?;
    }
    if options.stop_at_end {
        place(total, SignKind::Stop, "STOP".to_string())?;
    }

    let mut station = options.speed_sign_spacing;
    while station < total {
        place(
            station,
            SignKind::SpeedLimit,
            format!("SPEED LIMIT {}", options.speed_limit_mph),
        )?;
        station += options.speed_sign_spacing;
    }

    Ok(signs)
}

/// Offset a point laterally from a compass heading (positive = to the
/// right of the direction of travel, matching US roadside sign placement).
fn offset_point(center: Point, heading_deg: f64, offset: f64) -> Point {
    let heading_rad = heading_deg.to_radians();
    // Direction of travel as a unit vector: (sin, cos) in (east, north).
    let (dx, dy) = (heading_rad.sin(), heading_rad.cos());
    // Right-hand normal of the travel direction.
    let (nx, ny) = (dy, -dx);
    Point::new(center.x + nx * offset, center.y + ny * offset)
}

/// Render placed markings/signs as plan-view [`SheetPrimitive`]s, projected
/// into sheet space through `project` (typically
/// [`crate::builders::Projector::project`]).
pub fn signage_plan_primitives(
    markings: &[PlacedMarking],
    signs: &[PlacedSign],
    project: impl Fn(Point) -> Pt,
) -> Vec<SheetPrimitive> {
    let mut out = Vec::new();
    for m in markings {
        out.push(SheetPrimitive::Line {
            a: project(m.from),
            b: project(m.to),
            w: Some(match m.kind {
                PavementMarkingKind::BrokenLine => 0.6,
                PavementMarkingKind::SolidLine => 0.9,
            }),
            color: Some("#facc15".to_string()),
            dash: None,
        });
    }
    for s in signs {
        let at = project(s.at);
        let (r, sides): (f64, usize) = match s.kind {
            SignKind::Stop => (6.0, 8),
            SignKind::SpeedLimit => (7.0, 4),
        };
        let pts: Vec<Pt> = (0..sides)
            .map(|i| {
                let a =
                    std::f64::consts::FRAC_PI_2 + std::f64::consts::TAU * i as f64 / sides as f64;
                Pt::new(at.x + r * a.cos(), at.y - r * a.sin())
            })
            .collect();
        out.push(SheetPrimitive::Polygon {
            pts,
            w: Some(0.6),
            stroke: Some(INK.to_string()),
            fill: Some(if matches!(s.kind, SignKind::Stop) {
                "#dc2626".to_string()
            } else {
                "#ffffff".to_string()
            }),
            fill_opacity: None,
            dash: None,
        });
        out.push(SheetPrimitive::Text {
            at: Pt::new(at.x, at.y + r + 8.0),
            text: format!("{} ({})", s.legend, s.kind.mutcd_code()),
            size: 5.0,
            color: Some(INK.to_string()),
            anchor: Some(TextAnchor::Middle),
            weight: None,
            angle: None,
            monospace: None,
        });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn straight_centerline(length: f64) -> Vec<Point> {
        vec![Point::new(0.0, 0.0), Point::new(0.0, length)]
    }

    #[test]
    fn point_at_station_interpolates_along_a_straight_line() {
        let line = straight_centerline(100.0);
        let (p, heading) = point_at_station(&line, 25.0).unwrap();
        assert_relative_eq!(p.y, 25.0, epsilon = 1e-9);
        assert_relative_eq!(heading, 0.0, epsilon = 1e-9); // due north
    }

    #[test]
    fn point_at_station_clamps_beyond_the_end() {
        let line = straight_centerline(100.0);
        let (p, _) = point_at_station(&line, 500.0).unwrap();
        assert_relative_eq!(p.y, 100.0, epsilon = 1e-9);
    }

    #[test]
    fn point_at_station_rejects_a_degenerate_centerline() {
        let err = point_at_station(&[Point::new(0.0, 0.0)], 0.0).unwrap_err();
        assert_eq!(err, DrawingError::DegenerateCenterline(1));
    }

    #[test]
    fn place_broken_line_marking_produces_dashes_for_the_full_length() {
        let line = straight_centerline(140.0); // 140 / (10+30) = 3.5 periods
        let marks = place_broken_line_marking(&line, 10.0, 30.0).unwrap();
        // Dashes start at 0, 40, 80, 120 -> 4 dashes within 140 ft.
        assert_eq!(marks.len(), 4);
        assert_relative_eq!(marks[0].station_start, 0.0, epsilon = 1e-9);
        assert_relative_eq!(marks[0].station_end, 10.0, epsilon = 1e-9);
        assert_relative_eq!(marks[3].station_start, 120.0, epsilon = 1e-9);
    }

    #[test]
    fn place_broken_line_marking_rejects_non_positive_dash_length() {
        let line = straight_centerline(100.0);
        let err = place_broken_line_marking(&line, 0.0, 30.0).unwrap_err();
        assert!(matches!(
            err,
            DrawingError::InvalidSignagePlanParameter {
                name: "dash_length",
                ..
            }
        ));
    }

    #[test]
    fn place_solid_line_marking_spans_the_whole_centerline() {
        let line = straight_centerline(250.0);
        let marking = place_solid_line_marking(&line).unwrap();
        assert_relative_eq!(marking.station_end, 250.0, epsilon = 1e-9);
    }

    #[test]
    fn generate_signage_plan_places_stops_and_spaced_speed_signs() {
        let line = straight_centerline(1000.0);
        let options = SignagePlanOptions {
            speed_limit_mph: 25,
            speed_sign_spacing: 400.0,
            sign_offset: 10.0,
            stop_at_start: true,
            stop_at_end: true,
        };
        let signs = generate_signage_plan(&line, &options).unwrap();
        let stops = signs.iter().filter(|s| s.kind == SignKind::Stop).count();
        let speed_signs = signs
            .iter()
            .filter(|s| s.kind == SignKind::SpeedLimit)
            .count();
        assert_eq!(stops, 2);
        assert_eq!(speed_signs, 2); // at 400 and 800
        assert!(signs
            .iter()
            .all(|s| s.legend.contains("STOP") || s.legend.contains("25")));
    }

    #[test]
    fn generate_signage_plan_offsets_signs_to_the_right_of_a_northbound_centerline() {
        let line = straight_centerline(100.0);
        let options = SignagePlanOptions {
            speed_limit_mph: 25,
            speed_sign_spacing: 1000.0,
            sign_offset: 10.0,
            stop_at_start: true,
            stop_at_end: false,
        };
        let signs = generate_signage_plan(&line, &options).unwrap();
        // Heading north (0 deg): right-hand offset should be +x (east).
        assert!(signs[0].at.x > 0.0);
    }

    #[test]
    fn generate_signage_plan_rejects_non_positive_spacing() {
        let line = straight_centerline(100.0);
        let options = SignagePlanOptions {
            speed_limit_mph: 25,
            speed_sign_spacing: 0.0,
            sign_offset: 10.0,
            stop_at_start: false,
            stop_at_end: false,
        };
        let err = generate_signage_plan(&line, &options).unwrap_err();
        assert!(matches!(
            err,
            DrawingError::InvalidSignagePlanParameter {
                name: "speed_sign_spacing",
                ..
            }
        ));
    }

    #[test]
    fn signage_plan_primitives_emits_a_line_per_marking_and_two_prims_per_sign() {
        let line = straight_centerline(50.0);
        let markings = place_broken_line_marking(&line, 10.0, 30.0).unwrap();
        let options = SignagePlanOptions {
            speed_limit_mph: 25,
            speed_sign_spacing: 1000.0,
            sign_offset: 10.0,
            stop_at_start: true,
            stop_at_end: false,
        };
        let signs = generate_signage_plan(&line, &options).unwrap();
        let prims = signage_plan_primitives(&markings, &signs, |p| Pt::new(p.x, p.y));
        assert_eq!(prims.len(), markings.len() + signs.len() * 2);
    }
}
