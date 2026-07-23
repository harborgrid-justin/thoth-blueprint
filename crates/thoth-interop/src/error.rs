//! The typed error surface for every format importer/exporter in this crate.
//!
//! Following the convention set by `thoth_civil::CivilError`: one
//! `thiserror` enum for the whole crate rather than one per module, so
//! callers match on a single type regardless of which format they're
//! working with. Every variant identifies *which* format failed and *where*
//! (a byte offset for binary/XML formats, a 1-based line number for
//! line-oriented text formats) — malformed external input is the normal case
//! for an interop parser, never a panic.

use thiserror::Error;

/// Every way a format import/export in this crate can fail on caller-supplied
/// data. Never constructed for a legitimate "no result" (e.g. zero points to
/// classify) — those stay as empty `Vec`s/`Option::None`, matching the rest
/// of the workspace's error-vs-absence convention.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum InteropError {
    /// A byte-oriented (binary or XML) format was structurally invalid.
    #[error("malformed {format} data at byte {offset}: {reason}")]
    Malformed {
        format: &'static str,
        offset: usize,
        reason: String,
    },

    /// A line-oriented text format (RINEX, RW5, ...) had an invalid record.
    #[error("malformed {format} data at line {line}: {reason}")]
    MalformedLine {
        format: &'static str,
        line: usize,
        reason: String,
    },

    /// The input used a real, recognized feature of the format that this
    /// importer/exporter intentionally does not support (see the module's
    /// scope doc comment for the exact sub-dialect covered).
    #[error("unsupported {format} feature: {reason}")]
    Unsupported {
        format: &'static str,
        reason: String,
    },

    /// An XML document (LandXML, KML) failed to parse as well-formed XML.
    #[error("{format} XML error at byte {offset}: {reason}")]
    Xml {
        format: &'static str,
        offset: usize,
        reason: String,
    },

    /// A required element/attribute was missing from an otherwise
    /// well-formed document.
    #[error("{format} is missing required {what} (at/near byte {offset})")]
    MissingField {
        format: &'static str,
        what: String,
        offset: usize,
    },

    /// Geometry supplied to (or produced by) an import/export was invalid
    /// for the operation (degenerate ring, non-finite coordinate, mismatched
    /// index, ...).
    #[error("invalid geometry: {0}")]
    Geometry(String),

    /// A record referenced an index/id/point number that doesn't exist in
    /// the rest of the document (e.g. a LandXML `<Faces>` triangle citing a
    /// point index past the end of `<Pnts>`).
    #[error("{format} record references unknown {what} '{id}'")]
    UnknownReference {
        format: &'static str,
        what: &'static str,
        id: String,
    },

    /// A count field (declared record/point/vertex count) didn't match the
    /// number of records actually present.
    #[error("{format} declared {expected} {what}, found {actual}")]
    CountMismatch {
        format: &'static str,
        what: &'static str,
        expected: usize,
        actual: usize,
    },

    /// An iterative solver (network adjustment, ground-classification
    /// filter) failed to converge within its iteration budget.
    #[error("{solver} did not converge within {iterations} iterations (final max correction {max_correction:.6})")]
    ConvergenceFailure {
        solver: &'static str,
        iterations: u32,
        max_correction: f64,
    },

    /// A least-squares network is under-determined: fewer independent
    /// observations than unknowns, so no unique adjustment exists.
    #[error(
        "network is under-determined: {unknowns} unknowns but only {observations} observations"
    )]
    UnderDetermined {
        unknowns: usize,
        observations: usize,
    },
}

/// Convenience alias used throughout this crate.
pub type InteropResult<T> = Result<T, InteropError>;
