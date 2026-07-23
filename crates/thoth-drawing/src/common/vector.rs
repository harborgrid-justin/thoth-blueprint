//! Small 2D vector helper shared across annotation/dimension geometry. Port of
//! `drawing/common/vector.ts`.

use thoth_spatial::Point;

/// Left normal (unit vector rotated +90 degrees) of `dir`. Returns the zero
/// vector if `dir` is ~zero, matching the TS `1e-9` guard exactly.
pub fn left_normal(dir: Point) -> Point {
    let len = dir.x.hypot(dir.y);
    if len < 1e-9 {
        Point::new(0.0, 0.0)
    } else {
        Point::new(-dir.y / len, dir.x / len)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn left_normal_of_east_is_north() {
        let n = left_normal(Point::new(1.0, 0.0));
        assert_relative_eq!(n.x, 0.0, epsilon = 1e-12);
        assert_relative_eq!(n.y, 1.0, epsilon = 1e-12);
    }

    #[test]
    fn left_normal_of_zero_vector_is_zero() {
        let n = left_normal(Point::new(0.0, 0.0));
        assert_eq!(n, Point::new(0.0, 0.0));
    }
}
