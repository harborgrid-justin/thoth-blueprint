//! Linework, drafting, and "transparent command" tools — Rust port of
//! `packages/domain/src/survey/transparentCommands.ts` (REQ-013…REQ-022).
//!
//! A transparent command is the classic COGO input mini-language surveyors
//! type mid-command (bearing-distance, azimuth-distance, point number, …) to
//! place a point without leaving the current drafting command.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::error::SurveyError;
use crate::points::CogoPoint;

/// A 2D plan-space point — identical in shape to [`thoth_spatial::Point`];
/// aliased (not redefined) so this module's wire types compose directly
/// with the shared spatial primitives.
pub type Point2D = thoth_spatial::Point;

/// A straight line segment between two points.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LineSegment {
    pub start: Point2D,
    pub end: Point2D,
}

/// A per-vertex arc annotation on a [`PolylineEntity`] (a DXF-adjacent
/// convention distinct from the edge-index bulge map, [`thoth_spatial::EdgeArcs`],
/// used elsewhere in this crate).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct VertexArc {
    pub vertex_index: usize,
    pub radius: f64,
    pub is_clockwise: bool,
}

/// A drafted polyline entity: vertices plus optional per-vertex arcs.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PolylineEntity {
    pub id: String,
    pub vertices: Vec<Point2D>,
    pub arcs: Vec<VertexArc>,
    pub is_closed: bool,
}

/// The surveyor's quadrant a bearing-distance course is drafted in
/// (1 = NE, 2 = SE, 3 = SW, 4 = NW).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Quadrant {
    Ne = 1,
    Se = 2,
    Sw = 3,
    Nw = 4,
}

/// A millisecond-resolution id, e.g. `"pline-1732400000000"` — the Rust
/// equivalent of the TS `` `pline-${Date.now()}` `` convention. The exact
/// timestamp is never asserted by tests (it's non-deterministic in both
/// runtimes); only the prefix and shape matter.
fn timestamped_id(prefix: &str) -> String {
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{prefix}-{millis}")
}

/// REQ-013: Generate contiguous lines using sequential point number ranges
/// (e.g. `"1-5, 8, 10-12"`).
pub fn create_linework_from_point_ranges(
    point_map: &BTreeMap<i64, CogoPoint>,
    range_input: &str,
) -> PolylineEntity {
    let mut point_numbers = Vec::new();
    for part in range_input.split(',').map(str::trim) {
        if let Some((start, end)) = part.split_once('-') {
            if let (Ok(s), Ok(e)) = (start.trim().parse::<i64>(), end.trim().parse::<i64>()) {
                for i in s..=e {
                    point_numbers.push(i);
                }
            }
        } else if let Ok(v) = part.parse::<i64>() {
            point_numbers.push(v);
        }
    }

    let mut vertices = Vec::new();
    for p_num in point_numbers {
        if let Some(pt) = point_map.get(&p_num) {
            vertices.push(Point2D::new(pt.easting, pt.northing));
        }
    }

    PolylineEntity {
        id: timestamped_id("pline"),
        vertices,
        arcs: Vec::new(),
        is_closed: false,
    }
}

/// REQ-015: Line drafting via quadrant bearing input (quadrant + a bearing
/// angle off the N/S axis toward E/W) and a linear distance.
pub fn calculate_point_from_quadrant_bearing(
    start: Point2D,
    quadrant: Quadrant,
    bearing_deg: f64,
    distance: f64,
) -> Point2D {
    let azimuth_deg = match quadrant {
        Quadrant::Ne => bearing_deg,
        Quadrant::Se => 180.0 - bearing_deg,
        Quadrant::Sw => 180.0 + bearing_deg,
        Quadrant::Nw => 360.0 - bearing_deg,
    };
    let azimuth_rad = azimuth_deg.to_radians();
    // In surveying: Easting = x, Northing = y. Azimuth is clockwise from North (Y-axis).
    Point2D::new(
        start.x + distance * azimuth_rad.sin(),
        start.y + distance * azimuth_rad.cos(),
    )
}

