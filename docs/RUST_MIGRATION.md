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
>
> **Update (interoperability / mock-removal pass):** a third round closed
> the cross-crate integration debt the first two passes had documented as
> "blocked on a sibling crate that wasn't done yet" — those sibling crates
> were all complete by this point. See "Interoperability & mock-removal
> pass" below.


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
| `thoth-services` | Backend logic: auth, projects, geospatial, collaboration, storage | [`STATUS.md`](../crates/thoth-services/STATUS.md) | 104 passing tests. `storage` (trait + memory + SQLite adapters, plus a real but server-untested Postgres adapter), `auth`, `collaboration`, `projects`, and `geospatial` are all real implementations — see `STATUS.md` for the full per-area breakdown. `crates/thoth-napi` now exposes `auth`, `collaboration`, and the Postgres `storage` adapter (see below) — the note that used to be here about it having nothing service-specific to expose is superseded. |
| `thoth-bindings` | **Integration**: wasm-bindgen boundary → `apps/web` | _(this doc + `crates/README.md`)_ | One vertical slice shipped: `area`, `perimeter`, `centroid`, `pointInPolygon`, `offsetPolygon` from `thoth_spatial::geometry`, exported via `wasm-bindgen`, consumed by `apps/web` (real cutover: `PlatDrawing.tsx`'s centroid call — see below). |
| `thoth-napi` | **Integration**: napi-rs boundary → `services/*` (Node) | _(this doc + `crates/README.md`)_ | The geometry slice (proof of pattern), plus real `auth`, `collaboration`, and Postgres `storage` bindings — wired into `services/auth`, `services/collaboration`, and `packages/storage/src/postgresAdapter.ts` respectively. See "What the integration layer actually wired" below. |

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

## Interoperability & mock-removal pass (six parallel agents)

By this point every domain crate from the first two passes was complete
and stable, so this round tackled the "not-yet-ported: blocked on a
sibling crate" debt that was genuinely closeable now, plus two orthogonal
tasks: eliminating the platform's last literal mock/scaffold code, and
auditing the enterprise requirements-traceability suite against reality.

**The key architectural constraint**: the TS originals for
`thoth-civil`/`thoth-survey`/`thoth-planning`/`thoth-drawing` import from
each other in ways that would form a circular crate dependency if ported
naively — Rust can't do that. A single finding broke the tightest cycle:
`thoth-survey`'s `Point2D` turned out to already be
`pub type Point2D = thoth_spatial::Point` (a type alias, not a distinct
type), so `thoth-civil` never actually needed to depend on `thoth-survey`
at all. That enabled a strict, acyclic dependency order for this round:
**`thoth-spatial → thoth-civil → thoth-survey → thoth-planning →
thoth-drawing`** (each arrow = "may depend on"). Every agent got an
explicit allow/forbid list of which sibling crates it could add as a
dependency, so six concurrent agents could extend four different crates
without any of them accidentally introducing a cycle.

| Crate | What closed | Tests |
| --- | --- | --- |
| `thoth-civil` | All 10 previously-blocked files (9 fully, 1 partial — arbitrary JS-string script execution has no Rust equivalent) | 198 (+96) |
| `thoth-survey` | 7 of 10 blocked helpers (added `thoth-civil` dependency); 3 stay blocked needing `thoth-planning`/`thoth-drawing`, which would cycle | 135 (+38) |
| `thoth-drawing` | `defaultSet`, `collada`'s `siteToMeshes`, `platset`'s `collectSiteCurves`, several `builders` composers (added `thoth-planning`+`thoth-survey` deps) | 241 (+34) |
| `thoth-planning` | Element geometry algorithms (stairs/curtainwall/doorwindow/roof, each citing IBC/IRC/ADA sections), full GEOID/PLSS compliance port, `Site`'s monuments/plss fields, element factory/meta/search/vertex, 3 of 9 `smart/` modules (added `thoth-civil`+`thoth-survey` deps) | 236 (+117) |
| `thoth-napi` (mock removal) | Real `auth`/`collaboration`/Postgres-`storage` bindings replacing `services/auth`'s and `services/collaboration`'s literal `__SCAFFOLD__ = true` stubs and `packages/storage`'s throwing Postgres adapter | 24 (+19), plus 19 new TS tests |
| `docs/requirements/` (audit) | 45 of 100 `REQ-UNIMP-*` rows got a precise status flip with a code citation (caught a prior overclaim: all 10 Roof requirements were marked "Fully Implemented," only 1 actually is); fixed every broken `file:///f:/AutoCAD%20Competitor/...` absolute-path link in the two files it touched; RTM regenerated, R1–R5 validation still passes | n/a (docs-only) |

**Workspace total after this pass: 1,317 Rust tests, all passing.**
`cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets --
-D warnings`, and `cargo check --workspace` are all clean across all 16
crates. The TS suites (383 domain + 47 storage, up from 41 after the mock-
removal pass added Postgres-adapter tests) and `apps/web`'s Vitest suite
remain green.

One real cross-crate fix needed after all six agents finished: `thoth-planning`
adding `monuments`/`plss` fields to `Site` broke two `Site` struct literals
in `thoth-governance` (a crate from the *previous* round that no agent in
this round owned) — fixed by hand (the production `merge_sites` now
carries both fields through from `base` like every other passthrough
field; a test fixture defaults them to `None`). `thoth-drawing`'s own
`Site` literals had already been updated by that agent mid-task after it
noticed the concurrent `thoth-planning` change — a nice bit of emergent
coordination between two agents that never communicated directly.

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

- The original geometry slice (proof of pattern), plus three real,
  service-backed modules added in a follow-up pass once `thoth-services`
  had something stable to expose:
  - `auth.rs` — `thoth_services::auth::AuthService`, backed by a SQLite
    `StorageAdapter` (see the module's docs for why SQLite over an
    in-memory store). Wired into `services/auth`.
  - `collaboration.rs` — `thoth_services::collaboration::CollaborationHub`.
    Wired into `services/collaboration`. Deliberately doesn't expose the
    live event-subscription receiver `CollaborationHub::join` also
    returns — see the module docs for why and what a future pass would
    need to add to stream it out.
  - `storage.rs` — `thoth_services::storage::PostgresStorageAdapter`.
    Wired into `packages/storage/src/postgresAdapter.ts`. Doesn't expose
    `transaction`'s cross-call atomicity — a documented gap, not a
    fabricated success (see the module docs).
  - All three use a **handle-based** design (`registry.rs`): a `u32`
    handle minted by a `create*`/`connect` call, passed to every other
    export, rather than a napi-rs class with `&self` async methods — see
    `registry.rs`'s module docs for why that shape was chosen over the
    class-based alternative napi-rs also supports.
- **Tests:** `cargo test -p thoth-napi` — 24 passing tests (the original 5
  geometry conversion tests, plus `registry`/`auth`/`collaboration`/`storage`
  tests exercising the new modules' logic and registry/handle behavior
  directly on the host target, the same host-target-testable-without-Node
  approach the geometry tests established).
- `scripts/smoke-test-napi.mjs` continues to cover only the geometry slice
  (unchanged); the new `auth`/`collaboration`/`storage` bindings are
  instead proven against the real compiled addon by TypeScript-level Vitest
  suites: `services/auth/src/index.test.ts`,
  `services/collaboration/src/index.test.ts`, and
  `packages/storage/src/postgresAdapter.test.ts`.
- `services/auth/src/index.ts` and `services/collaboration/src/index.ts`
  no longer export `__SCAFFOLD__` — both were rewritten to load the
  compiled `thoth-napi` addon (via `createRequire`, mirroring
  `apps/web/src/lib/geometryWasm.ts`'s loader pattern, adapted for a native
  addon instead of a wasm module) and re-export a typed `AuthService`/
  `CollaborationHub` class backed by it.
- Added to the workspace's `Cargo.toml` `members` list as a new entry in
  the original pass (the only edit made to that file); this follow-up pass
  added `thoth-services` as a `[dependencies]` entry in
  `crates/thoth-napi/Cargo.toml` (no cycle — `thoth-services` doesn't
  depend on `thoth-napi`) and enabled napi's `async`/`serde-json`/
  `dyn-symbols` features (the first two to return real `Promise`s and
  accept/return `serde_json::Value`; `dyn-symbols` to keep `cargo test`
  linkable as a standalone host binary once async codegen references
  N-API symbols a plain executable can't resolve at link time the way a
  Node-loaded `cdylib` can).

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
