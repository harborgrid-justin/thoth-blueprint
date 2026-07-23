//! The typed error surface for every civil-engineering computation in this
//! crate. Port of `packages/domain/src/civil/common/result.ts`'s
//! `CivilDomainError`, expanded into a proper `thiserror` enum so each failure
//! mode is matchable instead of stringly-typed.
//!
//! The TypeScript original is casual about invalid input: many functions
//! return `null` for "no result" (an out-of-range station, an ungradeable
//! polygon) and a few silently produce meaningless numbers (e.g. a zero-size
//! grid). Direct callers of civil engineering math deserve better: this crate
//! distinguishes a **valid empty result** (kept as `Option<T>`, matching the
//! TS `null`) from a **caller error** (returned as `Err(CivilError)`) —
//! degenerate input that no reasonable civil-engineering tool should silently
//! swallow.

use thiserror::Error;

/// Every way a civil-engineering computation in this crate can fail on
/// caller-supplied input. Never constructed for "normal" absence of a result
/// (e.g. a station outside an alignment's range uses `Option`, not this).
#[derive(Debug, Clone, PartialEq, Error)]
pub enum CivilError {
    /// A [`crate::alignment::HorizontalAlignment`] needs at least a POB and a
    /// POE (2 PIs) to resolve a centerline.
    #[error("alignment must have at least 2 PIs to resolve a centerline, got {count}")]
    DegenerateAlignment { count: usize },

    /// A queried station falls outside the resolved alignment's stationing.
    #[error("station {station} is outside the alignment's range [{start}, {end}]")]
    StationOutOfRange { station: f64, start: f64, end: f64 },

    /// An [`crate::terrain::ElevationGrid`] needs at least 2 nodes on each
    /// axis to define a bilinear cell.
    #[error("elevation grid must be at least 2x2 nodes, got {cols}x{rows}")]
    DegenerateGrid { cols: usize, rows: usize },

    /// A grid's node spacing must be a positive distance.
    #[error("grid cell size must be positive, got {cell_size}")]
    InvalidCellSize { cell_size: f64 },

    /// A queried world point falls outside the data envelope a grid or
    /// point-cloud actually covers (no extrapolation is performed).
    #[error("point ({x}, {y}) lies outside the surface's data envelope {envelope}")]
    OutsideDataEnvelope { x: f64, y: f64, envelope: String },

    /// A ring needs at least 3 vertices to bound an area.
    #[error("polygon must have at least 3 vertices, got {count}")]
    DegeneratePolygon { count: usize },

    /// A contour/grading/interpolation interval or cell size must be
    /// strictly positive.
    #[error("interval must be positive, got {value}")]
    NonPositiveInterval { value: f64 },

    /// A cut or fill daylight slope ratio (H:V) must be a positive run.
    #[error("slope ratio must be positive, got {slope}")]
    InvalidSlope { slope: f64 },

    /// A network edge references a node id that isn't present in the
    /// network's node list.
    #[error("network edge '{edge_id}' references unknown node '{node_id}'")]
    UnknownNode { edge_id: String, node_id: String },

    /// A point-cloud or terrain source file/buffer is structurally invalid
    /// for the format being parsed.
    #[error("malformed {format} data: {reason}")]
    MalformedData {
        format: &'static str,
        reason: String,
    },

    /// An iterative solver (e.g. balanced-elevation search) failed to
    /// converge within its iteration budget.
    #[error("{solver} did not converge within {iterations} iterations")]
    ConvergenceFailure {
        solver: &'static str,
        iterations: u32,
    },

    /// A vertical or horizontal curve's parameters are geometrically
    /// impossible (e.g. a curve tangent longer than the tangent it sits on).
    #[error("impossible curve geometry: {reason}")]
    ImpossibleGeometry { reason: String },
}

/// Convenience alias used throughout this crate.
pub type CivilResult<T> = Result<T, CivilError>;