/// REQ-016: Extend a line segment past its endpoint by `extension_distance`.
/// A zero-length segment is returned unchanged — there is no direction to
/// extend along.
pub fn extend_line_endpoint(segment: LineSegment, extension_distance: f64) -> LineSegment {
    let dx = segment.end.x - segment.start.x;
    let dy = segment.end.y - segment.start.y;
    let len = dx.hypot(dy);
    if len == 0.0 {
        return segment;
    }
    let ux = dx / len;
    let uy = dy / len;
    LineSegment {
        start: segment.start,
        end: Point2D::new(
            segment.end.x + ux * extension_distance,
            segment.end.y + uy * extension_distance,
        ),
    }
}

/// REQ-017: Join selected line segments into a single continuous polyline,
/// snapping consecutive segments that share an endpoint within `1e-4` units.
pub fn join_line_segments(segments: &[LineSegment]) -> PolylineEntity {
    if segments.is_empty() {
        return PolylineEntity {
            id: timestamped_id("pline"),
            vertices: Vec::new(),
            arcs: Vec::new(),
            is_closed: false,
        };
    }

    let mut vertices = vec![segments[0].start, segments[0].end];
    for seg in &segments[1..] {
        let last = *vertices.last().expect("seeded with two vertices above");
        if thoth_spatial::distance(seg.start, last) < 1e-4 {
            vertices.push(seg.end);
        } else if thoth_spatial::distance(seg.end, last) < 1e-4 {
            vertices.push(seg.start);
        } else {
            vertices.push(seg.start);
            vertices.push(seg.end);
        }
    }

    let is_closed = vertices.len() > 2
        && thoth_spatial::distance(vertices[0], *vertices.last().unwrap()) < 1e-4;

    PolylineEntity {
        id: timestamped_id("pline"),
        vertices,
        arcs: Vec::new(),
        is_closed,
    }
}

/// The grip-edit action requested on a [`PolylineEntity`] (REQ-018).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GripAction {
    AddVertex,
    StretchVertex,
    ConvertArc,
}

/// REQ-018: Apply a single grip-edit action to a polyline (add a vertex,
/// move a vertex, or mark a segment as a circular arc). An out-of-range
/// `target_index` for `AddVertex` clamps to the end of the vertex list
/// (mirroring JS `Array.prototype.splice`'s out-of-range clamping) rather
/// than panicking.
pub fn manipulate_polyline_grip(
    polyline: &PolylineEntity,
    action: GripAction,
    target_index: usize,
    new_position: Point2D,
    arc_radius: Option<f64>,
) -> PolylineEntity {
    let mut vertices = polyline.vertices.clone();
    let mut arcs = polyline.arcs.clone();

    match action {
        GripAction::AddVertex => {
            let insert_at = (target_index + 1).min(vertices.len());
            vertices.insert(insert_at, new_position);
        }
        GripAction::StretchVertex => {
            if target_index < vertices.len() {
                vertices[target_index] = new_position;
            }
        }
        GripAction::ConvertArc => {
            arcs.push(VertexArc {
                vertex_index: target_index,
                radius: arc_radius.unwrap_or(10.0),
                is_clockwise: true,
            });
        }
    }

    PolylineEntity {
        id: polyline.id.clone(),
        vertices,
        arcs,
        is_closed: polyline.is_closed,
    }
}

/// The classic COGO transparent-command vocabulary (REQ-019…REQ-022).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransparentCommandType {
    /// Angle-Distance.
    Ad,
    /// Bearing-Distance.
    Bd,
    /// Azimuth-Distance.
    Zd,
    /// Deflection-Distance.
    Dd,
    /// Point Number.
    Pn,
    /// Point Name.
    Pname,
    /// Point Object.
    Po,
    /// Zoom to Point.
    Ze,
    /// Close Polyline.
    C,
}

/// Input to [`execute_transparent_command`]; which fields are required
/// depends on `command` — see each [`SurveyError::MissingTransparentCommandInput`]
/// case for the combination a given command needs. Mirrors the TS
/// union-of-optionals shape exactly.
#[derive(Debug, Clone, Default)]
pub struct TransparentCommandInput<'a> {
    pub command: Option<TransparentCommandType>,
    pub start_point: Option<Point2D>,
    pub reference_angle_deg: Option<f64>,
    pub angle_or_bearing_deg: Option<f64>,
    pub quadrant: Option<Quadrant>,
    pub distance: Option<f64>,
    pub point_number: Option<i64>,
    pub point_name: Option<String>,
    pub point_map: Option<&'a BTreeMap<i64, CogoPoint>>,
}

