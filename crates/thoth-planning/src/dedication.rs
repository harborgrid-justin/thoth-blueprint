//! Automated ROW dedication and easement-polygon generation: given a road
//! centerline (or utility-corridor centerline) plus a standard width,
//! generate the corresponding [`RightOfWay`]/[`Easement`] boundary polygon.
//!
//! Item 43 of the Theme 4 subdivision-design-automation gap analysis.
//! [`buffer_centerline`] is a mitered polyline buffer — the same join
//! convention as an SVG/PostScript stroke with a miter limit: at each
//! interior vertex the two adjacent edges' offset lines are extended to
//! their intersection, and that miter length is capped (falling back to a
//! flat/beveled corner) so a sharp turn can't produce an unbounded spike.
//! This is adequate for the gentle, standards-compliant curvature real
//! street/utility centerlines have; it is **not** a general polygon-offset
//! algorithm and does not detect or repair self-intersection on a very
//! sharp switchback — see the function's doc comment for the exact limit.

use thiserror::Error;
use thoth_spatial::{add, normalize, scale, subtract, Point, Polygon};

use crate::elements::{new_base, Easement, EasementPurpose, RightOfWay};

/// Everything that can go wrong generating a ROW/easement polygon from a
/// centerline.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum DedicationError {
    #[error("Centerline must contain at least 2 points, got {0}.")]
    CenterlineTooShort(usize),
    #[error("Width must be greater than 0, got {0}.")]
    InvalidWidth(f64),
    #[error("Buffering the centerline collapsed to a degenerate (near-zero-area) polygon.")]
    DegenerateBuffer,
}

/// The miter length is capped at this multiple of the half-width before
/// falling back to a bevel (using the edge normal directly) — the same
/// concept as SVG's `stroke-miterlimit`, chosen conservatively for planning
/// sketches where corridors rarely turn sharper than a typical street
/// intersection.
const MAX_MITER_FACTOR: f64 = 4.0;

/// Perpendicular (left) normal of the unit vector from `a` to `b`.
fn left_normal(a: Point, b: Point) -> Point {
    let dir = normalize(subtract(b, a));
    Point::new(-dir.y, dir.x)
}

/// Offset amount and direction for centerline vertex `i`, given the
/// (already unit) normals of its incoming and outgoing edges. Endpoints use
/// their single adjacent edge's normal directly (no miter needed).
fn vertex_offset(prev_normal: Option<Point>, next_normal: Option<Point>, half_width: f64) -> Point {
    match (prev_normal, next_normal) {
        (Some(n), None) | (None, Some(n)) => scale(n, half_width),
        (Some(n1), Some(n2)) => {
            let sum = add(n1, n2);
            let len = (sum.x * sum.x + sum.y * sum.y).sqrt();
            if len < 1e-9 {
                // A near-180° reversal: the two normals cancel. Fall back to
                // one edge's normal rather than dividing by ~0.
                return scale(n1, half_width);
            }
            let miter_dir = Point::new(sum.x / len, sum.y / len);
            // Standard miter-length formula: half_width / cos(θ/2), where
            // cos(θ/2) = dot(miter_dir, n1) for unit vectors.
            let cos_half_theta = (miter_dir.x * n1.x + miter_dir.y * n1.y).max(1e-6);
            let miter_len = (half_width / cos_half_theta).min(half_width * MAX_MITER_FACTOR);
            scale(miter_dir, miter_len)
        }
        (None, None) => Point::ZERO,
    }
}

/// Buffer an open polyline into a closed corridor polygon of the given total
/// `width` (the polygon extends `width / 2` to each side of the centerline).
/// Uses mitered joins at interior vertices, clamped per [`MAX_MITER_FACTOR`]
/// — see the module doc comment for the limitation this implies on very
/// sharp turns.
pub fn buffer_centerline(centerline: &[Point], width: f64) -> Result<Polygon, DedicationError> {
    if centerline.len() < 2 {
        return Err(DedicationError::CenterlineTooShort(centerline.len()));
    }
    if width <= 0.0 {
        return Err(DedicationError::InvalidWidth(width));
    }

    let half_width = width / 2.0;
    let n = centerline.len();
    let edge_normals: Vec<Point> = (0..n - 1)
        .map(|i| left_normal(centerline[i], centerline[i + 1]))
        .collect();

    let mut left_side = Vec::with_capacity(n);
    for i in 0..n {
        let prev_normal = if i > 0 {
            Some(edge_normals[i - 1])
        } else {
            None
        };
        let next_normal = if i < n - 1 {
            Some(edge_normals[i])
        } else {
            None
        };
        let offset = vertex_offset(prev_normal, next_normal, half_width);
        left_side.push(add(centerline[i], offset));
    }

    let mut right_side = Vec::with_capacity(n);
    for i in 0..n {
        let prev_normal = if i > 0 {
            Some(edge_normals[i - 1])
        } else {
            None
        };
        let next_normal = if i < n - 1 {
            Some(edge_normals[i])
        } else {
            None
        };
        let offset = vertex_offset(prev_normal, next_normal, half_width);
        right_side.push(subtract(centerline[i], offset));
    }
    right_side.reverse();

    let mut ring = left_side;
    ring.extend(right_side);

    if thoth_spatial::area(&ring) < thoth_spatial::GEOMETRY_EPSILON {
        return Err(DedicationError::DegenerateBuffer);
    }
    Ok(ring)
}

