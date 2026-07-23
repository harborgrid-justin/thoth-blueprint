//! A plain two-point line segment shared by the civil modules that draft
//! straight linework (match lines, parcel split lines, feature-line cleanup,
//! segment labels).
//!
//! The TS source for every one of these modules imports `LineSegment` from
//! `packages/domain/src/survey/transparentCommands`, which is `thoth-survey`'s
//! crate, not `thoth-civil`'s (see `crates/thoth-civil/GAPS.md` #1). `thoth-civil`
//! must not depend on `thoth-survey` (see the crate's `STATUS.md`), so this
//! module defines a structurally identical local type instead of importing
//! one — exactly the same move `thoth-survey` itself made for `Point2D`
//! (`pub type Point2D = thoth_spatial::Point`; see
//! `crates/thoth-survey/src/transparent_commands.rs`). A future pass that
//! wires `thoth-civil` and `thoth-survey` together at a shared boundary could
//! collapse the two into one type; until then this is a plain, dependency-free
//! `{start, end}` pair with no behavior of its own beyond what
//! `thoth_spatial::Point` already provides for each endpoint.

use thoth_spatial::Point;

/// A straight line segment between two plan-space points.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LineSegment {
    pub start: Point,
    pub end: Point,
}

impl LineSegment {
    pub const fn new(start: Point, end: Point) -> Self {
        LineSegment { start, end }
    }

    /// Euclidean length of the segment.
    pub fn length(&self) -> f64 {
        thoth_spatial::distance(self.start, self.end)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn length_of_3_4_5_segment() {
        let seg = LineSegment::new(Point::ZERO, Point::new(3.0, 4.0));
        assert_eq!(seg.length(), 5.0);
    }
}
