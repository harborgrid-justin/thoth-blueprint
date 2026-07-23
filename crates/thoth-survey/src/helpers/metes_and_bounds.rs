//! Metes-and-bounds course-table geometry — turning a hand-entered course
//! table (bearing + distance, or bearing + arc) into a closed boundary and
//! its closure error. Direct port of
//! `packages/domain/src/survey/helpers/metesAndBoundsHelpers.ts`.

use thoth_spatial::{EdgeArcs, Point};

use crate::bearing::{bearing_to_azimuth, EastWest, NorthSouth, QuadrantBearing};
use crate::curve::boundary_area;

/// One row of a hand-entered course table.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CourseRow {
    pub ns: NorthSouth,
    pub deg: i32,
    pub min: i32,
    pub sec: i32,
    pub ew: EastWest,
    pub distance: f64,
    pub is_curve: bool,
    pub arc_length: f64,
    pub radius: f64,
}

/// The default four-course table from the TS original (a right-of-way
/// frontage with one curved course).
pub fn default_courses() -> Vec<CourseRow> {
    vec![
        CourseRow {
            ns: NorthSouth::N,
            deg: 3,
            min: 52,
            sec: 8,
            ew: EastWest::E,
            distance: 178.64,
            is_curve: false,
            arc_length: 0.0,
            radius: 0.0,
        },
        CourseRow {
            ns: NorthSouth::N,
            deg: 81,
            min: 44,
            sec: 15,
            ew: EastWest::E,
            distance: 82.79,
            is_curve: false,
            arc_length: 0.0,
            radius: 0.0,
        },
        CourseRow {
            ns: NorthSouth::S,
            deg: 9,
            min: 56,
            sec: 35,
            ew: EastWest::E,
            distance: 189.40,
            is_curve: false,
            arc_length: 0.0,
            radius: 0.0,
        },
        CourseRow {
            ns: NorthSouth::N,
            deg: 86,
            min: 7,
            sec: 52,
            ew: EastWest::W,
            distance: 16.99,
            is_curve: true,
            arc_length: 110.05,
            radius: 498.00,
        },
    ]
}

/// Boundary geometry computed by walking a course table from a Point of
/// Beginning.
#[derive(Debug, Clone, PartialEq)]
pub struct MetesAndBoundsGeometry {
    pub boundary: Vec<Point>,
    pub arcs: EdgeArcs,
    pub total_perimeter: f64,
    pub calculated_area_sq_ft: f64,
    pub closure_error: f64,
}

/// Walk `courses` from `(pob_x, pob_y)`, producing the resulting boundary,
/// its perimeter, shoelace area (auto-closing the ring if the last course
/// doesn't land back on the Point of Beginning within 0.05 units), and
/// closure error.
pub fn compute_metes_and_bounds_geometry(
    courses: &[CourseRow],
    pob_x: f64,
    pob_y: f64,
) -> MetesAndBoundsGeometry {
    let mut pts = vec![Point::new(pob_x, pob_y)];
    let edge_arcs = EdgeArcs::new();
    let mut current = Point::new(pob_x, pob_y);
    let mut perimeter = 0.0;
    let n = courses.len();

    for (idx, c) in courses.iter().enumerate() {
        let bearing = QuadrantBearing {
            ns: c.ns,
            degrees: c.deg,
            minutes: c.min,
            seconds: c.sec,
            ew: c.ew,
            cardinal: None,
        };
        let az = bearing_to_azimuth(&bearing);
        let rad = az.to_radians();
        let dx = c.distance * rad.sin();
        let dy = -c.distance * rad.cos();

        current = Point::new(current.x + dx, current.y + dy);
        perimeter += c.distance;

        if idx < n - 1 {
            pts.push(current);
        }
    }

    let is_closed = (current.x - pob_x).hypot(current.y - pob_y) < 0.05;
    let mut closed_pts = pts.clone();
    if !is_closed {
        closed_pts.push(pts[0]);
    }
    let area = boundary_area(&closed_pts, None);
    let closure_error = (current.x - pob_x).hypot(current.y - pob_y);

    MetesAndBoundsGeometry {
        boundary: pts,
        arcs: edge_arcs,
        total_perimeter: perimeter,
        calculated_area_sq_ft: area,
        closure_error,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn default_courses_form_a_nearly_closed_boundary() {
        let geometry = compute_metes_and_bounds_geometry(&default_courses(), 0.0, 0.0);
        assert_eq!(geometry.boundary.len(), 4);
        assert!(geometry.closure_error < 0.1);
        assert!(geometry.calculated_area_sq_ft > 0.0);
        assert_relative_eq!(
            geometry.total_perimeter,
            178.64 + 82.79 + 189.40 + 16.99,
            epsilon = 1e-6
        );
    }

    #[test]
    fn empty_course_table_yields_a_single_point_and_zero_area() {
        let geometry = compute_metes_and_bounds_geometry(&[], 10.0, 20.0);
        assert_eq!(geometry.boundary, vec![Point::new(10.0, 20.0)]);
        assert_eq!(geometry.calculated_area_sq_ft, 0.0);
        assert_eq!(geometry.closure_error, 0.0);
    }
}
