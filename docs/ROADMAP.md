# Roadmap

A phased plan for taking Thoth Blueprint from an archived database-design tool to a
cloud site & community planning platform. Status reflects the current state of the
repository and will be updated as work lands.

**Legend:** âœ… done Â· ðŸŸ¡ in progress Â· â¬œ planned

## Phase 0 â€” Realignment _(current)_

Reframe the repository and set the foundation for the new product.

- âœ… Archive the original DB-design app under `artifact/` (history preserved).
- âœ… Rewrite product docs (README, CONTRIBUTING) for the planning platform.
- âœ… Author vision, architecture, glossary, and migration docs.
- âœ… Establish agent/automation guidance (`CLAUDE.md`, `.claude/`).
- âœ… Scaffold the monorepo (`apps/`, `services/`, `packages/domain`).
- ðŸŸ¡ Stand up build/test tooling per workspace and CI jobs alongside `artifact-build`.

## Phase 1 â€” Domain model foundation

Make the planning vocabulary real and testable before any UI is built on it.

- âœ… Spatial foundation: coordinate reference systems, units, scale, geometry types.
- âœ… Layers and layer ordering.
- âœ… Core primitives: `Site`, `Parcel`, `Lot`, `Zone`, `LandUse` (plus `Block`,
  `Building`, `RightOfWay`, `Easement`, `OpenSpace`).
- âœ… Basic rules: area/perimeter, setbacks (buildable envelope), simple subdivision.
- âœ… Metrics: coverage, density, FAR, land-use breakdown, impervious/open-space ratios.
- âœ… Unit tests for the model (geometry + metrics).

## Phase 2 â€” Single-player cloud workspace

A usable, server-backed planning canvas for one user.

- âœ… `apps/web` canvas: draw/edit parcels, zones, lots, land uses, buildings, and
  ROW with snapping, vertex editing, and measurement.
- âœ… Layer panel and land-use styling.
- âœ… Live metrics panel driven by the domain model.
- âœ… Checkpoints: named snapshots with restore (carried forward from the archive).
- ðŸŸ¡ Server persistence via a swappable `ApiClient` â€” the workspace targets a
  cloud API interface, currently backed by a local (browser) implementation
  pending the real services below.
- â¬œ `services/auth`: sign-in, organizations, basic roles.
- â¬œ `services/projects`: create/open/save projects; server persistence.

## Phase 3 â€” Interoperability

Fit into planners' existing ecosystems.

- â¬œ Import: GeoJSON, KML, Shapefile.
- â¬œ Import: DXF/DWG basemaps.
- â¬œ Export: GeoJSON, KML, PDF exhibits.
- â¬œ Coordinate-system transforms in `services/geospatial`.

## Phase 4 â€” Collaboration & review

Turn it into a true multi-player, review-ready platform.

- â¬œ `services/collaboration`: real-time co-editing and presence.
- â¬œ Comments and review threads anchored to plan elements.
- â¬œ Sharing model: view/comment/edit links; public read-only plans.
- â¬œ Versioning and audit trail suitable for public review.

## Phase 5 â€” Analysis & community planning depth

Deepen the planning intelligence.

- âœ… Zoning envelopes and compliance checks.
- ðŸŸ¡ Land-use allocation tools and program tracking (allocation metrics done).
- âœ… Infrastructure networks (roads, utilities) as connected primitives.
- âœ… Terrain, contours, slope analysis, and cut/fill grading (`packages/domain/terrain.ts`).
- âœ… Landscape elements (water, planting, trees) and large-scale `Region` tier.
- âœ… Community metrics (population, density, service/park levels of service).
- â¬œ Scenario comparison (alternatives side by side).
- â¬œ Community engagement views (simplified, comment-first).

## Phase 6 â€” Architecture & engineering CAD sheets

