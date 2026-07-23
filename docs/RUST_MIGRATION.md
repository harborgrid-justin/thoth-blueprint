# Rust migration status

> **Update (gap-closing pass):** a second round closed 66 competitive gaps
> identified in [`docs/COMPETITIVE_GAP_ANALYSIS.md`](COMPETITIVE_GAP_ANALYSIS.md)
> against Civil 3D, Bentley OpenSite/OpenRoads Designer, Trimble Business
> Center, Carlson, Esri ArcGIS Pro, GeoSTORM/HydroCAD, and AutoTURN. Four new
> crates landed (`thoth-hydrology`, `thoth-transportation`, `thoth-interop`,
> `thoth-governance`) and two existing crates (`thoth-planning`,
> `thoth-drawing`) gained new modules. See "Gap-closing pass" below for the
> full rollup — the original migration-pass content further down is left
> as-is (superseded numbers are noted inline rather than silently rewritten).


Thoth Blueprint's business logic — currently TypeScript in `packages/domain`
and `services/*` — is being ported to a Rust workspace under
[`crates/`](../crates/README.md). This document is a **living status
rollup**: read [`crates/README.md`](../crates/README.md) first for the
workspace layout and the frozen-contract convention, then come here for
"where does each crate actually stand right now."

This snapshot was written by the integration engineer (the agent responsible
for `crates/thoth-bindings`, `crates/thoth-napi`, build tooling, CI, and this
doc set — not for porting domain logic). The six other crates
(`thoth-spatial` plus five domain crates) were ported by five different
agents **running concurrently** with this integration work, so the picture
below is a snapshot taken partway through that effort, not a final state.
**Whenever a crate has its own `STATUS.md` and/or `GAPS.md`, that file is the
source of truth — this document only summarizes and links to it.** If you're
deciding whether to depend on or bind a specific function, read the crate's
own file, not just this summary.

## At a glance

