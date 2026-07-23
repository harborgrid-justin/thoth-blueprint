# `crates/` — the Rust core

Thoth Blueprint's business logic is being migrated from the TypeScript in
`packages/domain` and `services/*` into a Cargo workspace here. See
[`docs/RUST_MIGRATION.md`](../docs/RUST_MIGRATION.md) for the living,
crate-by-crate status rollup, and [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
for how this fits the rest of the system. This file is the map of the
workspace itself: what each crate is, the one convention that makes the
parallel-porting effort tractable (the "frozen contract"), and how to
build/test/extend it.

## Layout

```
crates/
├── thoth-spatial     the frozen shared contract — geometry, units, ids (Phase 1 foundation)
├── thoth-planning    Site/Parcel/Lot/Zone/LandUse, rules, metrics, subdivision (packages/domain/src/planning, src/smart)
├── thoth-survey      metes-and-bounds, PLSS, monuments, points (packages/domain/src/survey)
├── thoth-civil       alignments, corridors, grading, terrain, pipe/network design (packages/domain/src/civil)
├── thoth-drawing     sheets, dimensions, hatching, schedules, plat sets (packages/domain/src/drawing)
├── thoth-services    backend logic: auth, projects, geospatial, collaboration, storage (services/*, packages/storage)
├── thoth-bindings    wasm-bindgen boundary → apps/web (integration layer)
└── thoth-napi        napi-rs boundary → services/* (Node) (integration layer)
```

The first six are the domain ports; each is one agent's independent,
concurrent work. `thoth-bindings` and `thoth-napi` are the **integration
layer** — they don't port any new TS logic themselves, they wire the domain
crates to the JS/TS half of the monorepo.

## The frozen-contract convention

`thoth-spatial` is complete and **frozen**: its public API (`Point`,
`Polygon`, `Bounds`, `SpatialContext`, `Unit`/`AreaUnit`, the pure geometry
functions in `geometry.rs`, `id::create_id`, the leaf types in `types.rs`)
is append-only. Every other crate in this workspace depends on it. This
exists because five crates were ported **concurrently, by different agents,
against the same TS source tree** — without one non-negotiable shared
foundation, each crate would have drifted onto its own slightly-different
`Point`/`Polygon`/units, making later integration (this crate's whole job)
impossible. Concretely:

- Never edit `crates/thoth-spatial/src/**`. If it's missing something a
  port needs (see `thoth-planning/GAPS.md` and `thoth-civil/GAPS.md` for two
  real examples — arc/bulge geometry and PLSS framing), the correct move is
  to document the gap and work around it locally in the dependent crate, not
  to reach into `thoth-spatial`. A later pass can deliberately hoist a
  well-tested local workaround up into `thoth-spatial` once it's been used
  by more than one crate — that's a coordinated, reviewed decision, not a
  unilateral mid-port edit.
- Every other crate's `Cargo.toml` depends on `thoth-spatial` via the
  workspace alias (`thoth-spatial = { workspace = true }`), never a path
  override or a fork.
- If you're extending the wasm/napi integration layer to a new slice of
  functionality, and that slice lives in `thoth-spatial`, you can bind it
  immediately — it's guaranteed stable. If it lives in one of the five
  domain crates, check that crate's `STATUS.md`/`GAPS.md` first (see
  `docs/RUST_MIGRATION.md`) before treating it as a stable target.

## Building and testing

From the repo root:

```sh
cargo build --workspace          # or: yarn build:rust
cargo test --workspace           # or: yarn test:rust
cargo fmt --all -- --check       # or: yarn fmt:rust
cargo clippy --workspace --all-targets -- -D warnings   # or: yarn clippy:rust
```

Per-crate, from anywhere in the workspace: `cargo test -p thoth-spatial`,
`cargo clippy -p thoth-planning --all-targets -- -D warnings`, etc.

`docs/RUST_MIGRATION.md` and each crate's own `STATUS.md` are the place to
check whether `--workspace` is expected to be fully green right now — while
the five domain crates are mid-port, `cargo test --workspace` may
legitimately reflect one of them still failing; that's a signal to read
their `STATUS.md`/`GAPS.md`, not to paper over the failure here.

## The wasm-bindgen boundary (`thoth-bindings` → `apps/web`)

`thoth-bindings` exports the one geometry vertical slice ported so far
(`area`, `perimeter`, `centroid`, `pointInPolygon`, `offsetPolygon` — see its
module docs for the full rationale, wire format, and panic-safety notes).

To (re)build the wasm package apps/web imports:

```sh
yarn build:wasm      # runs scripts/build-wasm.sh
```

This needs, once, on your machine:

- The `wasm32-unknown-unknown` target (`rustup target add wasm32-unknown-unknown` —
  already declared in `rust-toolchain.toml`, so a fresh `rustup` setup picks
  it up automatically).
- `wasm-bindgen-cli`, **version-matched** to the `wasm-bindgen` crate
  dependency in `crates/thoth-bindings/Cargo.toml` (mismatches fail loudly
  at load time, not silently):
  ```sh
  cargo install wasm-bindgen-cli --version <same version as the wasm-bindgen crate>
  ```

The script produces two generated packages under `apps/web/src/wasm/`:

- `thoth-bindings/` (`--target web`) — the real production artifact. Vite
  bundles this into `apps/web` as an ordinary ES module; it fetches its
  `.wasm` via `import.meta.url`, which Vite understands natively. **This is
  what ships to the browser.**
- `thoth-bindings-node-test/` (`--target nodejs`) — test-only. Node's
  `fetch` can't load `file://` URLs, so the `web` target can't run directly
  under Vitest; the `nodejs` target instead loads its `.wasm` synchronously
  via `fs`, which works under plain Node with no extra plumbing. Both are
  generated from the exact same compiled `.wasm`, so there's no drift
  between what ships and what the equivalence test exercises — only the JS
  loading shim differs. Its `.js` is renamed to `.cjs` by the build script
  because `apps/web`'s `package.json` sets `"type": "module"`, which would
  otherwise make Node parse wasm-bindgen's CommonJS output as ESM and fail.

Both directories are **checked into git** for now (they're small — roughly
270 KB total) so `apps/web`'s existing CI jobs (`domain-test`, `web-build`,
which don't install a Rust toolchain) keep working unmodified. Regenerate
them with `yarn build:wasm` after any change to `thoth-spatial` or
`thoth-bindings`, and commit the result — the `geometryWasm.test.ts`
equivalence test (see `apps/web/src/lib/geometryWasm.ts`) is what catches a
stale artifact.

### Extending the wasm slice

To bind a new function from a **stable** crate (i.e. `thoth-spatial`, or a
domain crate whose `STATUS.md` marks the relevant function `ported+tested`):

1. Add a thin `#[wasm_bindgen]` wrapper in `crates/thoth-bindings/src/`
   (a new module, following `geometry.rs`'s pattern): deserialize with
   `serde_wasm_bindgen::from_value`, call straight through to the domain
   crate's function, serialize the result with the crate's shared
   `wire_format()` helper (`Serializer::json_compatible()` — plain objects
   and `null`, not ES `Map`s and `undefined`; see `geometry.rs`'s doc
   comment on `wire_format()` for why this matters). Never call
   `serde_wasm_bindgen::{to_value,from_value}` with the default serializer
   directly — always go through `wire_format()`.
2. Add a real boundary test in `crates/thoth-bindings/tests/` using
   `wasm-bindgen-test` (run via `cargo test -p thoth-bindings --target
   wasm32-unknown-unknown`, driven by Node — see `geometry_wasm.rs`). Plain
   `#[cfg(test)]` unit tests in `src/` **cannot** exercise `JsValue`-based
   code: constructing one off-`wasm32` panics at runtime ("cannot call
   wasm-bindgen imported functions on non-wasm targets"). This is why the
   test strategy is split the way it is — see the note at the bottom of
   `geometry.rs`.
3. Regenerate (`yarn build:wasm`) and, if you're also cutting over a real
   `apps/web` call site, write a TS wrapper module (see `geometryWasm.ts`)
   and a Vitest equivalence test against the `--target nodejs` package
   proving the TS and WASM implementations agree (see
   `apps/web/src/lib/geometryWasm.test.ts`).

## The native Node boundary (`thoth-napi` → `services/*`)

`thoth-napi` mirrors the same geometry slice via `napi-rs` instead of
`wasm-bindgen`, producing a real native `.node` addon for Node to
`require()` directly (no wasm runtime, no serialization step — `#[napi]`
functions convert straight between N-API values and Rust structs). It is a
**separate crate**, not a second target on `thoth-bindings`, so that a
native (non-wasm32) build of `thoth-bindings` never needs napi's
platform-specific FFI surface and vice versa — see the crate's own module
docs for the full reasoning.

`thoth-services` — the crate this binding surface exists to eventually
front — is still a placeholder as of this writing (check its `STATUS.md`
once one exists). `thoth-napi` is therefore a **proof of pattern**, not a
claim that `services/*` can call into Rust today: it exposes the same
frozen geometry slice as `thoth-bindings`, to prove the napi-rs build
pipeline (build script, `#[napi(object)]` conversion types, generated
`.node` addon, panic-safety) works end-to-end. Extend it the same way as
`thoth-bindings` once `thoth-services` has real, stable functions to
expose.

Build and smoke-test it:

```sh
yarn build:napi                       # runs scripts/build-napi.sh
node scripts/smoke-test-napi.mjs      # loads the addon, checks known values
```

Unlike the wasm boundary, `#[napi(object)]` conversion types (`Point` here)
are plain Rust structs with hand-written `From` impls — no N-API
environment handle is involved until a real Node host calls through the
generated entry points — so the conversion logic **is** directly testable
with plain `#[test]`s on the host target (see `crates/thoth-napi/src/lib.rs`'s
`tests` module); there's no wasm-bindgen-style split needed here.

## Adding a new integration crate

If you need a new binding target (e.g. a future `thoth-python` via PyO3),
add it under `crates/` and add it to the root `Cargo.toml`'s `members` list.
That list is otherwise **frozen for the five domain-crate agents** — only
the integration engineer adds entries to it, and only for new integration
crates, never for the domain crates' own paths (those seven are fixed).
Document why in the crate's own module docs, the way `thoth-napi`'s do.