Turn a live plan into a complete, printable, standards-conformant CAD sheet set â€”
architecture and engineering drawings suitable for design review, permit,
issued-for-construction, and record deliverables. This is where the platform
crosses the line from "planning workspace" to "produces CAD drawings" and
therefore expands what was previously a scope non-goal.

- â¬œ **Sheet composition** â€” layouts (paper space), viewports at explicit plot
  scales, viewport clipping and layer overrides, sheet-relative annotation
  (annotative scaling for text, dimensions, symbols).
- â¬œ **Title blocks** â€” reusable title-block templates conformant with
  ANSI/ASME Y14.1 (Arch Aâ€“E1) and ISO 5457 sheet sizes and ISO 7200 title-block
  data fields; per-project data binding (project name, address, seals,
  approvals, dates).
- â¬œ **Discipline-organised sheet sets** â€” US National CAD Standard v6 discipline
  designators (G Â· H Â· V Â· B Â· C Â· L Â· S Â· A Â· I Â· Q Â· F Â· P Â· D Â· M Â· E Â· T Â· R
  Â· X Â· Z Â· O) and sheet-type numbering (0-general Â· 1-plans Â· 2-elevations Â·
  3-sections Â· 4-enlarged Â· 5-details Â· 6-schedules Â· 9-3D); auto-generated
  sheet index and discipline covers.
- â¬œ **CAD layer standards** â€” NCS/AIA layer names, ISO 13567 layer fields; layer
  colour, line weight, line type, plot style (CTB/STB) tables; per-viewport
  layer overrides.
- â¬œ **Dimensions & annotations** â€” annotative dimensions (linear, aligned,
  angular, radial, ordinate, arc-length), text with annotation scale, callouts,
  leaders per ISO 128/129/3098; tolerances table pinning plot text height and
  arrowhead sizes.
- â¬œ **Symbol library** â€” reusable blocks/symbols with attributes (grid bubbles,
  section/elevation/detail markers, revision clouds and delta tags, match lines,
  north arrows, scale bars); import third-party block libraries (DWG).
- â¬œ **Grids & levels** â€” building column-grid and level datum models that
  render as bubble-tagged reference lines on every applicable sheet.
- â¬œ **Coordination graphics** â€” section/elevation/detail callouts wired to the
  destination sheet/drawing number; match-lines auto-tagged with the adjacent
  sheet; cross-references remain valid when sheets are renumbered.
- â¬œ **Schedules & tables** â€” data-driven door, window, room/finish, panel,
  fixture, equipment schedules whose rows are the same domain objects rendered
  on the plans; live filtering, sorting, and formulas.
- â¬œ **Revisions & issue management** â€” revision clouds with delta tags, per-sheet
  revision blocks, named issue sets ("For Permit", "For Bid",
  "Issued for Construction", "As-Built") stamping every sheet on release.
- â¬œ **Export & packaging** â€” multi-sheet PDF (incl. PDF/A and PDF/E-1 for
  archival/permit), DXF/DWG sheet-set export with layouts/xrefs/plot-styles
  preserved, per-issue release packaging with a manifest and checksums.
- â¬œ **Sheet-set navigation** â€” sheet-set browser (project navigator) with
  filters by discipline, phase, and issue; batch-plot the whole set or a
  filtered subset.

## Non-goals (for now)

- Mechanical/product CAD (MCAD), parametric part modeling.
- Full GIS analysis suite â€” we interoperate with GIS, not replace it.
- Detailed **engineering calculations** on the sheets themselves â€” structural
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

---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](file:///f:/AutoCAD%20Competitor/docs/requirements/README.md)
- [Master Requirements Traceability Matrix (RTM)](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/traceability-matrix.md)
- [Requirements Coverage Report](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/unimplemented_requirements.md)
- [Frontend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/frontend-requirements.md)
- [Backend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/backend-requirements.md)
- [Domain Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/domain-requirements.md)
- [Interoperability Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/03-nonfunctional/nonfunctional-requirements.md)

