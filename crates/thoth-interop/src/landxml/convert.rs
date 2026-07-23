//! The single shared northing/easting ⇄ plan-`Point` conversion used by every
//! point-list family in this module (`<CgPoint>`, surface `<P>`). Matches
//! `thoth_spatial::geometry::format_coord`'s survey-format branch: north is
//! `-y`, east is `+x`.

use thoth_spatial::Point;

/// Convert a plan-space point to `(northing, easting)`.
pub fn point_to_northing_easting(p: Point) -> (f64, f64) {
    (-p.y, p.x)
}

/// Convert `(northing, easting)` to a plan-space point.
pub fn northing_easting_to_point(northing: f64, easting: f64) -> Point {
    Point::new(easting, -northing)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_northing_easting() {
        let p = Point::new(123.4, -567.8);
        let (n, e) = point_to_northing_easting(p);
        let back = northing_easting_to_point(n, e);
        assert_eq!(back, p);
    }

    #[test]
    fn due_north_increases_northing_not_easting() {
        // North is -y in this codebase's plan frame, so a point 10 units
        // north of the origin sits at y = -10.
        let (n, e) = point_to_northing_easting(Point::new(0.0, -10.0));
        assert_eq!(n, 10.0);
        assert_eq!(e, 0.0);
    }
}
