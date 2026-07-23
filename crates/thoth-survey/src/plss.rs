//! Public Land Survey System (PLSS) — the rectangular survey framework U.S.
//! plats are tied to (Township / Range / Section and their aliquot parts,
//! e.g. "the NW1/4 of the SE1/4 of Section 8, Township 3 South, Range 16
//! East"). Direct port of `packages/domain/src/survey/plss.ts` and
//! `types/plss.ts`.
//!
//! A section is nominally one square mile (5280 ft) = 640 acres; it
//! subdivides by repeated quartering (160, 40, 10 acres …). This module
//! models that framework, computes aliquot-part geometry and nominal
//! areas, and formats the legal nomenclature. Geometry uses the platform
//! convention: north is −Y, east is +X.

use serde::{Deserialize, Serialize};
use thoth_spatial::{Point, Polygon};

use crate::error::SurveyError;

/// Nominal U.S. section side, feet (one mile).
pub const SECTION_FEET: f64 = 5280.0;
/// Nominal section area, acres.
pub const SECTION_ACRES: f64 = 640.0;

/// A quarter within a section or aliquot part.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Quarter {
    Nw,
    Ne,
    Sw,
    Se,
}

/// Halves used for half-aliquots (e.g. the N1/2). Ported for parity with
/// the TS type; no function in this module currently consumes it (matching
/// the TS original, where `Half` is likewise declared but unused within
/// `plss.ts` itself).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Half {
    N,
    S,
    E,
    W,
}

/// North/south direction of a township's position relative to the base line.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TownshipDirection {
    North,
    South,
}

impl TownshipDirection {
    fn as_word(self) -> &'static str {
        match self {
            TownshipDirection::North => "North",
            TownshipDirection::South => "South",
        }
    }

    fn initial(self) -> &'static str {
        match self {
            TownshipDirection::North => "N",
            TownshipDirection::South => "S",
        }
    }
}

/// East/west direction of a range's position relative to the principal meridian.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RangeDirection {
    East,
    West,
}

impl RangeDirection {
    fn as_word(self) -> &'static str {
        match self {
            RangeDirection::East => "East",
            RangeDirection::West => "West",
        }
    }

    fn initial(self) -> &'static str {
        match self {
            RangeDirection::East => "E",
            RangeDirection::West => "W",
        }
    }
}

/// A Township & Range designation (optionally naming the principal meridian).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TownshipRange {
    pub township: i32,
    pub township_dir: TownshipDirection,
    pub range: i32,
    pub range_dir: RangeDirection,
    /// Principal meridian, e.g. `"Tallahassee"` (optional).
    pub meridian: Option<String>,
}

impl TownshipRange {
    /// Construct a validated township/range: both `township` and `range`
    /// must be `>= 1` (PLSS numbering has no township or range zero). This
    /// is an addition beyond the TS original (which builds `TownshipRange`
    /// as a plain object literal with no validation at all) — the engine
    /// otherwise happily formats and geometrizes an "impossible" township
    /// like `-4`, so a validated constructor is offered for callers that
    /// want the extra rigor; the plain struct literal remains constructible
    /// directly for exact TS parity.
    pub fn try_new(
        township: i32,
        township_dir: TownshipDirection,
        range: i32,
        range_dir: RangeDirection,
        meridian: Option<String>,
    ) -> Result<Self, SurveyError> {
        validate_township(township)?;
        validate_range(range)?;
        Ok(Self {
            township,
            township_dir,
            range,
            range_dir,
            meridian,
        })
    }
}

/// Validate a PLSS township number (`>= 1`).
pub fn validate_township(township: i32) -> Result<(), SurveyError> {
    if township < 1 {
        Err(SurveyError::InvalidTownship(township))
    } else {
        Ok(())
    }
}

/// Validate a PLSS range number (`>= 1`).
pub fn validate_range(range: i32) -> Result<(), SurveyError> {
    if range < 1 {
        Err(SurveyError::InvalidRange(range))
    } else {
        Ok(())
    }
}

/// Validate a PLSS section number (`1..=36`; a township grid has no
/// section 0 or 37 — see the "section 0/37" tests below).
pub fn validate_section(section: i32) -> Result<(), SurveyError> {
    if (1..=36).contains(&section) {
        Ok(())
    } else {
        Err(SurveyError::InvalidSection(section))
    }
}

/// The corners and controlling points of a section (or any square aliquot).
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

