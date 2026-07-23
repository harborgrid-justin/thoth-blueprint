//! Error type for `@thoth/service-geospatial`.

use thiserror::Error;

/// Everything that can go wrong transforming coordinates or translating
/// interop formats.
#[derive(Debug, Error, Clone, PartialEq)]
pub enum GeospatialError {
    /// A coordinate component was NaN or infinite — never a valid plan-space
    /// or geographic value, and not something any projection formula can be
    /// trusted to produce a meaningful result from.
    #[error("malformed coordinate input: ({x}, {y}) is not finite")]
    NonFiniteCoordinate { x: f64, y: f64 },

    /// A GeoJSON ring/line had too few vertices to form the requested
    /// geometry (a polygon ring needs >= 3 distinct vertices, a line needs
    /// >= 2).
    #[error("malformed geometry: {0}")]
    MalformedGeometry(String),
}
