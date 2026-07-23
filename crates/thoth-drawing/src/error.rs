//! Typed errors for `thoth-drawing`.
//!
//! The TypeScript original is loose about failure: unknown ids silently fall
//! back to a default (`dimensionStyle`, `drawingScale`, `sheetSize`), and a
//! few inputs that are actually malformed are simply trusted (`parseSheetNumber`
//! casts an arbitrary regex-matched letter to `DisciplineCode` without checking
//! it is one of the 21 known codes). This port preserves the *intentional*
//! fallback behavior verbatim (see the rustdoc on each such function), but
//! replaces the *unintentional* unsoundness with an explicit, typed error —
//! never a silent wrong answer and never a panic on caller-supplied data.
//!
//! Every fallible public function in this crate returns `Result<T, DrawingError>`.

use thiserror::Error;

use crate::drafting::DisciplineCode;

/// Errors produced while building or measuring drawing-production primitives.
#[derive(Debug, Error, PartialEq)]
pub enum DrawingError {
    /// A sheet number string did not match the NCS `AA-NNN` grammar, or its
    /// discipline letter is not one of the 21 designators in
    /// [`crate::drafting::DisciplineCode`]. The TS original blindly casts any
    /// regex-matched letter to `DisciplineCode`; this port validates it.
    #[error("malformed NCS sheet number {0:?}: {1}")]
    MalformedSheetNumber(String, &'static str),

    /// A named drawing scale resolved to a non-finite or non-positive
    /// paper-per-model ratio, so no coordinate could be projected.
    #[error("invalid drawing scale {scale_id:?}: model/paper ratio is {ratio}")]
    InvalidScale { scale_id: String, ratio: f64 },

    /// A hatch pattern's spacing was non-positive or non-finite. The TS
    /// generator (`hatchLines`) would loop forever stepping by a zero/negative
    /// spacing; this is an explicit, typed error instead.
    #[error("malformed hatch pattern {pattern_id:?}: spacing must be positive and finite, got {spacing}")]
    MalformedHatchPattern { pattern_id: String, spacing: f64 },

    /// A polygon passed to a hatch/fill routine had fewer than 3 vertices.
    #[error("degenerate polygon: hatching requires at least 3 vertices, got {0}")]
    DegeneratePolygon(usize),

    /// A schedule table's rows reference a column key that isn't declared in
    /// the table's column list — the TS renderer would silently print a blank
    /// cell (`row[c.key] ?? ""`); [`crate::schedule::ScheduleTable::validate`]
    /// makes that omission an explicit, checkable error instead of a silent
    /// blank cell in the exported sheet.
    #[error("schedule table {table_id:?} row {row_index} is missing column {column:?}")]
    MissingScheduleColumn {
        table_id: String,
        row_index: usize,
        column: String,
    },

    /// A part id was not found in the parts catalog/registry.
    #[error("unknown part id {0:?}")]
    UnknownPart(String),

    /// A `PartSpecification` was registered without a non-empty `id`.
    #[error("PartSpecification requires a non-empty id")]
    MissingPartId,

    // --- gap-analysis Theme 5 additions (crates/thoth-drawing/GAP_ANALYSIS_STATUS.md) ---
    /// A construction-staking point (`crate::staking::StakingPoint`) carried a
    /// non-finite station, offset, northing, or easting.
    #[error("staking point {index} has a non-finite {field}: {value}")]
    InvalidStakingPoint {
        index: usize,
        field: &'static str,
        value: f64,
    },

    /// A `crate::stamp::ProfessionalStamp` is missing a required field
    /// (signer name, license number, or date).
    #[error("invalid professional stamp: {reason}")]
    InvalidStamp { reason: &'static str },

    /// A sheet in a submitted [`crate::sheet::DrawingSet`] has no
    /// [`crate::stamp::StampAssignment`] covering it, per
    /// [`crate::stamp::validate_submittal_stamps`].
    #[error("sheet {sheet_id:?} ({discipline:?}) has no professional stamp assigned")]
    MissingDisciplineStamp {
        sheet_id: String,
        discipline: DisciplineCode,
    },

    /// A sheet's assigned stamp is for a different discipline than the
    /// sheet's own NCS discipline designator.
    #[error(
        "sheet {sheet_id:?} is discipline {sheet_discipline:?} but its stamp is for {stamp_discipline:?}"
    )]
    StampDisciplineMismatch {
        sheet_id: String,
        sheet_discipline: DisciplineCode,
        stamp_discipline: DisciplineCode,
    },

    /// A bond-estimate pay-item id (`crate::bond`) referenced by a schedule
    /// row was not found in the supplied unit-cost pay-item list.
    #[error("unknown pay item id {0:?} referenced by bond estimate schedule")]
    UnknownPayItem(String),

    /// A bond-estimate row's quantity cell could not be parsed as a finite
    /// number.
    #[error("schedule table {table_id:?} row {row_index} has a non-numeric quantity {value:?} in column {column:?}")]
    InvalidQuantity {
        table_id: String,
        row_index: usize,
        column: String,
        value: String,
    },

    /// A bond-estimate contingency percentage was negative or non-finite.
    #[error("invalid contingency percentage {0}: must be finite and >= 0")]
    InvalidContingencyPercent(f64),

    /// A grid (photometric illuminance grid, `crate::photometric`) was
    /// requested with fewer than 1 column or row.
    #[error("invalid grid dimensions: {cols} columns x {rows} rows")]
    InvalidGridDimensions { cols: usize, rows: usize },

    /// A grid's cell size was non-positive or non-finite.
    #[error("grid cell size must be positive and finite, got {0}")]
    NonPositiveCellSize(f64),

    /// A photometric point-light source's total lumen output was
    /// non-positive or non-finite.
    #[error("light source lumens must be positive and finite, got {0}")]
    NonPositiveLumens(f64),

    /// A photometric point-light source's mounting height above the
    /// calculation plane was non-positive or non-finite.
    #[error("light source mounting height must be positive and finite, got {0}")]
    NonPositiveMountingHeight(f64),

    /// A pavement-marking/signage centerline polyline had fewer than 2
    /// vertices, so no station/heading could be resolved along it.
    #[error("degenerate centerline: signage placement requires at least 2 vertices, got {0}")]
    DegenerateCenterline(usize),

    /// A pavement-marking/signage placement parameter (dash length, gap
    /// length, sign spacing) was non-positive or non-finite.
    #[error(
        "invalid signage/marking parameter {name:?}: must be positive and finite, got {value}"
    )]
    InvalidSignagePlanParameter { name: &'static str, value: f64 },

    /// A viewshed observer's eye height above the terrain was negative or
    /// non-finite.
    #[error("observer eye height must be finite and >= 0, got {0}")]
    InvalidObserverHeight(f64),

    /// A viewshed target's height above the terrain was negative or
    /// non-finite.
    #[error("target height must be finite and >= 0, got {0}")]
    InvalidTargetHeight(f64),

    /// A viewshed observer point fell outside the elevation grid's covered
    /// extent, so no line-of-sight sampling could be performed.
    #[error("observer position lies outside the elevation grid's extent")]
    ObserverOutsideElevationGrid,

    /// A traffic-noise input (volume, speed, or distance) was non-positive
    /// or non-finite.
    #[error("invalid traffic noise input {reason:?}: {value}")]
    InvalidTrafficNoiseInput { reason: &'static str, value: f64 },

    /// A traffic-noise calculation was requested with no vehicle streams.
    #[error("traffic noise calculation requires at least one vehicle stream")]
    NoTrafficStreams,
}
