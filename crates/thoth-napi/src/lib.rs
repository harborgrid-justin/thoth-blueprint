//! `thoth-napi` — the native Node (`napi-rs`) boundary between the Thoth
//! Blueprint Rust core and Node-hosted `services/*`.
//!
//! ## Scope of this pass
//!
//! The geometry slice below (`area`, `perimeter`, `centroid`,
//! `pointInPolygon`, `offsetPolygon`) was this crate's original proof of the
//! napi-rs pattern, from before `thoth-services` had anything stable to
//! expose. `thoth-services` now has real, tested implementations of
//! `auth`, `collaboration`, and the Postgres `storage` adapter (see
//! `crates/thoth-services/STATUS.md`), so this pass adds three sibling
//! modules wiring them through:
//!
//! - [`auth`] — registration, authentication, organizations/teams, and
//!   role-based `authorize` checks, backed by a real (SQLite-backed) auth
//!   client. Replaces the TypeScript scaffold that used to live at
//!   `services/auth/src/index.ts`.
//! - [`collaboration`] — presence (join/leave/cursor), element-change
//!   publication under optimistic concurrency control, and comment/
//!   thread-resolution notifications. Replaces the scaffold that used to
//!   live at `services/collaboration/src/index.ts`.
//! - [`storage`] — the real `tokio-postgres`-backed `PostgresStorageAdapter`,
//!   so `packages/storage/src/postgresAdapter.ts` can delegate to it
//!   instead of throwing "not implemented yet".
//!
//! All three follow the same **handle-based** design — see
//! [`registry`]'s module docs for why — rather than napi-rs classes with
//! `&self` async methods.
//!
//! ## Why a separate crate from `thoth-bindings`
//!
//! `wasm-bindgen` targets `wasm32-unknown-unknown`; `napi-rs` targets the
//! host platform (a real native `.node` addon loaded by Node's N-API). Nothing
//! stops one crate declaring both kinds of bindings in principle, but doing
//! so would mean every native (non-wasm) build — including plain
//! `cargo test --workspace` on your dev machine or in CI — pulls in napi's
//! platform-specific FFI surface, and vice versa for wasm32 builds pulling
//! in wasm-bindgen glue that has nothing to do with Node. Keeping them
//! separate keeps each crate's dependency footprint honest and keeps
//! `cargo build -p thoth-bindings --target wasm32-unknown-unknown` and
//! `cargo build -p thoth-napi` independent, reversible operations.
//!
//! ## Wire format, ownership, and panics (geometry slice)
//!
//! The rest of this module's docs (below) describe the original geometry
//! slice specifically. [`auth`], [`collaboration`], and [`storage`] each
//! document their own wire format and error-handling conventions inline —
//! see those modules' docs rather than assuming the geometry slice's notes
//! apply verbatim (they mostly do, but each module calls out what's
//! different, e.g. handles instead of value types, and JSON payloads for
//! collaboration/storage).
//!
//! [`Point`] is a local `#[napi(object)]` struct — a plain JS object
//! `{ x: number, y: number }` — because `thoth_spatial::geometry::Point` is
//! defined in the frozen `thoth-spatial` crate and cannot carry napi-rs'
//! derive macro itself. Conversion is a trivial, allocation-free field copy
//! (see the `From` impls below); there is no reinterpretation of the
//! geometry, only of the type crossing the FFI boundary.
//!
//! ## Ownership
//!
//! Every argument is copied out of the N-API value into an owned Rust
//! `Vec<Point>`/`Point`, and every return value is a freshly-built JS
//! value/object. Nothing here returns a raw pointer, a `Buffer` backed by
//! Rust-owned memory, or anything a JS caller would need to explicitly free.
//!
//! ## Panics
//!
//! `napi-rs` already turns a Rust panic inside a `#[napi]` function into a
//! catchable JS exception (it wraps every export in `catch_unwind`), so — unlike
//! the wasm-bindgen boundary, which needs `console_error_panic_hook` wired in
//! explicitly — there is no separate panic-hook setup call here. As with
//! `thoth-bindings`, none of the functions in this slice are expected to
//! panic in normal use: the only user-controlled input is the polygon/point
//! data itself, and `thoth_spatial::geometry`'s functions are total over
//! `Vec<Point>` of any length (including 0/1/2, handled explicitly — see
//! that crate's doc comments) — there is no validation step that can fail
//! and no `Result::Err` to report here, unlike the wasm slice's shape-parsing
//! step (N-API's own binding-generation already rejects a malformed JS value
//! before a `#[napi]` function body ever runs, with a standard `TypeError`).

mod registry;

pub mod auth;
pub mod collaboration;
pub mod storage;

