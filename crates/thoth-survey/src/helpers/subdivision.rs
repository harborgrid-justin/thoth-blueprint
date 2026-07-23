//! Subdivision layout helpers. Direct port of
//! `packages/domain/src/survey/helpers/subdivisionHelpers.ts`.

use thoth_spatial::{distance, Point};

/// The longest edge of `boundary`, as its two endpoints — the conventional
/// choice of "frontage" edge for parcel subdivision layout. Falls back to a
/// nominal 100-unit segment along the x-axis when `boundary` has fewer than
/// 2 points (nothing to measure).
pub fn find_longest_frontage(boundary: &[Point]) -> (Point, Point) {
    if boundary.len() < 2 {
        return (Point::new(0.0, 0.0), Point::new(100.0, 0.0));
    }
    let n = boundary.len();
    let mut max_len = 0.0;
    let mut frontage = (boundary[0], boundary[1]);
    for i in 0..n {
        let p1 = boundary[i];
        let p2 = boundary[(i + 1) % n];
        let len = distance(p1, p2);
        if len > max_len {
            max_len = len;
            frontage = (p1, p2);
        }
    }
    frontage
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_the_longest_edge_of_a_rectangle() {
        let rect = vec![
            Point::new(0.0, 0.0),
            Point::new(200.0, 0.0),
            Point::new(200.0, 50.0),
            Point::new(0.0, 50.0),
        ];
        assert_eq!(
            find_longest_frontage(&rect),
            (Point::new(0.0, 0.0), Point::new(200.0, 0.0))
        );
    }

    #[test]
    fn falls_back_to_a_nominal_segment_for_degenerate_input() {
        assert_eq!(
            find_longest_frontage(&[]),
            (Point::new(0.0, 0.0), Point::new(100.0, 0.0))
        );
        assert_eq!(
            find_longest_frontage(&[Point::new(5.0, 5.0)]),
            (Point::new(0.0, 0.0), Point::new(100.0, 0.0))
        );
    }
}
