//! The Georgia Land Lot System — the survey framework used across most of
//! Georgia (distributed by land lottery, not the federal PLSS). Land is
//! divided into numbered **Land Districts**, each subdivided into numbered
//! **Land Lots**. Depending on the lottery, a land lot is a fixed nominal
//! size; the 1820s lotteries (e.g. Newton County) used **202.5-acre** land
//! lots.
//!
//! A legal description reads "Land Lot 12 of the 9th Land District". Geometry
//! uses the platform convention: north is −Y, east is +X.
//!
//! Port of `packages/domain/src/planning/landlot.ts` +
//! `packages/domain/src/planning/types/landlot.ts`.
//!
//! **Gap notice** (see `GAPS.md`): the TS original's `landLotFrame` calls
//! `sectionFrame` from `packages/domain/src/survey/plss.ts` — that belongs to
//! `thoth-survey`, not this crate. [`section_frame`] below is a local copy of
//! that pure function (it has no dependency of its own beyond `Point`), kept
//! private to this module; the canonical, shared version should live in
//! `thoth-survey` once it exists.

use serde::{Deserialize, Serialize};
use thoth_spatial::{Point, Polygon};

/// Square feet in one acre.
pub const ACRE_SQFT: f64 = 43560.0;

/// Standard 1820s-lottery land lot size (Newton, Henry, Fayette, … counties).
pub const LAND_LOT_ACRES_202: f64 = 202.5;

/// A Land District / Land Lot reference.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LandLotRef {
    pub district: u32,
    pub land_lot: u32,
    /// Nominal land-lot acreage for this district's lottery (default 202.5).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acres: Option<f64>,
    /// Section suffix used in a few original surveys (e.g. "3rd Section").
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<u32>,
}

/// The corners/controlling points of a square survey unit given its NW corner
/// and side length (a local stand-in for `thoth-survey`'s `SectionFrame`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SectionFrame {
    pub nw: Point,
    pub ne: Point,
    pub sw: Point,
    pub se: Point,
    pub center: Point,
    /// Quarter-corner points on each edge (the section midpoints).
    pub north: Point,
    pub south: Point,
    pub east: Point,
    pub west: Point,
    /// Side length in plan units.
    pub side: f64,
}

/// The corners/controlling points of a square survey unit given its NW corner
/// and side length. See the module gap notice re: `thoth-survey`.
fn section_frame(nw_corner: Point, side: f64) -> SectionFrame {
    let Point { x, y } = nw_corner;
    SectionFrame {
        nw: Point::new(x, y),
        ne: Point::new(x + side, y),
        sw: Point::new(x, y + side),
        se: Point::new(x + side, y + side),
        center: Point::new(x + side / 2.0, y + side / 2.0),
        north: Point::new(x + side / 2.0, y),
        south: Point::new(x + side / 2.0, y + side),
        east: Point::new(x + side, y + side / 2.0),
        west: Point::new(x, y + side / 2.0),
        side,
    }
}

/// Side length (feet) of a square land lot of the given acreage.
pub fn land_lot_side(acres: f64) -> f64 {
    (acres * ACRE_SQFT).sqrt()
}

/// The corners/controlling points of a land lot, given its NW corner + acreage.
pub fn land_lot_frame(nw_corner: Point, acres: f64) -> SectionFrame {
    section_frame(nw_corner, land_lot_side(acres))
}

/// The land-lot square as a closed ring (NW, NE, SE, SW).
pub fn land_lot_rect(nw_corner: Point, acres: f64) -> Polygon {
    let s = land_lot_side(acres);
    let Point { x, y } = nw_corner;
    vec![
        Point::new(x, y),
        Point::new(x + s, y),
        Point::new(x + s, y + s),
        Point::new(x, y + s),
    ]
}

/// English ordinal for a positive integer (1 → "1st", 9 → "9th", 22 → "22nd").
pub fn ordinal(n: i64) -> String {
    let v = n.unsigned_abs();
    let tens = v % 100;
    if (11..=13).contains(&tens) {
        return format!("{n}th");
    }
    match v % 10 {
        1 => format!("{n}st"),
        2 => format!("{n}nd"),
        3 => format!("{n}rd"),
        _ => format!("{n}th"),
    }
}

/// Legal nomenclature, e.g. "Land Lot 12 of the 9th Land District".
pub fn format_land_lot(r: &LandLotRef) -> String {
    let sec = r
        .section
        .map(|s| format!(" of the {} Section", ordinal(s as i64)))
        .unwrap_or_default();
    format!(
        "Land Lot {} of the {} Land District{sec}",
        r.land_lot,
        ordinal(r.district as i64)
    )
}

/// Abbreviated form, e.g. "LL 12, 9th Dist.".
pub fn format_land_lot_short(r: &LandLotRef) -> String {
    format!("LL {}, {} Dist.", r.land_lot, ordinal(r.district as i64))
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn sizes_a_202_5_acre_land_lot() {
        assert_relative_eq!(
            land_lot_side(202.5),
            (202.5 * ACRE_SQFT).sqrt(),
            epsilon = 1e-6
        );
        assert_relative_eq!(land_lot_side(202.5), 2969.99, epsilon = 0.1);
        let ring = land_lot_rect(Point::new(0.0, 0.0), 202.5);
        assert_eq!(ring.len(), 4);
        assert_relative_eq!(ring[2].x, land_lot_side(202.5), epsilon = 1e-6);
    }

    #[test]
    fn formats_ordinals_and_land_lot_nomenclature() {
        assert_eq!(ordinal(1), "1st");
        assert_eq!(ordinal(2), "2nd");
        assert_eq!(ordinal(3), "3rd");
        assert_eq!(ordinal(9), "9th");
        assert_eq!(ordinal(11), "11th");
        assert_eq!(ordinal(22), "22nd");
        assert_eq!(
            format_land_lot(&LandLotRef {
                district: 9,
                land_lot: 12,
                acres: None,
                section: None
            }),
            "Land Lot 12 of the 9th Land District"
        );
        assert_eq!(
            format_land_lot_short(&LandLotRef {
                district: 9,
                land_lot: 12,
                acres: None,
                section: None
            }),
            "LL 12, 9th Dist."
        );
    }

    #[test]
    fn land_lot_frame_places_quarter_corners_correctly() {
        let frame = land_lot_frame(Point::new(0.0, 0.0), 202.5);
        let side = land_lot_side(202.5);
        assert_relative_eq!(frame.center.x, side / 2.0, epsilon = 1e-6);
        assert_relative_eq!(frame.center.y, side / 2.0, epsilon = 1e-6);
        assert_relative_eq!(frame.se.x, side, epsilon = 1e-6);
        assert_relative_eq!(frame.se.y, side, epsilon = 1e-6);
    }
}
