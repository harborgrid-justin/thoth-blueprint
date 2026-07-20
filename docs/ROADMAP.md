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

- ✅ Zoning envelopes and compliance checks.
- 🟡 Land-use allocation tools and program tracking (allocation metrics done).
- ✅ Infrastructure networks (roads, utilities) as connected primitives.
- ✅ Terrain, contours, slope analysis, and cut/fill grading (`packages/domain/terrain.ts`).
- ✅ Landscape elements (water, planting, trees) and large-scale `Region` tier.
- ✅ Community metrics (population, density, service/park levels of service).
- ⬜ Scenario comparison (alternatives side by side).
- ⬜ Community engagement views (simplified, comment-first).

## Phase 6 — Architecture & engineering CAD sheets

Turn a live plan into a complete, printable, standards-conformant CAD sheet set —
architecture and engineering drawings suitable for design review, permit,
issued-for-construction, and record deliverables. This is where the platform
crosses the line from "planning workspace" to "produces CAD drawings" and
therefore expands what was previously a scope non-goal.

A cloud-first **Sheet Set Manager** (the SSM analogue) is now in place — modelled
in `packages/domain/sheetset.ts` and driven from the `apps/web` Sheet Set Manager
dialog. It organizes the shared `DrawingSet` into nestable **subsets**, creates /
renames & **renumbers** / reorders / duplicates / deletes sheets (with
**cross-reference integrity** — callouts, section/detail marks, and match lines
follow a renumber), carries **custom properties** (set- or sheet-owned) resolved
into title blocks through a `%<Field>%` **field engine**, saves **named sheet
selections**, and defines named **page setups** for batch **publish** of any
selection to a multi-sheet PDF. See
[CAD-SHEET-SETS.md](CAD-SHEET-SETS.md) for the full AutoCAD Sheet Set Manager
feature-parity map.

- 🟡 **Sheet composition** — layouts (paper space), viewports at explicit plot
  scales, viewport clipping and layer overrides, sheet-relative annotation
  (annotative scaling for text, dimensions, symbols).
- 🟡 **Title blocks** — reusable title-block templates conformant with
  ANSI/ASME Y14.1 (Arch A–E1) and ISO 5457 sheet sizes and ISO 7200 title-block
  data fields; per-project data binding (project name, address, seals,
  approvals, dates).
- 🟡 **Discipline-organised sheet sets** — US National CAD Standard v6 discipline
  designators (G · H · V · B · C · L · S · A · I · Q · F · P · D · M · E · T · R
  · X · Z · O) and sheet-type numbering (0-general · 1-plans · 2-elevations ·
  3-sections · 4-enlarged · 5-details · 6-schedules · 9-3D); auto-generated
  sheet index and discipline covers.
- ⬜ **CAD layer standards** — NCS/AIA layer names, ISO 13567 layer fields; layer
  colour, line weight, line type, plot style (CTB/STB) tables; per-viewport
  layer overrides.
- ⬜ **Dimensions & annotations** — annotative dimensions (linear, aligned,
  angular, radial, ordinate, arc-length), text with annotation scale, callouts,
  leaders per ISO 128/129/3098; tolerances table pinning plot text height and
  arrowhead sizes.
- ⬜ **Symbol library** — reusable blocks/symbols with attributes (grid bubbles,
  section/elevation/detail markers, revision clouds and delta tags, match lines,
  north arrows, scale bars); import third-party block libraries (DWG).
- ⬜ **Grids & levels** — building column-grid and level datum models that
  render as bubble-tagged reference lines on every applicable sheet.
- ⬜ **Coordination graphics** — section/elevation/detail callouts wired to the
  destination sheet/drawing number; match-lines auto-tagged with the adjacent
  sheet; cross-references remain valid when sheets are renumbered.
- ⬜ **Schedules & tables** — data-driven door, window, room/finish, panel,
  fixture, equipment schedules whose rows are the same domain objects rendered
  on the plans; live filtering, sorting, and formulas.
- 🟡 **Revisions & issue management** — revision clouds with delta tags, per-sheet
  revision blocks, named issue sets ("For Permit", "For Bid",
  "Issued for Construction", "As-Built") stamping every sheet on release.
- 🟡 **Export & packaging** — multi-sheet PDF (incl. PDF/A and PDF/E-1 for
  archival/permit), DXF/DWG sheet-set export with layouts/xrefs/plot-styles
  preserved, per-issue release packaging with a manifest and checksums.
- 🟡 **Sheet-set navigation** — sheet-set browser (project navigator) with
  filters by discipline, phase, and issue; batch-plot the whole set or a
  filtered subset. _(Discipline-grouped browser, filters, named selections, and
  batch PDF publish are implemented; DXF/DWG archive export is still planned.)_

## Non-goals (for now)

- Mechanical/product CAD (MCAD), parametric part modeling.
- Full GIS analysis suite — we interoperate with GIS, not replace it.
- Detailed **engineering calculations** on the sheets themselves — structural
  analysis, stormwater/hydraulic sizing, load calcs, energy modelling. Sheet
  production and the drafted deliverable are in scope (Phase 6); the analyses
  that would populate those sheets are out of scope and expected to be
  performed in specialist tools and imported.
- **3D BIM authoring** (IFC/Revit-class object modelling). Sheets are 2D
  compositions of the planning-domain model; a future IFC import may inform
  sheet content but is not a Phase-6 promise.

> Phases are sequenced but not rigid; the domain model (Phase 1) is the gating
> dependency for most later work. Contributions that advance Phase 1 are the most
> valuable right now. Phase 6 depends on Phase 2 (workspace), Phase 3 (interop),
> and the Phase-5 zoning/envelope work being in place.
