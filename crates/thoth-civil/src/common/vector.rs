//! Small 2D vector helpers specific to civil stationing (azimuth convention,
//! left/right-of-travel normals). Port of `packages/domain/src/civil/common/vector.ts`.
//!
//! Convention shared with the rest of the platform: north is −Y, east is +X;
//! azimuth is clockwise from north in `[0, 360)`.

use thoth_spatial::Point;

/// Azimuth (degrees clockwise from north, north = −Y) of direction `d`.
pub fn azimuth_of(d: Point) -> f64 {
    let deg = d.x.atan2(-d.y) * (180.0 / std::f64::consts::PI);
    (deg + 360.0) % 360.0
}

/// Left normal unit vector, `dir` rotated +90 degrees. Returns the zero
/// vector for a near-zero input (mirrors the TS epsilon guard).
pub fn left_normal(dir: Point) -> Point {
    let len = dir.x.hypot(dir.y);
    if len < 1e-9 {
        Point::ZERO
    } else {
        Point::new(-dir.y / len, dir.x / len)
    }
}

/// Right normal unit vector, `dir` rotated −90 degrees.
pub fn right_normal(dir: Point) -> Point {
    let len = dir.x.hypot(dir.y);
    if len < 1e-9 {
        Point::ZERO
    } else {
        Point::new(dir.y / len, -dir.x / len)
    }
}

/// Linear interpolation between two scalars.
pub fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn azimuth_of_cardinal_directions() {
        assert_relative_eq!(azimuth_of(Point::new(0.0, -1.0)), 0.0, epsilon = 1e-9); // north
        assert_relative_eq!(azimuth_of(Point::new(1.0, 0.0)), 90.0, epsilon = 1e-9); // east
        assert_relative_eq!(azimuth_of(Point::new(0.0, 1.0)), 180.0, epsilon = 1e-9); // south
        assert_relative_eq!(azimuth_of(Point::new(-1.0, 0.0)), 270.0, epsilon = 1e-9);
        // west
    }

    #[test]
    fn left_and_right_normals_are_perpendicular_and_opposite() {
        let dir = Point::new(1.0, 0.0);
        let l = left_normal(dir);
        let r = right_normal(dir);
        assert_relative_eq!(l.x, -r.x, epsilon = 1e-12);
        assert_relative_eq!(l.y, -r.y, epsilon = 1e-12);
        assert_relative_eq!(l.x, 0.0, epsilon = 1e-12);
        assert_relative_eq!(l.y, 1.0, epsilon = 1e-12);
    }

    #[test]
    fn normals_of_near_zero_vector_are_zero() {
        let z = left_normal(Point::new(1e-12, 0.0));
        assert_eq!(z, Point::ZERO);
    }

    #[test]
    fn lerp_interpolates_linearly() {
        assert_relative_eq!(lerp(0.0, 10.0, 0.25), 2.5, epsilon = 1e-12);
    }
}