/// Build a square frame from its **northwest** corner and side length. With
/// north = −Y, the north edge has the smaller Y and the south edge the
/// larger Y.
pub fn section_frame(nw_corner: Point, side: f64) -> SectionFrame {
    let (x, y) = (nw_corner.x, nw_corner.y);
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

/// The NW corner and side of one quarter of a square given by its NW corner.
fn quarter_origin(nw_corner: Point, side: f64, q: Quarter) -> (Point, f64) {
    let half = side / 2.0;
    let (x, y) = (nw_corner.x, nw_corner.y);
    match q {
        Quarter::Nw => (Point::new(x, y), half),
        Quarter::Ne => (Point::new(x + half, y), half),
        Quarter::Sw => (Point::new(x, y + half), half),
        Quarter::Se => (Point::new(x + half, y + half), half),
    }
}

/// The polygon of an aliquot part, given the enclosing square's NW corner
/// and side. `path` reads outer→inner: `[Se, Nw]` is "the NW1/4 of the
/// SE1/4". Returned as a closed ring (NW, NE, SE, SW) in plan coordinates.
pub fn aliquot_rect(nw_corner: Point, side: f64, path: &[Quarter]) -> Polygon {
    let mut origin = nw_corner;
    let mut s = side;
    for &q in path {
        let (next_origin, next_side) = quarter_origin(origin, s, q);
        origin = next_origin;
        s = next_side;
    }
    vec![
        Point::new(origin.x, origin.y),
        Point::new(origin.x + s, origin.y),
        Point::new(origin.x + s, origin.y + s),
        Point::new(origin.x, origin.y + s),
    ]
}

/// Nominal acreage of an aliquot part: 640 acres divided by 4 per quartering.
pub fn nominal_aliquot_acres(path: &[Quarter]) -> f64 {
    SECTION_ACRES / 4f64.powi(path.len() as i32)
}

fn quarter_label(q: Quarter) -> &'static str {
    match q {
        Quarter::Nw => "NW",
        Quarter::Ne => "NE",
        Quarter::Sw => "SW",
        Quarter::Se => "SE",
    }
}

/// Format an aliquot path as "NW1/4 of the SE1/4 of the …".
pub fn format_aliquot(path: &[Quarter]) -> String {
    if path.is_empty() {
        return "all".to_string();
    }
    // The path is outer→inner; the description reads inner→outer.
    let parts: Vec<String> = path
        .iter()
        .rev()
        .map(|&q| format!("{}1/4", quarter_label(q)))
        .collect();
    format!("the {}", parts.join(" of the "))
}

/// Abbreviated Township/Range, e.g. `"T3S, R16E"`.
pub fn format_township_range_short(tr: &TownshipRange) -> String {
    format!(
        "T{}{}, R{}{}",
        tr.township,
        tr.township_dir.initial(),
        tr.range,
        tr.range_dir.initial()
    )
}

/// Full Township/Range, e.g. `"Township 3 South, Range 16 East"`.
pub fn format_township_range(tr: &TownshipRange) -> String {
    format!(
        "Township {} {}, Range {} {}",
        tr.township,
        tr.township_dir.as_word(),
        tr.range,
        tr.range_dir.as_word()
    )
}

/// Full PLSS reference for a bare section, e.g. "Section 8, Township 3
/// South, Range 16 East". The Rust replacement for the TS `formatPLSS`
/// overload that omits the aliquot path — see [`format_plss_aliquot`] for
/// the other overload.
pub fn format_plss(section: i32, tr: &TownshipRange) -> String {
    let mer = tr
        .meridian
        .as_ref()
        .map(|m| format!(", {m} Meridian"))
        .unwrap_or_default();
    format!("Section {section}, {}{mer}", format_township_range(tr))
}

/// Full PLSS reference including an aliquot path, e.g. "the NW1/4 of the
/// SE1/4 of Section 8, Township 3 South, Range 16 East". The Rust
/// replacement for the TS `formatPLSS(path, section, tr)` overload.
pub fn format_plss_aliquot(path: &[Quarter], section: i32, tr: &TownshipRange) -> String {
    let mer = tr
        .meridian
        .as_ref()
        .map(|m| format!(", {m} Meridian"))
        .unwrap_or_default();
    let aliq = if path.is_empty() {
        String::new()
    } else {
        format!("{} of ", format_aliquot(path))
    };
    format!(
        "{aliq}Section {section}, {}{mer}",
        format_township_range(tr)
    )
}

