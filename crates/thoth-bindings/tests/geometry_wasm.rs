//! Real `wasm32-unknown-unknown` boundary tests for the `geometry` slice.
//!
//! Unlike the module docs' note in `src/geometry.rs`, these tests genuinely
//! construct `JsValue`s and call the `#[wasm_bindgen]`-exported functions,
//! because they run *inside* a wasm host (Node, driven by
//! `wasm-bindgen-test-runner`) rather than on the plain host target. This is
//! the actual proof that the serialize -> call -> deserialize round trip
//! this crate adds on top of `thoth-spatial` is correct.
//!
//! Run with:
//! ```sh
//! cargo test -p thoth-bindings --target wasm32-unknown-unknown
//! ```
//! (requires the `wasm32-unknown-unknown` target, `wasm-bindgen-cli`
//! matching this crate's `wasm-bindgen` version, and Node on `PATH` — see
//! `crates/README.md`). This is intentionally excluded from the default
//! `cargo test --workspace` (host-target) run; see `crates/README.md` for
//! how CI/local scripts invoke both.

use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

// No `wasm_bindgen_test_configure!(...)` call: Node is `wasm-bindgen-test`'s
// default host when no browser/worker configuration is present, which is
// exactly what we want here (no browser available in CI or this sandbox).

// `serde_wasm_bindgen::to_value`'s *default* serializer represents Rust
// maps/structs as JS `Map` objects (for round-trip fidelity), not plain
// object literals. Real JS/TS callers always pass plain objects (`{x, y}`),
// never `Map`s, so tests must build values the same way — via the
// `json_compatible()` serializer — or they'd be testing a code path no real
// caller exercises. See `crates/README.md` for this gotcha.
fn to_plain_js<T: serde::Serialize>(value: &T) -> JsValue {
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .unwrap()
}

fn square() -> JsValue {
    to_plain_js(&serde_json::json!([
        {"x": 0.0, "y": 0.0},
        {"x": 10.0, "y": 0.0},
        {"x": 10.0, "y": 10.0},
        {"x": 0.0, "y": 10.0},
    ]))
}

#[wasm_bindgen_test]
fn area_of_unit_square_matches_thoth_spatial() {
    let got = thoth_bindings::geometry::area(square()).expect("valid polygon");
    assert_eq!(got, 100.0);
}

#[wasm_bindgen_test]
fn perimeter_matches_thoth_spatial() {
    let got = thoth_bindings::geometry::perimeter(square()).expect("valid polygon");
    assert_eq!(got, 40.0);
}

#[wasm_bindgen_test]
fn centroid_round_trips_through_js() {
    let raw = thoth_bindings::geometry::centroid(square()).expect("valid polygon");
    // Read back with the plain (non-Map) deserializer too, matching how a
    // real caller would read the returned `{x, y}` object.
    let point: serde_json::Value =
        serde_wasm_bindgen::from_value(raw).expect("plain object deserializes");
    assert_eq!(point["x"], 5.0);
    assert_eq!(point["y"], 5.0);
}

#[wasm_bindgen_test]
fn point_in_polygon_matches_thoth_spatial() {
    let inside = to_plain_js(&serde_json::json!({"x": 5.0, "y": 5.0}));
    let outside = to_plain_js(&serde_json::json!({"x": 50.0, "y": 50.0}));
    assert!(thoth_bindings::geometry::point_in_polygon(inside, square()).unwrap());
    assert!(!thoth_bindings::geometry::point_in_polygon(outside, square()).unwrap());
}

#[wasm_bindgen_test]
fn offset_polygon_collapse_crosses_as_null_not_a_thrown_error() {
    let inset = thoth_bindings::geometry::offset_polygon(square(), 1.0).expect("call succeeds");
    assert!(!inset.is_null());

    let collapsed =
        thoth_bindings::geometry::offset_polygon(square(), 100.0).expect("call succeeds");
    assert!(collapsed.is_null());
}

#[wasm_bindgen_test]
fn malformed_shape_is_a_catchable_error_not_a_panic() {
    let bad = to_plain_js(&serde_json::json!({"not": "a polygon"}));
    let err = thoth_bindings::geometry::area(bad).expect_err("shape mismatch must error");
    let message = err.as_string().expect("error is a JS string, not a trap");
    assert!(
        message.contains("invalid polygon"),
        "message was: {message}"
    );
}
