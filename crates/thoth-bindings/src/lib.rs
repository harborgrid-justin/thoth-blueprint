//! `thoth-bindings` — the `wasm-bindgen` boundary between the Thoth Blueprint
//! Rust core and `apps/web`.
//!
//! ## Scope of this pass
//!
//! This crate exports exactly **one vertical slice**: the pure geometry
//! operations from [`thoth_spatial::geometry`], which is the one domain
//! crate guaranteed complete and frozen while the other four (`thoth-survey`,
//! `thoth-civil`, `thoth-drawing`) and `thoth-planning` itself are still being
//! ported concurrently. It is a proof that the wasm-bindgen pattern works
//! end-to-end (build, load, call, error-handle, test) — **not** a claim that
//! the planning/survey/civil/drawing domain is available from JS yet. As
//! those crates stabilize, add sibling modules here following the pattern in
//! [`geometry`] rather than growing that module unboundedly.
//!
//! ## Wire format
//!
//! Every exported function takes and returns plain `JsValue`s produced by
//! [`serde-wasm-bindgen`](serde_wasm_bindgen), not JSON strings — no
//! `JSON.stringify`/`parse` round-trip is needed on the JS side, just plain
//! objects/arrays. Concretely:
//!
//! - A [`thoth_spatial::geometry::Point`] crosses as `{ x: number, y: number }`.
//! - A [`thoth_spatial::geometry::Polygon`] / `Polyline` crosses as `Point[]`.
//! - A [`thoth_spatial::geometry::Bounds`] crosses as
//!   `{ min_x, min_y, max_x, max_y }` — **snake_case**, because
//!   `thoth-spatial` is frozen and does not apply a `serde(rename_all)` to
//!   that struct. Don't "fix" the case in this crate; document it, as here.
//! - `Option<T>::None` crosses as `null` / `undefined`-safe `null`, not a thrown
//!   error — see [`geometry::offset_polygon`] for the one function that returns
//!   an optional result.
//!
//! ## Ownership
//!
//! Nothing here hands the JS side a pointer, a linear-memory offset, or
//! anything that needs an explicit `.free()`. Every argument is deserialized
//! out of the JS heap into owned Rust values, and every return value is a
//! freshly-allocated JS value handed back across the boundary. There are no
//! `#[wasm_bindgen]` structs/classes in this slice, so there is nothing for
//! callers to leak by forgetting to free it.
//!
//! ## Panics
//!
//! [`set_panic_hook`] installs `console_error_panic_hook` so that if a Rust
//! panic ever does occur (a bug, not a validation failure), it surfaces as a
//! readable `console.error` stack trace instead of an opaque
//! `RuntimeError: unreachable executed` with the wasm instance left in an
//! undefined, un-recoverable state. Call it once, before any other export, on
//! the JS side (see the module docs on [`geometry`] for the snippet). None of
//! the functions in this slice are expected to panic in normal use — bad
//! *shape* input (wrong JSON shape, missing fields) is reported as a
//! `Result::Err(JsValue)` with a descriptive message instead, which is the
//! path every caller should actually handle.

pub mod geometry;

pub use geometry::{area, centroid, offset_polygon, perimeter, point_in_polygon};

use wasm_bindgen::prelude::*;

/// Install `console_error_panic_hook` so a Rust panic becomes a catchable,
/// readable JS error/console message instead of silently trapping the wasm
/// instance. Idempotent — safe to call more than once (subsequent calls are
/// no-ops), but callers only need to call it once, before anything else in
/// this module, typically right after `await init()`.
///
/// This is deliberately **not** wired as a `#[wasm_bindgen(start)]` function:
/// start functions run at module-instantiation time, before the caller has a
/// chance to decide *whether* they want the hook installed (e.g. a host that
/// already installs its own global panic hook). Making it an explicit,
/// idempotent call keeps that decision with the embedder.
#[wasm_bindgen(js_name = setPanicHook)]
pub fn set_panic_hook() {
    console_error_panic_hook::set_once();
}
