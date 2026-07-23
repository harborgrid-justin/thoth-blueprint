//! `thoth-survey` — the surveying and legal-description engine for Thoth
//! Blueprint.
//!
//! Rust port of `packages/domain/src/survey/**`. Framework-agnostic: no
//! WASM/FFI glue, no I/O, no UI. Builds on [`thoth_spatial`] (`Point`,
//! `Polygon`, `SpatialContext`, `EdgeArcs`, …) for the shared geometric
//! contract every Thoth crate speaks; see `thoth_spatial`'s own module docs.
//!
//! # Scope (mirrors the TS module split)
//!
//! - [`bearing`] — `common/bearing.ts`: azimuths, quadrant bearings, DMS.
//! - [`curve`] — a **local port** of `spatial/curve.ts` (bulge-encoded
//!   circular arcs); see `GAPS.md` for why this lives here rather than in
//!   `thoth-spatial`.
//! - [`survey`] — `survey.ts`: metes-and-bounds courses, traverse closure,
//!   legal descriptions, bearing parsing, and traverse adjustment.
//! - [`plss`] — `plss.ts`: Township/Range/Section framework and aliquot parts.
//! - [`monument`] — `monument.ts`: survey monument symbology.
//! - [`controls`] — `controls.ts`: civil/erosion-control line features and symbols.
//! - [`description_keys`] — `descriptionKeys.ts`: raw-description-to-symbology mapping.
//! - [`points`] — `points.ts`: COGO point import and point groups.
//! - [`transparent_commands`] — `transparentCommands.ts`: the COGO transparent-command vocabulary.
//! - [`advanced_linework`] — `advancedLinework.ts`: line-creation and R.O.W. tools.
//! - [`helpers`] — the four self-contained bridge helpers this crate can
//!   port without depending on `thoth-civil`/`thoth-planning`/`thoth-drawing`
//!   (see that module's docs, and `STATUS.md`, for the other ten).
//! - [`error`] — [`SurveyError`], this crate's single `thiserror` error enum.
//!
//! See `GAPS.md` for what's missing from `thoth-spatial` and worked around
//! locally, and `STATUS.md` for a file-by-file TS→Rust coverage table.

pub mod advanced_linework;
pub mod bearing;
pub mod controls;
pub mod curve;
pub mod description_keys;
pub mod error;
mod fmt_utils;
pub mod helpers;
pub mod monument;
pub mod plss;
pub mod points;
pub mod survey;
pub mod transparent_commands;

pub use error::SurveyError;

/// How [`format_direction`] should render a direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AngleFormat {
    /// Surveyor quadrant bearing, e.g. `N45°30′15″E`.
    Dms,
    /// Decimal-degree azimuth clockwise from north, e.g. `"45.5°"`.
    Dd,
}

/// Format the direction from `a` to `b` as either a surveyor quadrant
/// bearing or a decimal-degree azimuth clockwise from north.
///
/// This is the Rust home for `packages/domain/src/spatial/units.ts`'s
/// `formatDirection`, re-homed here (rather than in `thoth-spatial`)
/// because it depends on [`bearing::azimuth`]/[`bearing::azimuth_to_bearing`]/
/// [`bearing::format_bearing`] — a real `spatial`-depends-on-`survey`
/// dependency direction in the original that would otherwise force
/// `thoth-spatial` to depend on this higher-level crate. Downstream
/// crates/bindings that need the display-layer formatting `units.ts`
/// exposed can call this instead.
pub fn format_direction(a: thoth_spatial::Point, b: thoth_spatial::Point, format: AngleFormat) -> String {
    let az = bearing::azimuth(a, b);
    match format {
        AngleFormat::Dd => format!("{az:.1}°"),
        AngleFormat::Dms => bearing::format_bearing(&bearing::azimuth_to_bearing(az)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_spatial::Point;

    #[test]
    fn format_direction_matches_dms_and_dd_forms() {
        let a = Point::new(0.0, 0.0);
        let b = Point::new(10.0, -10.0);
        assert_eq!(format_direction(a, b, AngleFormat::Dms), "N45°00′00″E");
        assert_eq!(format_direction(a, b, AngleFormat::Dd), "45.0°");
    }
}