| Crate | Role | Status doc | Summary |
| --- | --- | --- | --- |
| `thoth-spatial` | Frozen shared contract: geometry, units, ids | _(none — see below)_ | **Complete.** Geometry ops, units/scale, leaf types, id generation. Treat as append-only; see `crates/README.md`. |
| `thoth-planning` | Site/Parcel/Lot/Zone/LandUse, rules, metrics, subdivision | [`STATUS.md`](../crates/thoth-planning/STATUS.md), [`GAPS.md`](../crates/thoth-planning/GAPS.md) | Core rules/metrics/subdivision engine and the full element type hierarchy are ported+tested (58 passing tests). Element *geometry algorithms* (stairs, curtain wall, door/window, roof), GEOID/compliance data, and the entire `smart/` automation layer are not yet ported. |
| `thoth-survey` | Metes-and-bounds, PLSS, monuments, points | [`GAPS.md`](../crates/thoth-survey/GAPS.md) (no `STATUS.md` as of this writing) | Substantial — bearing/traverse/legal-description, PLSS section framing, monuments, point groups, transparent commands all present with passing tests as of this snapshot. See `GAPS.md` for the arc/bulge-geometry local port and cross-crate (civil/planning/drawing) helper dependencies it doesn't take. **Check the crate directly for current test status** — this integration pass observed it mid-flight (some transient local test failures were seen and then resolved during this same window; don't take this doc's word for green over the crate's own CI/test run). |
| `thoth-civil` | Alignments, corridors, grading, terrain, pipe/network design | [`STATUS.md`](../crates/thoth-civil/STATUS.md), [`GAPS.md`](../crates/thoth-civil/GAPS.md) | 22 of 32 TS source files ported (102 passing tests); the 10 not-yet-ported are all blocked on the same cross-crate dependency pattern (types that belong to `thoth-survey`/`thoth-planning`/`thoth-drawing`), documented once rather than repeated per file. |
| `thoth-drawing` | Sheets, dimensions, hatching, schedules, plat sets | _(no `STATUS.md`/`GAPS.md` as of this writing)_ | **In progress — see crate for latest.** `cargo test -p thoth-drawing` passed with 0 reported failures as observed during this integration pass; no per-file port mapping was published yet at time of writing. |
| `thoth-services` | Backend logic: auth, projects, geospatial, collaboration, storage | _(no `STATUS.md`/`GAPS.md` as of this writing)_ | **In progress — see crate for latest.** Real dependencies are wired (tokio, argon2, rusqlite, tokio-postgres, chrono) and the crate builds and passes its own tests as observed during this integration pass, but it is explicitly still a work in progress; no per-file port mapping was published yet. This is why `crates/thoth-napi` (below) doesn't yet expose anything service-specific. |
| `thoth-bindings` | **Integration**: wasm-bindgen boundary → `apps/web` | _(this doc + `crates/README.md`)_ | One vertical slice shipped: `area`, `perimeter`, `centroid`, `pointInPolygon`, `offsetPolygon` from `thoth_spatial::geometry`, exported via `wasm-bindgen`, consumed by `apps/web` (real cutover: `PlatDrawing.tsx`'s centroid call — see below). |
| `thoth-napi` | **Integration**: napi-rs boundary → `services/*` (Node) | _(this doc + `crates/README.md`)_ | Same geometry slice, exported as a native `.node` addon via `napi-rs`. Proof of pattern only — `thoth-services` has nothing stable enough yet to expose beyond the shared geometry slice. |

**Legend inherited from the crates that define one (`thoth-planning`,
`thoth-civil`, `thoth-survey`):** ported+tested / ported+partial-tests /
not-yet-ported. See those crates' own `STATUS.md`/`GAPS.md` for the precise
per-file breakdown — it is not repeated here.

## Gap-closing pass (six parallel agents, one per crate)

| Crate | Theme (gap items) | Tests | Status doc |
| --- | --- | --- | --- |
| `thoth-hydrology` (new) | Stormwater hydrology/hydraulics (1-13) | 109 + 26 doctests | [`STATUS.md`](../crates/thoth-hydrology/STATUS.md) — 12/13 `implemented+tested`, 1 `implemented+partial-tests` (floodplain, item 13) |
| `thoth-transportation` (new) | Transportation/traffic engineering (14-25) | 87 | [`STATUS.md`](../crates/thoth-transportation/STATUS.md) — 9/12 `implemented+tested`, 3 `implemented+partial-tests` (trip generation, roundabout, signal warrant) |
| `thoth-interop` (new) | Field-data/format interoperability (26-37) | 90 | [`STATUS.md`](../crates/thoth-interop/STATUS.md) — 11/12 `implemented+tested`, 1 `implemented+partial-tests` (RINEX, item 30) |
| `thoth-planning` (extended) | Subdivision design automation (38-50) | 119 (58 pre-existing + 61 new) | [`GAP_ANALYSIS_STATUS.md`](../crates/thoth-planning/GAP_ANALYSIS_STATUS.md) — all 13 `implemented+tested`, several with documented heuristic/scope limitations |
| `thoth-drawing` (extended) | Drawing production/specialty analysis (51-60) | 207 (140 pre-existing + 67 new) | [`GAP_ANALYSIS_STATUS.md`](../crates/thoth-drawing/GAP_ANALYSIS_STATUS.md) — all 10 `implemented+tested` |
| `thoth-governance` (new) | Compliance/collaboration governance (61-66) | 49 | [`STATUS.md`](../crates/thoth-governance/STATUS.md) — all 6 `implemented+tested`, with an explicitly conservative three-way-merge scope (item 62) |

**Workspace total after this pass: 1,013 Rust tests, all passing.**
`cargo fmt --all -- --check` and `cargo clippy --workspace --all-targets --
-D warnings` are both clean across all 12 crates (the two `thoth-spatial`
line-wrap diffs noted below under "Known, currently-open items" were fixed
during this pass). The full TypeScript suite (`packages/domain` +
`packages/storage`, 383 + 41 tests) and `apps/web`'s Vitest suite remain
green and untouched.

Every new/extended crate depends only on already-stable sibling crates from
the first migration pass (`thoth-spatial`, `thoth-civil`, `thoth-survey`,
`thoth-planning`, `thoth-services`) rather than working around
in-flight APIs, since those crates were complete and frozen-by-completion
by the time this pass started — unlike the first pass, cross-crate
`GAPS.md` entries in this round are rarer and reflect genuine architectural
boundaries (e.g. `thoth-drawing`'s staking sheet using a local
`StakingPoint` type pending eventual integration with `thoth-interop`'s
`staking.rs`), not merely "the other crate wasn't done yet."

## What the integration layer actually wired

This is the part of the migration this pass is directly responsible for and
can vouch for firsthand (everything above is a snapshot of others' concurrent
work; this section is not).

### `thoth-bindings` (wasm-bindgen → `apps/web`)

- **Exports:** `area`, `perimeter`, `centroid`, `pointInPolygon`,
  `offsetPolygon` — the complete pure-geometry slice of `thoth_spatial::geometry`,
  chosen specifically because `thoth-spatial` is frozen/guaranteed-stable
  while the domain crates were still in flight. See
  `crates/thoth-bindings/src/geometry.rs` for full rustdoc (wire format,
  ownership, panic-safety) on every export.
- **Panic safety:** `setPanicHook()` installs `console_error_panic_hook` so
  a genuine Rust panic surfaces as a readable console error instead of
  silently trapping the wasm instance. Every export returns
  `Result<T, JsValue>` with a descriptive message on invalid input — no
  unhandled throw crosses the boundary as an opaque value.
- **Tests:**
  - `crates/thoth-bindings/tests/geometry_wasm.rs` — real `wasm-bindgen-test`
    tests under `wasm32-unknown-unknown`, run via Node
    (`cargo test -p thoth-bindings --target wasm32-unknown-unknown`),
    proving the actual serialize → call → deserialize round trip.
  - `apps/web/src/lib/geometryWasm.test.ts` — proves the compiled WASM
    module and the TS `packages/domain/src/spatial/geometry.ts` it mirrors
    agree, across a square, a triangle, and a concave "L" polygon, for every
    exported function, including the "offset collapses to `null`, not an
    error" case. 15 assertions, all passing.
- **The one real `apps/web` cutover:** `apps/web/src/features/survey/PlatDrawing.tsx`'s
  centroid computation now calls `centroidPreferWasm()`
  (`apps/web/src/lib/geometryWasm.ts`) instead of `@thoth/domain`'s
  `centroid` directly. That helper prefers the WASM implementation once
  `initGeometryWasm()` (kicked off, unawaited, in `main.tsx` at app
  bootstrap) has resolved, and transparently falls back to the original TS
  function otherwise — before the wasm module finishes loading, or if a
  wasm call ever throws. This is a **one-function proof-of-concept cutover**,
  not a broader migration of `apps/web`'s canvas/rendering code — see
  `crates/README.md` and the module docs in `geometryWasm.ts` for the full
  reasoning and how to extend the pattern to more functions.
- **Build tooling:** `yarn build:wasm` (`scripts/build-wasm.sh`) builds the
  wasm32 binary and generates both the production (`--target web`) and
  test-only (`--target nodejs`) JS packages under `apps/web/src/wasm/`. Both
  are committed to git for now (see `crates/README.md` for why).

### `thoth-napi` (napi-rs → `services/*`)

- Same geometry slice as `thoth-bindings`, exposed as a native `.node`
  addon. **Not wired into any `services/*` package** — `thoth-services` has
  no stable, service-specific functionality yet to expose (see the table
  above). This crate exists to prove the napi-rs build pipeline itself
  (build script, `#[napi(object)]` conversion types, generated addon,
  panic/error handling) works, so that wiring real `thoth-services`
  functions through it later is a matter of adding functions, not
  discovering the pattern from scratch.
- **Tests:** `cargo test -p thoth-napi` — 5 passing tests exercising the
  conversion logic directly on the host target (no Node/wasm runtime
  needed; `#[napi(object)]` types are plain Rust structs until a real N-API
  environment calls through the generated entry points).
- `scripts/smoke-test-napi.mjs` additionally loads the actual built
  `.node` addon under real Node and checks it against the same known
  values used in the Rust tests and the WASM equivalence test — manually
  verified passing during this pass (`yarn build:napi && node scripts/smoke-test-napi.mjs`).
- Added to the workspace's `Cargo.toml` `members` list as a new entry (the
  only edit made to that file) — the five domain-crate paths already there
  were left untouched.

