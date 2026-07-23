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

    /// A parcel id was looked up within a [`crate::site_and_parcels::SiteContainer`]
    /// that has no parcel with that id.
    #[error("parcel '{parcel_id}' not found")]
    UnknownParcel { parcel_id: String },

    /// A station range needs its start strictly before its end (view frame
    /// groups, inserted view frames).
    #[error(
        "invalid station range: start station ({start}) must be less than end station ({end})"
    )]
    InvalidStationRange { start: f64, end: f64 },

    /// A [`crate::view_frames_and_match_lines::ViewportDimensions`]'s width,
    /// height, and scale factor must all be positive.
    #[error("invalid viewport dimensions: width ({width_ft}), height ({height_ft}), and scale factor ({scale_factor}) must all be positive")]
    InvalidViewportDimensions {
        width_ft: f64,
        height_ft: f64,
        scale_factor: f64,
    },

    /// REQ-090: two feature-line vertices share an XY coordinate (within
    /// tolerance) but disagree on elevation — the single-elevation topology
    /// rule for a [`crate::feature_lines_and_grading::FeatureLine`] site.
    #[error("single-elevation topology violation at ({x}, {y}): existing elevation {existing_z} conflicts with new elevation {new_z}")]
    SingleElevationViolation {
        x: f64,
        y: f64,
        existing_z: f64,
        new_z: f64,
    },

    /// A [`crate::feature_lines_and_grading::FeatureLine`] needs more than 2
    /// vertices to have one removed (it must stay a real line).
    #[error("feature line must have more than 2 vertices to delete one, got {count}")]
    DegenerateFeatureLine { count: usize },

    /// A feature-line vertex index falls outside its point list.
    #[error("vertex index {index} is out of bounds for a feature line with {count} vertices")]
    VertexIndexOutOfBounds { index: usize, count: usize },

    /// A workflow precondition wasn't met: a business-rule gate (not a
    /// numeric or geometric one) blocked the requested operation — e.g.
    /// generating section sheets without a section-type layout viewport, or
    /// editing a locked static table.
    #[error("prerequisite violation: {reason}")]
    PrerequisiteViolation { reason: String },

    /// REQ-161: a Cloud Model Builder area exceeds its maximum supported
    /// footprint.
    #[error("area ({area_sq_km} sq km) exceeds the maximum supported limit of {max_sq_km} sq km")]
    AreaLimitExceeded { area_sq_km: f64, max_sq_km: f64 },

    /// REQ-099/REQ-163: an aerial-imagery or raster tile level falls outside
    /// the supported zoom range (1 to 19).
    #[error("tile level {tile_level} is out of the supported range (1 to 19)")]
    TileLevelOutOfRange { tile_level: i32 },
}

/// Convenience alias used throughout this crate.
pub type CivilResult<T> = Result<T, CivilError>;
