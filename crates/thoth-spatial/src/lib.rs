//! `thoth-spatial` — the spatial foundation of Thoth Blueprint.
//!
//! Rust port of `packages/domain/src/spatial`. Framework-agnostic: no
//! WASM/FFI glue, no I/O, no UI. This is the one shared contract every other
//! Thoth crate (`thoth-planning`, `thoth-survey`, `thoth-civil`,
//! `thoth-drawing`, `thoth-services`) depends on — treat its public API as
//! append-only. If you need a breaking change, coordinate first: every other
//! crate in the workspace links against this one.
//!
//! Scope (mirrors the TS module split):
//! - [`geometry`] — `geometry.ts`: `Point`/`Polygon`/`Bounds` and pure geometry ops.
//! - [`units`] — `units.ts` + the leaf unit types from `types/index.ts`.
//! - [`id`] — `id.ts`: id generation.
//! - [`types`] — the remaining leaf types (`Layer`, `ElementKind`, `ElementBase`,
//!   `ComplianceFinding`) that the richer planning element hierarchy builds on.
//!
//! The full planning element hierarchy (`Region`, `Parcel`, `Lot`, `Zone`,
//! `LandUse`, `Building`, `Site`, ...) is owned by `thoth-planning`, not this
//! crate — see that crate's module docs for why.

pub mod geometry;
pub mod id;
pub mod types;
pub mod units;

pub use geometry::{
    add, area, bearing, bounds, bounds_center, centroid, closest_point_on_segment, cross, distance,
    dot, ensure_counter_clockwise, format_coord, is_counter_clockwise, is_valid_polygon, length,
    normalize, offset_polygon, pad_bounds, perimeter, point_in_polygon, point_on_segment,
    polyline_length, scale, signed_area, subtract, translate_polygon, union_bounds, Bounds, Point,
    Polygon, Polyline, GEOMETRY_EPSILON,
};
pub use id::create_id;
pub use types::{
    ComplianceFinding, ComplianceSeverity, EdgeArcs, ElementBase, ElementKind, Layer,
    RenovationStatus,
};
pub use units::{
    format_area, format_length, format_number, format_percent, format_ratio, resolve_length_unit,
    slugify, AreaUnit, Crs, LengthUnitPref, Scale, SpatialContext, Unit,
};
