//! Shared low-level helpers used by every civil module: unit conversion and
//! station formatting, small vector helpers, polygon/point geometry helpers
//! with civil-specific degenerate-case handling, and a local [`LineSegment`].
//!
//! Port of `packages/domain/src/civil/common/*.ts`. The TS `Result<T, E>` +
//! `ok`/`err`/`CivilDomainError` trio (`common/result.ts`) is replaced
//! crate-wide by [`crate::error::CivilError`] and `Result<T, CivilError>` —
//! idiomatic Rust already has a sum-type `Result`, so no parallel type is
//! reintroduced here.

mod geometry_helpers;
mod line_segment;
mod units;
mod vector;

pub use geometry_helpers::{
    calculate_distance_and_bearing, calculate_polygon_area, calculate_polygon_centroid,
    DistanceAndBearing,
};
pub use line_segment::LineSegment;
pub use units::{format_station, to_meters, LengthSystem, DEGREE_OF_CURVE_CONST, FEET_TO_METERS};
pub use vector::{azimuth_of, left_normal, lerp, right_normal};