use napi_derive::napi;
use thoth_spatial::geometry::Point as SpatialPoint;

/// A plan-space position, `{ x: number, y: number }` on the JS side.
///
/// Mirrors [`thoth_spatial::geometry::Point`] field-for-field; kept as a
/// distinct type only because `#[napi(object)]` must be derived in this
/// crate (thoth-spatial is frozen). See the module docs for why.
#[napi(object)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl From<Point> for SpatialPoint {
    fn from(p: Point) -> Self {
        SpatialPoint::new(p.x, p.y)
    }
}

impl From<SpatialPoint> for Point {
    fn from(p: SpatialPoint) -> Self {
        Point { x: p.x, y: p.y }
    }
}

fn to_spatial(polygon: Vec<Point>) -> Vec<SpatialPoint> {
    polygon.into_iter().map(SpatialPoint::from).collect()
}

/// Absolute area of a polygon in plan units², regardless of winding order.
///
/// `polygon`: a closed ring; do not repeat the first point as the last.
/// Mirrors `area()` in `packages/domain/src/spatial/geometry.ts` /
/// `thoth_spatial::geometry::area`.
#[napi]
pub fn area(polygon: Vec<Point>) -> f64 {
    thoth_spatial::geometry::area(&to_spatial(polygon))
}

/// Perimeter of a closed polygon in plan units (includes the closing edge).
#[napi]
pub fn perimeter(polygon: Vec<Point>) -> f64 {
    thoth_spatial::geometry::perimeter(&to_spatial(polygon))
}

/// Area-weighted centroid of a polygon. Falls back to the vertex mean if
/// degenerate (fewer than 3 points).
#[napi]
pub fn centroid(polygon: Vec<Point>) -> Point {
    thoth_spatial::geometry::centroid(&to_spatial(polygon)).into()
}

/// Point-in-polygon test using the ray-casting (even-odd) rule. Points
/// exactly on an edge are considered inside.
#[napi(js_name = "pointInPolygon")]
pub fn point_in_polygon(point: Point, polygon: Vec<Point>) -> bool {
    thoth_spatial::geometry::point_in_polygon(point.into(), &to_spatial(polygon))
}

/// Offset (inset/outset) a simple polygon by `distance` plan units. Returns
/// `null` when the offset collapses the ring — a well-formed result (e.g. a
/// setback wider than the parcel), not an error.
#[napi(js_name = "offsetPolygon")]
pub fn offset_polygon(polygon: Vec<Point>, distance: f64) -> Option<Vec<Point>> {
    thoth_spatial::geometry::offset_polygon(&to_spatial(polygon), distance)
        .map(|ring| ring.into_iter().map(Point::from).collect())
}

#[cfg(test)]
mod tests {
    //! Unlike `thoth-bindings`' `JsValue`, napi-rs's `#[napi(object)]` types
    //! (`Point` here) are plain Rust structs with hand-written `From` impls —
    //! no N-API environment handle is involved until a real Node host calls
    //! through the generated `extern "C"` entry points. That makes the
    //! conversion logic (the only thing this crate adds on top of
    //! `thoth-spatial`) directly testable on the host target, with no wasm32
    //! target / JS runtime required — unlike `thoth-bindings`, which needs
    //! `wasm-bindgen-test` under Node for the equivalent proof (see
    //! `crates/thoth-bindings/tests/geometry_wasm.rs`).
    use super::*;

    fn square() -> Vec<Point> {
        vec![
            Point { x: 0.0, y: 0.0 },
            Point { x: 10.0, y: 0.0 },
            Point { x: 10.0, y: 10.0 },
            Point { x: 0.0, y: 10.0 },
        ]
    }

    #[test]
    fn area_matches_thoth_spatial() {
        assert_eq!(area(square()), 100.0);
    }

    #[test]
    fn perimeter_matches_thoth_spatial() {
        assert_eq!(perimeter(square()), 40.0);
    }

    #[test]
    fn centroid_matches_thoth_spatial() {
        assert_eq!(centroid(square()), Point { x: 5.0, y: 5.0 });
    }

    #[test]
    fn point_in_polygon_matches_thoth_spatial() {
        assert!(point_in_polygon(Point { x: 5.0, y: 5.0 }, square()));
        assert!(!point_in_polygon(Point { x: 50.0, y: 50.0 }, square()));
    }

    #[test]
    fn offset_polygon_insets_and_reports_collapse_as_none_not_a_panic() {
        let inset = offset_polygon(square(), 1.0).expect("valid inset");
        assert_eq!(inset.len(), 4);

        assert!(offset_polygon(square(), 100.0).is_none());
    }
}