### CI

A `rust-workspace` job was added to `.github/workflows/build_test.yml`,
alongside the existing `artifact-build`/`domain-test`/`storage-test`/`web-build`
jobs, running `cargo fmt --all -- --check`, `cargo clippy --workspace
--all-targets -- -D warnings`, and `cargo test --workspace`. As the job's own
comment in the workflow file says: because five domain crates may be
mid-port at any given time, this job's pass/fail reflects the whole
workspace's state, not just the integration layer's — see "Known,
currently-open items" below for the exact state observed when this doc was
last updated.

## Known, currently-open items (as of this snapshot)

- **`cargo fmt --all -- --check` fails** on two files inside frozen
  `thoth-spatial` (`src/lib.rs`, `src/geometry.rs`) — a handful of
  line-wrap-only diffs against this environment's local `rustfmt` version.
  Since `thoth-spatial` cannot be edited in this pass, these are left
  as-is; whoever next has write access to `thoth-spatial` should run
  `cargo fmt -p thoth-spatial` once. `thoth-bindings` and `thoth-napi`
  themselves are clean under `cargo fmt --check`.
- `cargo clippy --workspace --all-targets -- -D warnings` and
  `cargo test --workspace` were **both fully green** at the time this
  integration pass finished, across all eight crates — but two of those
  eight (`thoth-services`, `thoth-survey`) had real, transient failures
  earlier in this same session (a missing `Debug` derive, a too-many-arguments
  clippy lint, an `unnecessary_unwrap`, and five failing survey tests) that
  were fixed concurrently by their own agents while this integration work
  was in progress. That is expected — this doc describes a moving target —
  but it means a `--workspace` run at any *other* point in time than
  right now could reasonably differ. Trust a fresh run over this paragraph.
