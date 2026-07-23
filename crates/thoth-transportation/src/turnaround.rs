//! Cul-de-sac / hammerhead turnaround standard-geometry generator (item 21):
//! given a centerline terminus point, the inbound direction of travel, and a
//! jurisdiction's standard turnaround dimensions, generates the turnaround
//! boundary polygon.
//!
//! **Simplifying assumption**: dimensions (bulb radius, hammerhead stem/top
//! lengths and widths) are **caller-supplied**, not hardcoded to any one
//! jurisdiction — municipal standards for cul-de-sac radius (commonly
//! 35–50 ft pavement radius depending on jurisdiction and fire-apparatus
//! access requirements) and hammerhead dimensions (commonly patterned on
//! NFPA 1141 / local fire-code turnaround standards) vary widely and must
//! be verified against the governing jurisdiction's design manual; this
//! module only supplies the geometry construction, not the standard values
//! themselves.

use thoth_spatial::Point;

use crate::error::{TransportationError, TransportationResult};

/// The shape of turnaround to generate.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TurnaroundKind {
    /// A circular cul-de-sac bulb of the given pavement radius, feet.
    Circular { radius: f64 },
    /// A symmetric T-shaped hammerhead: a straight stem of `stem_length`
    /// continuing the centerline, then a perpendicular top bar of
    /// `top_length` centered on the stem's end, both `width` wide.
    Hammerhead {
        stem_length: f64,
        top_length: f64,
        width: f64,
    },
}

/// Generates the turnaround boundary polygon at `terminus`, where the
/// inbound roadway centerline arrives heading along `inbound_bearing_deg`
/// (degrees clockwise from north, matching `thoth_civil`'s stationing
/// convention — see `thoth_civil::alignment`'s `AlignmentPoint::bearing`).
///
/// For [`TurnaroundKind::Circular`], the bulb is centered `radius` beyond
/// `terminus` along the inbound bearing (i.e. the pavement circle is
/// tangent to — and fully encloses — the point where the through roadway's
/// centerline ends), sampled into `circular_segments` arc segments.
///
/// # Errors
/// [`TransportationError::NonPositiveValue`] if any supplied dimension
/// (`radius`, `stem_length`, `top_length`, `width`) is not strictly
/// positive, or if `circular_segments < 3`.
pub fn generate_turnaround(
    terminus: Point,
    inbound_bearing_deg: f64,
    kind: TurnaroundKind,
    circular_segments: u32,
) -> TransportationResult<Vec<Point>> {
    let bearing_rad = inbound_bearing_deg.to_radians();
    // Travel direction (matches thoth_civil's north = -Y convention: bearing
    // 0 = -Y, 90 = +X).
    let dir = Point::new(bearing_rad.sin(), -bearing_rad.cos());
    let right = Point::new(-dir.y, dir.x); // right of travel

    match kind {
        TurnaroundKind::Circular { radius } => {
            if radius <= 0.0 {
                return Err(TransportationError::NonPositiveValue {
                    field: "radius",
                    value: radius,
                });
            }
            if circular_segments < 3 {
                return Err(TransportationError::NonPositiveValue {
                    field: "circular_segments",
                    value: circular_segments as f64,
                });
            }
            let center = Point::new(terminus.x + dir.x * radius, terminus.y + dir.y * radius);
            let start_angle = bearing_to_math_angle(inbound_bearing_deg) + std::f64::consts::PI;
            let boundary = (0..circular_segments)
                .map(|i| {
                    let a = start_angle
                        + 2.0 * std::f64::consts::PI * (i as f64) / (circular_segments as f64);
                    Point::new(center.x + radius * a.cos(), center.y + radius * a.sin())
                })
                .collect();
            Ok(boundary)
        }
        TurnaroundKind::Hammerhead {
            stem_length,
            top_length,
            width,
        } => {
            for (field, value) in [
                ("stem_length", stem_length),
                ("top_length", top_length),
                ("width", width),
            ] {
                if value <= 0.0 {
                    return Err(TransportationError::NonPositiveValue { field, value });
                }
            }
            let half_w = width / 2.0;
            let half_top = top_length / 2.0;

            // Stem corners at the terminus.
            let stem_start_l = add(terminus, scale(right, half_w));
            let stem_start_r = add(terminus, scale(right, -half_w));
            // Point where the stem meets the top bar's centerline.
            let stem_end = add(terminus, scale(dir, stem_length));
            // Top bar extends perpendicular to the stem, centered on stem_end.
            let top_center_far = add(stem_end, scale(dir, half_w));
            let top_l_far = add(top_center_far, scale(right, half_top));
            let top_r_far = add(top_center_far, scale(right, -half_top));
            let top_center_near = add(stem_end, scale(dir, -half_w));
            let top_l_near = add(top_center_near, scale(right, half_top));
            let top_r_near = add(top_center_near, scale(right, -half_top));

            Ok(vec![
                stem_start_l,
                top_l_near,
                top_l_far,
                top_r_far,
                top_r_near,
                stem_start_r,
            ])
        }
    }
}

