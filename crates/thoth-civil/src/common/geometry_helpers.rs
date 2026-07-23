//! Polygon area/centroid and distance/bearing helpers used across the civil
//! modules, kept distinct from `thoth_spatial`'s general-purpose geometry
//! because their degenerate-input behavior differs (see
//! [`calculate_polygon_centroid`]).
//!
//! Port of `packages/domain/src/civil/common/geometryHelpers.ts`. The TS
//! source operates on the survey crate's `Point2D`; here that's
//! `thoth_spatial::Point` — the two are structurally identical `{x, y}` pairs.

use thoth_spatial::Point;

/// Exact polygon area (Shoelace formula), always non-negative regardless of
/// winding order.
///
/// Equivalent to `thoth_spatial::area`; kept as a direct, dependency-free
/// implementation here to mirror the TS module boundary exactly.
pub fn calculate_polygon_area(vertices: &[Point]) -> f64 {
    let n = vertices.len();
    let mut area = 0.0;
    for i in 0..n {
        let j = (i + 1) % n;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }
    (area / 2.0).abs()
}

/// Exact polygon centroid (Cx, Cy) via the area-weighted vertex formula.
///
/// Unlike `thoth_spatial::centroid`, this guards against a *near-zero signed
/// area* (not just too few vertices) — a degenerate (collinear or
/// self-intersecting-to-zero) ring with 3+ vertices falls back to the simple
/// vertex mean instead of dividing by ~0.
pub fn calculate_polygon_centroid(vertices: &[Point]) -> Point {
    let n = vertices.len();
    if n == 0 {
        return Point::ZERO;
    }
    let mut cx = 0.0;
    let mut cy = 0.0;
    let mut area_factor = 0.0;

    for i in 0..n {
        let j = (i + 1) % n;
        let factor = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
        cx += (vertices[i].x + vertices[j].x) * factor;
        cy += (vertices[i].y + vertices[j].y) * factor;
        area_factor += factor;
    }

    let area = area_factor / 2.0;
    if area.abs() < 1e-9 {
        let sum_x: f64 = vertices.iter().map(|v| v.x).sum();
        let sum_y: f64 = vertices.iter().map(|v| v.y).sum();
        return Point::new(sum_x / n as f64, sum_y / n as f64);
    }

    let factor3a = 6.0 * area;
    Point::new(cx / factor3a, cy / factor3a)
}

/// Euclidean distance and azimuth (radians clockwise from north, unwrapped —
/// may be negative) between two points.
pub struct DistanceAndBearing {
    pub distance: f64,
    pub bearing_rad: f64,
}

/// Calculates Euclidean distance and bearing angle in radians between two
/// 2D points.
pub fn calculate_distance_and_bearing(p1: Point, p2: Point) -> DistanceAndBearing {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    DistanceAndBearing {
        distance: dx.hypot(dy),
        bearing_rad: dx.atan2(dy),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn square(side: f64) -> Vec<Point> {
        vec![
            Point::new(0.0, 0.0),
            Point::new(side, 0.0),
            Point::new(side, side),
            Point::new(0.0, side),
        ]
    }

    #[test]
    fn area_of_unit_square() {
        assert_relative_eq!(calculate_polygon_area(&square(1.0)), 1.0, epsilon = 1e-12);
    }

    #[test]
    fn centroid_of_square_is_center() {
        let c = calculate_polygon_centroid(&square(4.0));
        assert_relative_eq!(c.x, 2.0, epsilon = 1e-9);
        assert_relative_eq!(c.y, 2.0, epsilon = 1e-9);
    }

    #[test]
    fn centroid_falls_back_to_vertex_mean_for_degenerate_ring() {
        // Three collinear points: signed area is exactly zero.
        let collinear = vec![Point::new(0.0, 0.0), Point::new(1.0, 0.0), Point::new(2.0, 0.0)];
        let c = calculate_polygon_centroid(&collinear);
        assert_relative_eq!(c.x, 1.0, epsilon = 1e-12);
        assert_relative_eq!(c.y, 0.0, epsilon = 1e-12);
    }

    #[test]
    fn distance_and_bearing_of_due_east() {
        let db = calculate_distance_and_bearing(Point::ZERO, Point::new(10.0, 0.0));
        assert_relative_eq!(db.distance, 10.0, epsilon = 1e-12);
        assert_relative_eq!(db.bearing_rad, std::f64::consts::FRAC_PI_2, epsilon = 1e-12);
    }
}