/// The control action requested by a `ZE` (zoom) or `C` (close) command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ControlAction {
    Close,
    Zoom,
}

/// Outcome of a transparent command: either a computed point, or a control
/// action (optionally carrying a target point, for `ZE`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TransparentCommandOutput {
    Point(Point2D),
    Action {
        action: ControlAction,
        target_point: Option<Point2D>,
    },
}

/// REQ-019…REQ-022: Execute a single transparent command. `command` itself
/// must be present (the TS `command` field is required, unlike the other
/// inputs); every other field's requiredness is command-dependent — see the
/// `Err` variants below for exactly what each command needs.
pub fn execute_transparent_command(
    input: &TransparentCommandInput,
) -> Result<TransparentCommandOutput, SurveyError> {
    use TransparentCommandType::*;

    let command = input.command.ok_or(SurveyError::MissingCommand)?;

    match command {
        Bd => match (
            input.start_point,
            input.quadrant,
            input.angle_or_bearing_deg,
            input.distance,
        ) {
            (Some(start), Some(quadrant), Some(bearing), Some(distance)) => Ok(
                TransparentCommandOutput::Point(calculate_point_from_quadrant_bearing(
                    start, quadrant, bearing, distance,
                )),
            ),
            _ => Err(SurveyError::MissingTransparentCommandInput {
                command: Bd,
                requirement: "startPoint, quadrant, bearing, and distance",
            }),
        },
        Zd => match (input.start_point, input.angle_or_bearing_deg, input.distance) {
            (Some(start), Some(azimuth_deg), Some(distance)) => {
                let az_rad = azimuth_deg.to_radians();
                Ok(TransparentCommandOutput::Point(Point2D::new(
                    start.x + distance * az_rad.sin(),
                    start.y + distance * az_rad.cos(),
                )))
            }
            _ => Err(SurveyError::MissingTransparentCommandInput {
                command: Zd,
                requirement: "startPoint, azimuth, and distance",
            }),
        },
        Ad => match (
            input.start_point,
            input.reference_angle_deg,
            input.angle_or_bearing_deg,
            input.distance,
        ) {
            (Some(start), Some(reference), Some(angle), Some(distance)) => {
                let total_az_deg = (reference + angle) % 360.0;
                let az_rad = total_az_deg.to_radians();
                Ok(TransparentCommandOutput::Point(Point2D::new(
                    start.x + distance * az_rad.sin(),
                    start.y + distance * az_rad.cos(),
                )))
            }
            _ => Err(SurveyError::MissingTransparentCommandInput {
                command: Ad,
                requirement: "startPoint, referenceAngle, angle, and distance",
            }),
        },
        Dd => match (
            input.start_point,
            input.reference_angle_deg,
            input.angle_or_bearing_deg,
            input.distance,
        ) {
            (Some(start), Some(reference), Some(deflection), Some(distance)) => {
                let total_az_deg = (reference + deflection) % 360.0;
                let az_rad = total_az_deg.to_radians();
                Ok(TransparentCommandOutput::Point(Point2D::new(
                    start.x + distance * az_rad.sin(),
                    start.y + distance * az_rad.cos(),
                )))
            }
            _ => Err(SurveyError::MissingTransparentCommandInput {
                command: Dd,
                requirement: "startPoint, referenceAngle, deflectionAngle, and distance",
            }),
        },
        Pn | Pname | Po => match (input.point_number, input.point_map) {
            // A point number of exactly 0 is falsy in the TS original
            // (`!pointNumber`) and is treated the same as "missing".
            (Some(num), Some(map)) if num != 0 => map
                .get(&num)
                .map(|pt| TransparentCommandOutput::Point(Point2D::new(pt.easting, pt.northing)))
                .ok_or(SurveyError::PointNotFound(num)),
            _ => Err(SurveyError::MissingTransparentCommandInput {
                command,
                requirement: "pointNumber and pointMap",
            }),
        },
        Ze => match (input.point_number, input.point_map) {
            (Some(num), Some(map)) if num != 0 => {
                let target = map.get(&num).map(|pt| Point2D::new(pt.easting, pt.northing));
                Ok(TransparentCommandOutput::Action {
                    action: ControlAction::Zoom,
                    target_point: target,
                })
            }
            _ => Err(SurveyError::MissingTransparentCommandInput {
                command: Ze,
                requirement: "pointNumber",
            }),
        },
        C => Ok(TransparentCommandOutput::Action {
            action: ControlAction::Close,
            target_point: None,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn point_map(entries: &[(i64, f64, f64)]) -> BTreeMap<i64, CogoPoint> {
        entries
            .iter()
            .map(|&(n, northing, easting)| {
                (
                    n,
                    CogoPoint {
                        id: format!("pt-{n}"),
                        point_number: n,
                        northing,
                        easting,
                        elevation: 0.0,
                        raw_description: String::new(),
                        full_description: None,
                        point_style: None,
                        label_style: None,
                        point_group_id: None,
                        rgb_color: None,
                        classification_tag: None,
                    },
                )
            })
            .collect()
    }

    #[test]
    fn point_ranges_expand_and_look_up_vertices() {
        let map = point_map(&[(1, 0.0, 0.0), (2, 10.0, 0.0), (3, 10.0, 10.0)]);
        let pline = create_linework_from_point_ranges(&map, "1-3");
        assert_eq!(pline.vertices.len(), 3);
        assert_eq!(pline.vertices[1], Point2D::new(0.0, 10.0));
    }

    #[test]
    fn quadrant_bearing_ne_matches_azimuth() {
        let p = calculate_point_from_quadrant_bearing(Point2D::new(0.0, 0.0), Quadrant::Ne, 45.0, 10.0);
        assert_relative_eq!(p.x, 10.0 * 45f64.to_radians().sin(), epsilon = 1e-9);
        assert_relative_eq!(p.y, 10.0 * 45f64.to_radians().cos(), epsilon = 1e-9);
    }

    #[test]
    fn extend_line_endpoint_is_a_no_op_for_zero_length_segments() {
        let seg = LineSegment {
            start: Point2D::new(1.0, 1.0),
            end: Point2D::new(1.0, 1.0),
        };
        assert_eq!(extend_line_endpoint(seg, 10.0), seg);
    }

    #[test]
    fn join_line_segments_snaps_shared_endpoints_and_detects_closure() {
        let segs = vec![
            LineSegment {
                start: Point2D::new(0.0, 0.0),
                end: Point2D::new(10.0, 0.0),
            },
            LineSegment {
                start: Point2D::new(10.0, 0.0),
                end: Point2D::new(10.0, 10.0),
            },
            LineSegment {
                start: Point2D::new(10.0, 10.0),
                end: Point2D::new(0.0, 0.0),
            },
        ];
        let joined = join_line_segments(&segs);
        assert_eq!(joined.vertices.len(), 3);
        assert!(joined.is_closed);
    }

    #[test]
    fn missing_fields_produce_a_typed_error_not_a_panic() {
        let input = TransparentCommandInput {
            command: Some(TransparentCommandType::Bd),
            ..Default::default()
        };
        let err = execute_transparent_command(&input).unwrap_err();
        assert!(matches!(
            err,
            SurveyError::MissingTransparentCommandInput { .. }
        ));
    }

    #[test]
    fn point_number_zero_is_treated_as_missing() {
        let map = point_map(&[(0, 1.0, 2.0)]);
        let input = TransparentCommandInput {
            command: Some(TransparentCommandType::Pn),
            point_number: Some(0),
            point_map: Some(&map),
            ..Default::default()
        };
        let err = execute_transparent_command(&input).unwrap_err();
        assert!(matches!(
            err,
            SurveyError::MissingTransparentCommandInput { .. }
        ));
    }

    #[test]
    fn unknown_point_number_is_a_typed_not_found_error() {
        let map = point_map(&[(1, 1.0, 2.0)]);
        let input = TransparentCommandInput {
            command: Some(TransparentCommandType::Po),
            point_number: Some(99),
            point_map: Some(&map),
            ..Default::default()
        };
        assert_eq!(
            execute_transparent_command(&input).unwrap_err(),
            SurveyError::PointNotFound(99)
        );
    }

    #[test]
    fn close_command_needs_nothing_else() {
        let input = TransparentCommandInput {
            command: Some(TransparentCommandType::C),
            ..Default::default()
        };
        assert_eq!(
            execute_transparent_command(&input).unwrap(),
            TransparentCommandOutput::Action {
                action: ControlAction::Close,
                target_point: None
            }
        );
    }
}