- `thoth-drawing` and `thoth-services` have no `STATUS.md`/`GAPS.md` yet.
  When they gain one, fold a summary row's worth of detail into the table
  above the same way `thoth-planning`/`thoth-civil`/`thoth-survey`'s were —
  don't guess at their contents in the meantime.
- The wasm artifacts under `apps/web/src/wasm/` are committed generated
  output, not source. If `thoth-spatial` or `thoth-bindings` changes, they
  go stale until someone runs `yarn build:wasm` and commits the result —
  there is currently no CI check enforcing freshness (a reasonable
  follow-up: a CI step that runs `yarn build:wasm` and fails on a non-empty
  `git diff`).
- The compiled wasm binary is ~99 KB — not egregious for a proof-of-concept,
  but not shrunk with `wasm-opt` either. A follow-up pass wiring `wasm-opt`
  into `scripts/build-wasm.sh` would reduce it further before this pattern
  is extended to more functions.

## How to extend this migration

- **Porting more TS to Rust:** pick up work in one of the five domain
  crates per their own `STATUS.md`/`GAPS.md` "not-yet-ported" rows. New
  business logic belongs in Rust going forward — see the "Rust migration"
  note added to the root `CLAUDE.md`'s Rules of Engagement.
- **Binding more of the stable slice to JS:** follow the "Extending the
  wasm slice" / native-addon sections in `crates/README.md`.
- **Cutting over more `apps/web` call sites:** same pattern as
  `PlatDrawing.tsx` — a typed wrapper in `apps/web/src/lib/`, a
  prefer-wasm-fallback-to-TS helper for anything on a render path, and a
  Vitest equivalence test against the `--target nodejs` package. Do this
  incrementally, one well-isolated call site at a time; a blind broad
  cutover across `apps/web`'s ~235 TypeScript files is explicitly out of
  scope for this kind of pass.
