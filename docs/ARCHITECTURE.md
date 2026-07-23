# Architecture

This document describes the intended system design for the Thoth Blueprint cloud
planning platform. It is a **target architecture**: the repository currently
contains the scaffold and a growing implementation. Where something is not built
yet, it's marked _(planned)_.

## Shape of the system

Thoth Blueprint is a cloud service with a browser client, a set of backend
services, and a shared, framework-agnostic domain model.

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚            apps/web (client)            â”‚
                    â”‚  planning canvas Â· layers Â· review UI   â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                        â”‚  (API + realtime)
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â–¼               â–¼               â–¼               â–¼                  â–¼
 services/auth   services/projects  services/geospatial services/collaboration
 identity &      projects, versions coordinate systems, real-time editing,
 access          checkpoints        layers, spatial ops presence, comments
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                        â–¼
                              packages/domain
                    planning primitives + rules (no I/O, no UI)
```

## Modules

### `packages/domain` â€” the planning domain model

The heart of the product and the one place that must stay clean. It is
**framework-agnostic**: no React, no server framework, no database driver. It
defines planning primitives and the rules over them so that every other module â€”
client, services, importers, exporters â€” speaks the same language.

Core concepts (see [GLOSSARY.md](GLOSSARY.md) for definitions):

- **Spatial foundation** â€” coordinate reference systems, units, scale, geometry
  (points, polylines, polygons), and layers.
- **Planning primitives** â€” `Site`, `Parcel`, `Lot`, `Zone`, `LandUse`,
  `RightOfWay`, `Setback`, and infrastructure networks.
- **Rules & metrics** â€” subdivision, setback/envelope computation, land-use
  allocation, density and coverage metrics, and validation of planning constraints.
- **Sheet & drawing production (Phase 6)** â€” `Sheet`, `Layout`, `Viewport`,
  `TitleBlock`, `SheetSet`, `Symbol`, `Dimension`, annotation with annotative
  scaling, `ColumnGrid`, `LevelDatum`, `MatchLine`, `Callout`, data-driven
  `Schedule`, `RevisionCloud`, and `IssueSet` â€” the framework-agnostic model
  of the CAD sheets that the client composes and the services render, wired
  to the same planning primitives above so a plan edit propagates to every
  sheet that shows it.

### `apps/web` â€” the planning workspace (client)

The browser application: a fast canvas for precise drawing and editing (snapping,
measurement, constraints), layer management, land-use styling, metrics panels, and
review/commenting UI. It renders and manipulates domain objects and talks to the
services over an API and a realtime channel.

The archived app under `artifact/` is a strong reference for canvas interaction
(React Flow), state orchestration (Zustand), and import/export ergonomics â€” reused
as patterns, re-implemented cloud-first.

**Sheet generation** (`apps/web/src/features/sheets`) uses a render-agnostic
intermediate representation: a sheet is built once into a list of `SheetPrimitive`
values (points), which two renderers consume â€” an SVG renderer for on-screen
preview and a `pdf-lib` renderer for multi-page vector PDF export. Because both
read the same primitive scene, the exported PDF is a true vector match of the
preview. `pdf-lib` is the only client dependency added for this.

### `services/` â€” cloud backend

- **`auth`** â€” identity, organizations/teams, roles, and access control.
- **`projects`** â€” project lifecycle, persistence, versioning, and checkpoints
  (the "save a snapshot and roll back" capability, now server-side and shared);
  also owns Phase-6 sheet-set persistence side of the split: **title-block and
  symbol-library templates**, **schedule extraction**, and **issue-set
  packaging** (`BE-TEMPLATE`, `BE-SCHEDULE`, `BE-PACKAGE`).
- **`geospatial`** â€” coordinate-system transforms, layer storage, spatial queries,
  and import/export of GeoJSON/KML/Shapefile/DXF; also owns Phase-6 sheet
  **composition rendering** and **plot orchestration** (`BE-SHEET`, `BE-PLOT`)
  and the multi-sheet DXF/DWG/PDF sheet-set formats (`IOP-DXFSHEET`,
  `IOP-PDFSHEET`, `IOP-PLTSTYLE`, `IOP-LAYERMAP`, `IOP-TITLEBLOCK`, `IOP-BLOCK`).
- **`collaboration`** â€” real-time multi-user editing, presence, and comments/review
  threads.

Service boundaries are logical; how they are deployed (separate services vs. a
modular monolith to start) is an implementation decision captured in the roadmap.
The Phase-6 CAD-sheet capability adds new logical areas inside the existing
`projects` and `geospatial` services â€” no new top-level service is introduced.

### `crates/` — the Rust core _(migration in progress)_

The business logic in `packages/domain` and `services/*` is being ported to
a Cargo workspace under [`crates/`](../crates/README.md); see
[`docs/RUST_MIGRATION.md`](RUST_MIGRATION.md) for the current per-crate
status. The workspace mirrors the TS module split:

```
crates/thoth-spatial    -- frozen shared contract: geometry, units, ids
crates/thoth-planning   -- Site/Parcel/Lot/Zone/LandUse, rules, metrics, subdivision
crates/thoth-survey     -- metes-and-bounds, PLSS, monuments, points
crates/thoth-civil      -- alignments, corridors, grading, terrain, pipe/network design
crates/thoth-drawing    -- sheets, dimensions, hatching, schedules, plat sets
crates/thoth-services   -- auth, projects, geospatial, collaboration, storage logic
crates/thoth-bindings   -- wasm-bindgen boundary to apps/web
crates/thoth-napi       -- napi-rs boundary to services/* (Node)
```

`thoth-spatial` is the one crate every other crate depends on and treats as
append-only (see `crates/README.md`'s "frozen-contract convention") — this
is what let the five domain crates be ported concurrently by different
agents against the same TS source tree without diverging onto incompatible
geometry/unit primitives.

`thoth-bindings` and `thoth-napi` are the integration layer connecting the
Rust core to the rest of the diagram at the top of this document:

- **`apps/web`** consumes `thoth-bindings` via a generated `wasm-bindgen`
  package (`yarn build:wasm`), imported as an ordinary ES module and typed
  against a hand-written TS wrapper (`apps/web/src/lib/geometryWasm.ts`).
  As of this writing this is a **single vertical slice** (the pure geometry
  ops — area/perimeter/centroid/point-in-polygon/offset-polygon) with one
  real call site cut over (`PlatDrawing.tsx`'s centroid computation,
  falling back to the TS implementation if wasm hasn't loaded) — not a
  claim that `apps/web` runs on Rust broadly yet.
- **`services/*`** will eventually consume `thoth-services` via
  `thoth-napi`, a native Node addon built with `napi-rs`. As of this
  writing `thoth-services` is still mid-port, so `thoth-napi` exposes only
  the same stable geometry slice as `thoth-bindings`, as a proof that the
  native-addon build pipeline works — not yet wired into any `services/*`
  package.

Both binding crates follow the same shape: thin, panic-safe wrappers around
already-tested domain functions, with the (de)serialization boundary itself
covered by dedicated tests (see `crates/README.md` for exactly how, since
the two binding technologies need different test strategies).

### `packages/storage` â€” the default internal storage layer

Every service persists through a single `StorageAdapter` interface
(`list`/`get`/`put`/`delete`/`clear`/`transaction` over named collections)
instead of talking to a database driver directly. The default implementation
is a local SQLite file â€” no server process, installed as a normal npm
dependency (`better-sqlite3`) â€” which is enough for local development and
small deployments. An in-memory adapter backs tests.

This is the seam for growing into a larger enterprise backend later: a
Postgres (or other) adapter implements the same `StorageAdapter` interface
and is selected with `STORAGE_DRIVER`, with no changes at any call site. See
[`packages/storage/README.md`](../packages/storage/README.md) for the
adapter contract and the migration notes.

## Key architectural decisions

| Decision | Rationale |
| --- | --- |
| **Cloud-first, not offline-first** | Collaboration, review, and shared source of truth are core. This reverses the archived app's offline-first constraint. Offline-tolerant editing may return later as an enhancement, not a foundation. |
| **Domain model isolated from I/O and UI** | Lets the same planning rules run in the client, services, and tooling; keeps the model testable and portable. |
| **Spatial explicitness** | Coordinate systems and units are always attached to geometry. Prevents the "unitless rectangle" failure mode of generic drawing tools. |
| **Interop as a first-class service** | Planners won't adopt a tool that can't read/write their formats. Import/export lives in `geospatial`, not as an afterthought. |
| **Monorepo** | Shared domain model + multiple apps/services benefit from atomic changes and a single source of truth. |

## Data & collaboration model _(planned)_

- Projects are server-persisted and versioned; **checkpoints** capture named
  snapshots for safe experimentation and review, carried forward as a concept from
  the archived app.
- Real-time editing uses a conflict-resolution strategy (CRDT or OT â€” to be
  decided in the collaboration service) so multiple planners can edit one plan.
- An audit trail records changes for governance and public-review contexts.

## Relationship to `artifact/`

`artifact/` is the archived, read-only original database-design app. It shares no
runtime with the new platform. It is retained for its history and as a pattern
reference. Do not import from it or extend it for new features. See
[MIGRATION.md](MIGRATION.md).

---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](requirements/README.md)
- [Master Requirements Traceability Matrix (RTM)](requirements/04-traceability/traceability-matrix.md)
- [Requirements Coverage Report](requirements/04-traceability/coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](requirements/04-traceability/unimplemented_requirements.md)
- [Frontend Functional Requirements](requirements/02-functional/frontend-requirements.md)
- [Backend Functional Requirements](requirements/02-functional/backend-requirements.md)
- [Domain Functional Requirements](requirements/02-functional/domain-requirements.md)
- [Interoperability Requirements](requirements/02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](requirements/03-nonfunctional/nonfunctional-requirements.md)