/// Converts a `thoth_civil`-style compass bearing (degrees clockwise from
/// north, north = −Y) to a standard math angle (radians, measured CCW from
/// +X) for circular-arc sampling.
fn bearing_to_math_angle(bearing_deg: f64) -> f64 {
    let rad = bearing_deg.to_radians();
    // dir = (sin(b), -cos(b)); math angle = atan2(dir.y, dir.x).
    (-rad.cos()).atan2(rad.sin())
}

fn add(a: Point, b: Point) -> Point {
    Point::new(a.x + b.x, a.y + b.y)
}

fn scale(p: Point, k: f64) -> Point {
    Point::new(p.x * k, p.y * k)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn circular_turnaround_is_a_valid_polygon_of_the_requested_radius() {
        let terminus = Point::new(0.0, 0.0);
        let boundary =
            generate_turnaround(terminus, 0.0, TurnaroundKind::Circular { radius: 45.0 }, 32)
                .unwrap();
        assert_eq!(boundary.len(), 32);
        assert!(thoth_spatial::is_valid_polygon(&boundary));
        // Every boundary point should be exactly `radius` from its center.
        let center = thoth_spatial::centroid(&boundary);
        for p in &boundary {
            assert_relative_eq!(thoth_spatial::distance(center, *p), 45.0, epsilon = 0.5);
        }
    }

    #[test]
    fn circular_turnaround_bulb_encloses_the_terminus() {
        let terminus = Point::new(0.0, 0.0);
        let boundary =
            generate_turnaround(terminus, 0.0, TurnaroundKind::Circular { radius: 40.0 }, 24)
                .unwrap();
        assert!(thoth_spatial::point_in_polygon(terminus, &boundary));
    }

    #[test]
    fn hammerhead_turnaround_produces_a_valid_t_shaped_polygon() {
        let terminus = Point::new(0.0, 0.0);
        let boundary = generate_turnaround(
            terminus,
            0.0,
            TurnaroundKind::Hammerhead {
                stem_length: 20.0,
                top_length: 60.0,
                width: 20.0,
            },
            8,
        )
        .unwrap();
        assert_eq!(boundary.len(), 6);
        assert!(thoth_spatial::is_valid_polygon(&boundary));
    }

    #[test]
    fn rejects_non_positive_radius() {
        assert!(matches!(
            generate_turnaround(
                Point::ZERO,
                0.0,
                TurnaroundKind::Circular { radius: 0.0 },
                16
            ),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }

    #[test]
    fn rejects_too_few_circular_segments() {
        assert!(matches!(
            generate_turnaround(
                Point::ZERO,
                0.0,
                TurnaroundKind::Circular { radius: 40.0 },
                2
            ),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }
}
