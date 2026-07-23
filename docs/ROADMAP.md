# Roadmap

A phased plan for taking Thoth Blueprint from an archived database-design tool to a
cloud site & community planning platform. Status reflects the current state of the
repository and will be updated as work lands.

**Legend:** ✅ done · 🟡 in progress · ⚪ planned

## Phase 0 — Realignment _(current)_

Reframe the repository and set the foundation for the new product.

- ✅ Archive the original DB-design app under `artifact/` (history preserved).
- ✅ Rewrite product docs (README, CONTRIBUTING) for the planning platform.
- ✅ Author vision, architecture, glossary, and migration docs.
- ✅ Establish agent/automation guidance (`CLAUDE.md`, `.claude/`).
- ✅ Scaffold the monorepo (`apps/`, `services/`, `packages/domain`).
- 🟡 Stand up build/test tooling per workspace and CI jobs alongside `artifact-build`.
- 🟡 **Rust migration underway:** business logic in `packages/domain` and
  `services/*` is being ported to a Cargo workspace under `crates/` (see
  [`docs/RUST_MIGRATION.md`](RUST_MIGRATION.md) for per-crate status).
  `thoth-spatial` (spatial foundation) is complete; `thoth-planning`,
  `thoth-survey`, and `thoth-civil` have substantial ported+tested surface
  with documented gaps; `thoth-drawing` and `thoth-services` are earlier in
  the port. The integration layer (`crates/thoth-bindings` for
  `apps/web` via wasm-bindgen, `crates/thoth-napi` for `services/*` via
  napi-rs, root-level `build:rust`/`build:wasm`/`test:rust` scripts, and a
  `rust-workspace` CI job) is wired end-to-end for one vertical slice
  (pure geometry ops), with one real `apps/web` call site cut over as
  proof. This does not change Phase 1-6 scope below; it changes where new
  domain logic should be written (Rust, going forward; see `CLAUDE.md`).

## Phase 1 — Domain model foundation

Make the planning vocabulary real and testable before any UI is built on it.

- ✅ Spatial foundation: coordinate reference systems, units, scale, geometry types.
- ✅ Layers and layer ordering.
- ✅ Core primitives: `Site`, `Parcel`, `Lot`, `Zone`, `LandUse` (plus `Block`,
  `Building`, `RightOfWay`, `Easement`, `OpenSpace`).
- ✅ Basic rules: area/perimeter, setbacks (buildable envelope), simple subdivision.
- ✅ Metrics: coverage, density, FAR, land-use breakdown, impervious/open-space ratios.
- ✅ Unit tests for the model (geometry + metrics).

## Phase 2 — Single-player cloud workspace

A usable, server-backed planning canvas for one user.

- ✅ `apps/web` canvas: draw/edit parcels, zones, lots, land uses, buildings, and
  ROW with snapping, vertex editing, and measurement.
- ✅ Enterprise right-click context menu system (`FE-CTX-001`): dynamic entity property inspection & instant context actions.
- ✅ Fortune 100 Playwright E2E test suite (38 test cases, 100% pass rate).
- ✅ Layer panel and land-use styling.
- ✅ Live metrics panel driven by the domain model.
- ✅ Checkpoints: named snapshots with restore (carried forward from the archive).
- 🟡 Server persistence via a swappable `ApiClient` — the workspace targets a
  cloud API interface, currently backed by a local (browser) implementation
  pending the real services below.
- ⚪ `services/auth`: sign-in, organizations, basic roles.
- 🟡 `services/projects`: create/open/save projects; server persistence via
  `packages/storage` (SQLite by default, swappable for an enterprise backend
  later).

## Phase 3 — Interoperability

Fit into planners' existing ecosystems.

- ⚪ Import: GeoJSON, KML, Shapefile.
- ⚪ Import: DXF/DWG basemaps.
- ⚪ Export: GeoJSON, KML, PDF exhibits.
- ⚪ Coordinate-system transforms in `services/geospatial`.

## Phase 4 — Collaboration & review

Turn it into a true multi-player, review-ready platform.

- ⚪ `services/collaboration`: real-time co-editing and presence.
- ⚪ Comments and review threads anchored to plan elements.
- ⚪ Sharing model: view/comment/edit links; public read-only plans.
- ⚪ Versioning and audit trail suitable for public review.

## Phase 5 — Analysis & community planning depth

Deepen the planning intelligence.

- ✅ Zoning envelopes and compliance checks.
- 🟡 Land-use allocation tools and program tracking (allocation metrics done).
- ✅ Infrastructure networks (roads, utilities) as connected primitives.
- ✅ Terrain, contours, slope analysis, and cut/fill grading (`packages/domain/terrain.ts`).
- ✅ Landscape elements (water, planting, trees) and large-scale `Region` tier.
- ✅ Community metrics (population, density, service/park levels of service).
- ⚪ Scenario comparison (alternatives side by side).
- ⚪ Community engagement views (simplified, comment-first).

## Phase 6 — Architecture & engineering CAD sheets

Turn a live plan into a complete, printable, standards-conformant CAD sheet set.

- ⚪ Sheet composition & layouts
- ⚪ Title blocks & ISO data fields
- ⚪ Discipline-organised sheet sets (US NCS / AIA)
- ⚪ CAD layer standards (NCS/AIA & ISO 13567)
- ⚪ Annotative dimensions & callouts
- ⚪ Reusable symbol library & DWG block import
- ⚪ Column-grid & level datums
- ⚪ Coordination graphics & match-lines
- ⚪ Data-driven schedules & tables
- ⚪ Revision clouds & issue management
- ⚪ Multi-sheet PDF / DXF / DWG export
