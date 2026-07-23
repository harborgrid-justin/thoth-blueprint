//! `wasm-bindgen` exports for the frozen `thoth_spatial::geometry` slice.
//!
//! Every export here is a thin, panic-free wrapper: deserialize the JS
//! argument(s) into the exact `thoth_spatial` types, call straight through to
//! the (already-tested, frozen) pure function, and serialize the result back.
//! No logic is duplicated or reimplemented here — if a value looks wrong,
//! the bug is in `thoth-spatial`, not in this wrapper.
//!
//! ```js
//! import init, { setPanicHook, area, perimeter, centroid, pointInPolygon, offsetPolygon } from "./thoth_bindings.js";
//!
//! await init();
//! setPanicHook();
//!
//! const square = [
//!   { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
//! ];
//! area(square);              // -> 100
//! perimeter(square);         // -> 40
//! centroid(square);          // -> { x: 5, y: 5 }
//! pointInPolygon({ x: 5, y: 5 }, square); // -> true
//! offsetPolygon(square, 1);  // -> Point[] (inset by 1 unit) | null if it collapses
//! ```

use serde::{de::DeserializeOwned, Serialize};
use thoth_spatial::geometry::{Point, Polygon};
use wasm_bindgen::prelude::*;

/// The one serializer/deserializer configuration used on this whole
/// boundary: plain JS objects/arrays (not ES `Map`s) and `null` (not
/// `undefined`) for `Option::None` — i.e. exactly the shapes a TS caller
/// writes as object/array literals and exactly the `T | null` the TS
/// originals (`offsetPolygon(): Polygon | null`, etc.) already return.
/// `serde-wasm-bindgen`'s *default* serializer instead emits ES `Map`s for
/// struct-like values and `undefined` for `None` — using it here would make
/// every export subtly incompatible with plain object literals from real
/// callers. Always go through this, never call
/// `serde_wasm_bindgen::{to_value,from_value}` directly in this crate.
fn wire_format() -> serde_wasm_bindgen::Serializer {
    serde_wasm_bindgen::Serializer::json_compatible()
}

/// Deserialize a JS value into `T`, turning a shape mismatch into a
/// descriptive `JsValue` error instead of a panic. This is the only place
/// user-controlled input is parsed, so it's the only place that can fail.
fn from_js<T: DeserializeOwned>(value: JsValue, what: &str) -> Result<T, JsValue> {
    serde_wasm_bindgen::from_value(value)
        .map_err(|e| JsValue::from_str(&format!("thoth-bindings: invalid {what}: {e}")))
}

/// Serialize a Rust value into a `JsValue`, using [`wire_format`]. Only fails
/// if `T`'s `Serialize` impl fails, which none of the plain-data types in
/// this slice do — kept as a `Result` anyway so a future addition can't
/// silently panic instead.
fn to_js<T: Serialize + ?Sized>(value: &T, what: &str) -> Result<JsValue, JsValue> {
    value
        .serialize(&wire_format())
        .map_err(|e| JsValue::from_str(&format!("thoth-bindings: could not serialize {what}: {e}")))
}

/// Absolute area of a polygon in plan units², regardless of winding order.
///
/// `polygon`: `{x:number,y:number}[]` (a closed ring; do not repeat the first
/// point as the last). Mirrors `area()` in `packages/domain/src/spatial/geometry.ts`.
#[wasm_bindgen(js_name = area)]
pub fn area(polygon: JsValue) -> Result<f64, JsValue> {
    let polygon: Polygon = from_js(polygon, "polygon")?;
    Ok(thoth_spatial::geometry::area(&polygon))
}

/// Perimeter of a closed polygon in plan units (includes the closing edge).
///
/// `polygon`: `{x:number,y:number}[]`.
#[wasm_bindgen(js_name = perimeter)]
pub fn perimeter(polygon: JsValue) -> Result<f64, JsValue> {
    let polygon: Polygon = from_js(polygon, "polygon")?;
    Ok(thoth_spatial::geometry::perimeter(&polygon))
}

/// Area-weighted centroid of a polygon. Falls back to the vertex mean if
/// degenerate (fewer than 3 points), matching `thoth_spatial::geometry::centroid`.
///
/// `polygon`: `{x:number,y:number}[]`. Returns `{x:number,y:number}`.
#[wasm_bindgen(js_name = centroid)]
pub fn centroid(polygon: JsValue) -> Result<JsValue, JsValue> {
    let polygon: Polygon = from_js(polygon, "polygon")?;
    let c: Point = thoth_spatial::geometry::centroid(&polygon);
    to_js(&c, "centroid point")
}

/// Point-in-polygon test using the ray-casting (even-odd) rule. Points
/// exactly on an edge are considered inside.
///
/// `point`: `{x:number,y:number}`. `polygon`: `{x:number,y:number}[]`.
#[wasm_bindgen(js_name = pointInPolygon)]
pub fn point_in_polygon(point: JsValue, polygon: JsValue) -> Result<bool, JsValue> {
    let point: Point = from_js(point, "point")?;
    let polygon: Polygon = from_js(polygon, "polygon")?;
    Ok(thoth_spatial::geometry::point_in_polygon(point, &polygon))
}

/// Offset (inset/outset) a simple polygon by `distance` plan units. Returns
/// `null` (not an error) when the offset collapses the ring — this is an
/// expected, well-formed result (e.g. a setback wider than the parcel),
/// mirroring `offsetPolygon(): Polygon | null` in the TS source.
///
/// `polygon`: `{x:number,y:number}[]`. Returns `{x:number,y:number}[] | null`.
#[wasm_bindgen(js_name = offsetPolygon)]
pub fn offset_polygon(polygon: JsValue, distance: f64) -> Result<JsValue, JsValue> {
    let polygon: Polygon = from_js(polygon, "polygon")?;
    let result: Option<Polygon> = thoth_spatial::geometry::offset_polygon(&polygon, distance);
    to_js(&result, "offset polygon result")
}

// NOTE on testing strategy: `wasm-bindgen`'s `JsValue` is a real JS engine
// handle (backed by `js-sys` imported functions) even when this crate is
// compiled for the host target — constructing one off-wasm32 panics at
// runtime ("cannot call wasm-bindgen imported functions on non-wasm
// targets"). That makes the wrapper functions above untestable with plain
// `#[test]` under `cargo test --workspace`, which runs on the host triple.
//
// So the split here is deliberate:
//   - `thoth-spatial`'s own test suite (frozen, already exhaustive) is the
//     source of truth for the *math* — every wrapper above is a direct,
//     unmodified pass-through to it, so there is no additional geometry
//     logic in this crate to re-verify on the host.
//   - The (de)serialization boundary itself — the only thing this crate
//     actually adds — is exercised for real by `wasm-bindgen-test` under
//     the `wasm32-unknown-unknown` target (run via `wasm-bindgen-test-runner`
//     in Node; see `crates/thoth-bindings/tests/geometry_wasm.rs`), and by
//     the TS/WASM equivalence test in `apps/web` (see
//     `apps/web/src/features/survey/helpers/platDrawingHelpers.wasm.test.ts`),
//     which is the one that matters: it proves the real compiled artifact
//     agrees with the TS implementation it replaces at the one call site
//     this pass cuts over.
//
// Do not add `#[cfg(test)]` unit tests here that construct a `JsValue`
// directly — they will compile but panic at runtime under a plain
// `cargo test`.
