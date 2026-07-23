#!/usr/bin/env node
// Loads the built `thoth-napi` addon (see scripts/build-napi.sh) and checks
// its geometry slice against known values — the same square used in
// crates/thoth-napi/src/lib.rs's own tests and
// apps/web/src/lib/geometryWasm.test.ts's WASM equivalence test, so all
// three bindings (TS, WASM, native Node) are provably checking the same
// facts. This is a smoke test, not a substitute for `cargo test -p
// thoth-napi` (which already proves the Rust-side conversion logic) — it
// exists to prove the *addon actually loads and runs under Node*, which
// `cargo test` alone cannot do.
//
// Usage: yarn build:napi && node scripts/smoke-test-napi.mjs
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const addon = require("../target/napi/thoth_napi.node");

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

assert.equal(addon.area(square), 100);
assert.equal(addon.perimeter(square), 40);
assert.deepEqual(addon.centroid(square), { x: 5, y: 5 });
assert.equal(addon.pointInPolygon({ x: 5, y: 5 }, square), true);
assert.equal(addon.pointInPolygon({ x: 50, y: 50 }, square), false);
assert.deepEqual(addon.offsetPolygon(square, 1), [
  { x: 1, y: 1 },
  { x: 9, y: 1 },
  { x: 9, y: 9 },
  { x: 1, y: 9 },
]);
assert.equal(addon.offsetPolygon(square, 100), null);

console.log("thoth-napi smoke test: all assertions passed.");