/// Abbreviated PLSS reference, e.g. "Sec 8, T3S, R16E". The Rust
/// replacement for the TS `formatPLSSShort` overload that omits the
/// aliquot path.
pub fn format_plss_short(section: i32, tr: &TownshipRange) -> String {
    format!("Sec {section}, {}", format_township_range_short(tr))
}

/// Abbreviated PLSS reference including an aliquot path, e.g. "NW1/4 SE1/4
/// Sec 8, T3S, R16E". The Rust replacement for the TS `formatPLSSShort(path,
/// section, tr)` overload.
pub fn format_plss_short_aliquot(path: &[Quarter], section: i32, tr: &TownshipRange) -> String {
    let aliq = if path.is_empty() {
        String::new()
    } else {
        let parts: Vec<&str> = path.iter().rev().map(|&q| quarter_label_1_4(q)).collect();
        format!("{} ", parts.join(" "))
    };
    format!("{aliq}Sec {section}, {}", format_township_range_short(tr))
}

fn quarter_label_1_4(q: Quarter) -> &'static str {
    match q {
        Quarter::Nw => "NW1/4",
        Quarter::Ne => "NE1/4",
        Quarter::Sw => "SW1/4",
        Quarter::Se => "SE1/4",
    }
}

/// The named corners/quarter-corners of a section, for [`section_corner_name`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SectionCorner {
    Nw,
    Ne,
    Sw,
    Se,
    North,
    South,
    East,
    West,
}

/// The standard corner name for a section corner or quarter corner, e.g.
/// `"NW corner of Sec 8"` or `"N1/4 corner of Sec 8"`.
pub fn section_corner_name(section: i32, corner: SectionCorner) -> String {
    let label = match corner {
        SectionCorner::Nw => "NW corner",
        SectionCorner::Ne => "NE corner",
        SectionCorner::Sw => "SW corner",
        SectionCorner::Se => "SE corner",
        SectionCorner::North => "N1/4 corner",
        SectionCorner::South => "S1/4 corner",
        SectionCorner::East => "E1/4 corner",
        SectionCorner::West => "W1/4 corner",
    };
    format!("{label} of Sec {section}")
}

/// A section's 0-based column/row position within its 6×6 township grid,
/// with `(0, 0)` at the NW corner.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SectionColRow {
    pub col: u32,
    pub row: u32,
}