/// Generate a [`RightOfWay`] element from a street centerline and nominal
/// width — the standard dedication a subdivision plat records for a new
/// public street.
pub fn generate_row_dedication(
    id: impl Into<String>,
    name: impl Into<String>,
    layer_id: impl Into<String>,
    centerline: Vec<Point>,
    width: f64,
) -> Result<RightOfWay, DedicationError> {
    let boundary = buffer_centerline(&centerline, width)?;
    Ok(RightOfWay {
        base: new_base(
            id,
            thoth_spatial::ElementKind::Row,
            name,
            layer_id,
            boundary,
        ),
        centerline: Some(centerline),
        width: Some(width),
    })
}

/// Generate an [`Easement`] element from a utility-corridor centerline and
/// nominal width.
pub fn generate_easement_polygon(
    id: impl Into<String>,
    name: impl Into<String>,
    layer_id: impl Into<String>,
    corridor_centerline: &[Point],
    width: f64,
    purpose: EasementPurpose,
) -> Result<Easement, DedicationError> {
    let boundary = buffer_centerline(corridor_centerline, width)?;
    Ok(Easement {
        base: new_base(
            id,
            thoth_spatial::ElementKind::Easement,
            name,
            layer_id,
            boundary,
        ),
        purpose: Some(purpose),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn straight_centerline_buffers_to_an_exact_rectangle() {
        let centerline = vec![Point::new(0.0, 0.0), Point::new(200.0, 0.0)];
        let poly = buffer_centerline(&centerline, 60.0).unwrap();
        assert_relative_eq!(thoth_spatial::area(&poly), 200.0 * 60.0, epsilon = 1e-6);
        // Every centerline point should be within width/2 of the ring at that station.
        let bounds = thoth_spatial::bounds(&poly);
        assert_relative_eq!(bounds.min_y, -30.0, epsilon = 1e-6);
        assert_relative_eq!(bounds.max_y, 30.0, epsilon = 1e-6);
        assert_relative_eq!(bounds.min_x, 0.0, epsilon = 1e-6);
        assert_relative_eq!(bounds.max_x, 200.0, epsilon = 1e-6);
    }

    #[test]
    fn right_angle_centerline_produces_a_valid_nonzero_area_corridor() {
        let centerline = vec![
            Point::new(0.0, 0.0),
            Point::new(100.0, 0.0),
            Point::new(100.0, 100.0),
        ];
        let poly = buffer_centerline(&centerline, 40.0).unwrap();
        assert!(thoth_spatial::is_valid_polygon(&poly));
        // Area should exceed the two straight segments' minimum (100*40 each,
        // minus the corner overlap) — a generous sanity bound rather than an
        // exact figure, since the miter join adds a small corner wedge.
        let area = thoth_spatial::area(&poly);
        assert!(area > 100.0 * 40.0, "corridor area {area} looked too small");
    }

    #[test]
    fn rejects_short_centerlines_and_nonpositive_width() {
        assert_eq!(
            buffer_centerline(&[Point::ZERO], 10.0),
            Err(DedicationError::CenterlineTooShort(1))
        );
        assert_eq!(
            buffer_centerline(&[Point::new(0.0, 0.0), Point::new(10.0, 0.0)], 0.0),
            Err(DedicationError::InvalidWidth(0.0))
        );
    }

    #[test]
    fn generates_a_row_dedication_with_centerline_and_width_stamped() {
        let centerline = vec![Point::new(0.0, 0.0), Point::new(300.0, 0.0)];
        let row =
            generate_row_dedication("row-1", "Main St ROW", "streets", centerline.clone(), 60.0)
                .unwrap();
        assert_eq!(row.centerline.as_ref().unwrap(), &centerline);
        assert_eq!(row.width, Some(60.0));
        assert_relative_eq!(
            thoth_spatial::area(&row.base.boundary),
            300.0 * 60.0,
            epsilon = 1e-6
        );
    }

    #[test]
    fn generates_a_utility_easement_from_a_corridor_centerline() {
        let centerline = vec![Point::new(0.0, 0.0), Point::new(0.0, 500.0)];
        let easement = generate_easement_polygon(
            "e-1",
            "Sanitary Sewer Easement",
            "utilities",
            &centerline,
            20.0,
            EasementPurpose::Utility,
        )
        .unwrap();
        assert_eq!(easement.purpose, Some(EasementPurpose::Utility));
        assert_relative_eq!(
            thoth_spatial::area(&easement.base.boundary),
            500.0 * 20.0,
            epsilon = 1e-6
        );
    }
}
