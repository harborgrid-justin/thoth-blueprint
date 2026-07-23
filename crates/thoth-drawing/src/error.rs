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
}