/// Section numbering within a township grid (0-based col/row from the NW
/// corner) following the standard boustrophedon: Section 1 is the NE
/// corner, numbering runs west across the top tier, then serpentines down
/// to Section 36 in the SE. Returns `None` for a section number outside
/// `1..=36` (there is no section 0 or 37 — see also [`validate_section`]
/// for a `Result`-returning alternative).
pub fn section_col_row(section: i32) -> Option<SectionColRow> {
    if !(1..=36).contains(&section) {
        return None;
    }
    let section = section - 1;
    let row = (section / 6) as u32; // 0 = north tier
    let within = (section % 6) as u32;
    // Odd tiers (row 0,2,4) number east->west; even tiers (row 1,3,5) west->east.
    let col = if row % 2 == 0 { 5 - within } else { within };
    Some(SectionColRow { col, row })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use thoth_spatial::area as polygon_area;

    // A section with its NW corner at the origin; north is -Y, so the SW
    // corner is at +Y. Use a 4-unit side for easy quartering.
    const NW: Point = Point::new(0.0, 0.0);
    const SIDE: f64 = 4.0;

    #[test]
    fn locates_corners_with_north_as_minus_y() {
        let f = section_frame(NW, SIDE);
        assert_eq!(f.ne, Point::new(4.0, 0.0));
        assert_eq!(f.sw, Point::new(0.0, 4.0));
        assert_eq!(f.se, Point::new(4.0, 4.0));
        assert_eq!(f.center, Point::new(2.0, 2.0));
        assert_eq!(f.south, Point::new(2.0, 4.0));
    }

    #[test]
    fn returns_the_correct_quarter_rectangles() {
        // NE1/4: east half (+x), north half (-y).
        assert_eq!(
            aliquot_rect(NW, SIDE, &[Quarter::Ne]),
            vec![
                Point::new(2.0, 0.0),
                Point::new(4.0, 0.0),
                Point::new(4.0, 2.0),
                Point::new(2.0, 2.0),
            ]
        );
        // SW1/4: west half, south half (+y).
        assert_eq!(
            aliquot_rect(NW, SIDE, &[Quarter::Sw]),
            vec![
                Point::new(0.0, 2.0),
                Point::new(2.0, 2.0),
                Point::new(2.0, 4.0),
                Point::new(0.0, 4.0),
            ]
        );
    }

    #[test]
    fn nests_outer_to_inner_nw_1_4_of_the_se_1_4() {
        // SE1/4 spans x in [2,4], y in [2,4]; its NW1/4 is x in [2,3], y in [2,3].
        let ring = aliquot_rect(NW, SIDE, &[Quarter::Se, Quarter::Nw]);
        assert_eq!(ring[0], Point::new(2.0, 2.0));
        assert_eq!(ring[2], Point::new(3.0, 3.0));
        assert_relative_eq!(polygon_area(&ring), 1.0, epsilon = 1e-9); // (4*4)/16
    }

    #[test]
    fn halves_by_quartering_from_640_acres() {
        assert_eq!(nominal_aliquot_acres(&[]), 640.0);
        assert_eq!(nominal_aliquot_acres(&[Quarter::Ne]), 160.0);
        assert_eq!(nominal_aliquot_acres(&[Quarter::Se, Quarter::Nw]), 40.0);
        assert_eq!(
            nominal_aliquot_acres(&[Quarter::Se, Quarter::Nw, Quarter::Sw]),
            10.0
        );
    }

    fn sample_tr() -> TownshipRange {
        TownshipRange {
            township: 3,
            township_dir: TownshipDirection::South,
            range: 16,
            range_dir: RangeDirection::East,
            meridian: Some("Tallahassee".to_string()),
        }
    }

    #[test]
    fn formats_aliquot_parts_outer_to_inner() {
        assert_eq!(
            format_aliquot(&[Quarter::Se, Quarter::Nw]),
            "the NW1/4 of the SE1/4"
        );
        assert_eq!(format_aliquot(&[Quarter::Ne]), "the NE1/4");
    }

    #[test]
    fn formats_standard_legal_descriptions() {
        let text = format_plss_aliquot(&[Quarter::Se, Quarter::Nw], 8, &sample_tr());
        assert_eq!(
            text,
            "the NW1/4 of the SE1/4 of Section 8, Township 3 South, Range 16 East, Tallahassee Meridian"
        );
    }

    #[test]
    fn formats_short_plss_designations() {
        assert_eq!(
            format_plss_short_aliquot(&[Quarter::Se, Quarter::Nw], 8, &sample_tr()),
            "NW1/4 SE1/4 Sec 8, T3S, R16E"
        );
    }

    #[test]
    fn formats_bare_section_without_aliquot() {
        assert_eq!(
            format_plss(8, &sample_tr()),
            "Section 8, Township 3 South, Range 16 East, Tallahassee Meridian"
        );
        assert_eq!(format_plss_short(8, &sample_tr()), "Sec 8, T3S, R16E");
    }

    #[test]
    fn numbers_36_sections_in_serpentine_order() {
        // Sec 1 top right, Sec 6 top left, Sec 7 below 6, Sec 12 below 1, Sec 36 bottom right.
        assert_eq!(section_col_row(1), Some(SectionColRow { col: 5, row: 0 }));
        assert_eq!(section_col_row(6), Some(SectionColRow { col: 0, row: 0 }));
        assert_eq!(section_col_row(7), Some(SectionColRow { col: 0, row: 1 }));
        assert_eq!(section_col_row(12), Some(SectionColRow { col: 5, row: 1 }));
        assert_eq!(section_col_row(36), Some(SectionColRow { col: 5, row: 5 }));
    }

    #[test]
    fn section_0_and_37_are_out_of_range() {
        assert_eq!(section_col_row(0), None);
        assert_eq!(section_col_row(37), None);
        assert!(validate_section(0).is_err());
        assert!(validate_section(37).is_err());
        assert!(validate_section(1).is_ok());
        assert!(validate_section(36).is_ok());
    }

    #[test]
    fn names_corner_monuments() {
        assert_eq!(section_corner_name(8, SectionCorner::Nw), "NW corner of Sec 8");
        assert_eq!(
            section_corner_name(8, SectionCorner::North),
            "N1/4 corner of Sec 8"
        );
    }

    #[test]
    fn validated_township_range_rejects_non_positive_values() {
        assert!(TownshipRange::try_new(0, TownshipDirection::South, 16, RangeDirection::East, None).is_err());
        assert!(TownshipRange::try_new(3, TownshipDirection::South, 0, RangeDirection::East, None).is_err());
        assert!(TownshipRange::try_new(3, TownshipDirection::South, 16, RangeDirection::East, None).is_ok());
        assert_eq!(validate_township(-4), Err(SurveyError::InvalidTownship(-4)));
    }
}
