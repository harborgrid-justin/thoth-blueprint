# Roadmap

A phased plan for taking Thoth Blueprint from an archived database-design tool to a
cloud site & community planning platform. Status reflects the current state of the
repository and will be updated as work lands.

**Legend:** ✅ done · 🟡 in progress · ⬜ planned

## Phase 0 — Realignment _(current)_

Reframe the repository and set the foundation for the new product.

- ✅ Archive the original DB-design app under `artifact/` (history preserved).
- ✅ Rewrite product docs (README, CONTRIBUTING) for the planning platform.
- ✅ Author vision, architecture, glossary, and migration docs.
- ✅ Establish agent/automation guidance (`CLAUDE.md`, `.claude/`).
- ✅ Scaffold the monorepo (`apps/`, `services/`, `packages/domain`).
- 🟡 Stand up build/test tooling per workspace and CI jobs alongside `artifact-build`.

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
- ✅ Layer panel and land-use styling.
- ✅ Live metrics panel driven by the domain model.
- ✅ Checkpoints: named snapshots with restore (carried forward from the archive).
- 🟡 Server persistence via a swappable `ApiClient` — the workspace targets a
  cloud API interface, currently backed by a local (browser) implementation
  pending the real services below.
- ⬜ `services/auth`: sign-in, organizations, basic roles.
- ⬜ `services/projects`: create/open/save projects; server persistence.

## Phase 3 — Interoperability

Fit into planners' existing ecosystems.

- ⬜ Import: GeoJSON, KML, Shapefile.
- ⬜ Import: DXF/DWG basemaps.
- ⬜ Export: GeoJSON, KML, PDF exhibits.
- ⬜ Coordinate-system transforms in `services/geospatial`.

## Phase 4 — Collaboration & review

Turn it into a true multi-player, review-ready platform.

- ⬜ `services/collaboration`: real-time co-editing and presence.
- ⬜ Comments and review threads anchored to plan elements.
- ⬜ Sharing model: view/comment/edit links; public read-only plans.
- ⬜ Versioning and audit trail suitable for public review.

## Phase 5 — Analysis & community planning depth

Deepen the planning intelligence.

- ⬜ Zoning envelopes and compliance checks.
- ⬜ Land-use allocation tools and program tracking.
- ⬜ Infrastructure networks (roads, utilities) as connected primitives.
- ⬜ Scenario comparison (alternatives side by side).
- ⬜ Community engagement views (simplified, comment-first).

## Non-goals (for now)

- Mechanical/product CAD (MCAD), parametric part modeling.
- Full GIS analysis suite — we interoperate with GIS, not replace it.
- Detailed construction documentation / engineering deliverables.

> Phases are sequenced but not rigid; the domain model (Phase 1) is the gating
> dependency for most later work. Contributions that advance Phase 1 are the most
> valuable right now.
