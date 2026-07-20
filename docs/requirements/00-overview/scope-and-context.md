# Scope, Context & Constraints

This document bounds the requirements suite: what the system is meant to do, what
it explicitly is not, the actors and external systems it touches, and the
constraints and assumptions every requirement is written under.

## Purpose

Thoth Blueprint is a **cloud-based platform for site planning and community
planning** â€” a collaborative, web-native alternative to traditional CAD, scoped
to land, sites, and neighborhoods. See [`VISION.md`](../../VISION.md) for the full
product rationale. This suite translates that vision into **traceable,
verifiable requirements** spanning the frontend workspace, the backend services,
the shared domain model, and interoperability.

## In scope

- A browser planning workspace: precise drawing/editing of planning geometry,
  layers, land-use styling, measurement, and live metrics.
- Cloud services: identity & access, project persistence & versioning,
  geospatial transforms & storage, and real-time collaboration & review.
- A framework-agnostic planning **domain model**: spatial foundation, planning
  primitives (`Site`, `Parcel`, `Lot`, `Zone`, `LandUse`, `Right-of-Way`,
  `Setback`, zoning envelope, infrastructure network), and rules/metrics.
- Interoperability with the formats planners use: GeoJSON, KML/KMZ, Shapefile,
  DXF/DWG (basemaps and sheet-set import/export), GeoPackage, PDF exhibits, CSV.
- **Architecture & engineering CAD sheet production** (Phase 6): composed,
  standards-conformant multi-sheet drawing sets with title blocks, viewports,
  annotative dimensions and text, discipline-organised sheet numbering
  (US National CAD Standard), CAD layer standards (NCS/AIA/ISO 13567), symbol
  libraries, grids/levels, coordination callouts, match lines, data-driven
  schedules (door/window/room/finish/panel), revision management, and
  packaged plot output (multi-sheet PDF, DXF/DWG sheet sets).

## Out of scope (non-goals)

Mirrors [`ROADMAP.md`](../../ROADMAP.md) non-goals; requirements are **not**
written for these:

- Mechanical/product CAD (MCAD), parametric part modeling.
- A full GIS analysis suite â€” the platform interoperates with GIS, it does not
  replace it.
- **Engineering calculations on the sheets themselves** â€” structural analysis,
  stormwater/hydraulic sizing, load calcs, energy modelling. Sheet production
  and the drafted deliverable are in scope (Phase 6); the analyses that would
  populate those sheets are expected to be performed in specialist tools and
  imported.
- **Grading and earthwork engineering** (cut/fill optimization, TIN/terrain
  surface design, machine-guidance output).
- **Corridor / alignment design** (horizontal/vertical road alignments, profiles,
  corridor models).
- **Procedural 3D city generation** and detailed 3D building/facade modeling.
- **3D BIM authoring** (IFC/Revit-class object modelling). Sheets are 2D
  compositions of the planning-domain model; IFC/BIM ingest may inform sheet
  content in a later phase but is not a Phase-6 promise.
- **Financial pro forma / cost estimating.** Feasibility here is spatial
  (yield/FAR/coverage/density), not financial.
- **Predictive simulation** (travel-demand, environmental, or market simulation).
- Native mobile or desktop-installed applications (the client is web-first).

> These exclusions are also reflected in the
> [competitive analysis](competitive-analysis.md#deliberate-exclusions); the
> platform **interoperates** with tools that do this work rather than reproducing
> it.

## System context

```
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚  Planners &  â”‚        â”‚  Community &        â”‚
        â”‚  reviewers   â”‚        â”‚  public stakeholdersâ”‚
        â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
               â”‚  browser (view/edit/comment)         â”‚
               â–¼                                       â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚            apps/web  (planning workspace)          â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                        â”‚ API + realtime
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚  services/auth Â· projects Â· geospatial Â· collaboration â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                        â”‚ shared model
                  packages/domain
                        â”‚
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â–¼                    â–¼                     â–¼
 Identity provider   External formats     Basemap / tile
 (OIDC, planned)     (GeoJSON, KML, SHP,  providers
                      DXF, GPKG, PDF, CSV) (planned)
```

## Actors

| Actor | Description | Primary needs |
| --- | --- | --- |
| **Site planner / civil designer** | Lays out parcels, lots, and roads (planning layout, not grading/earthwork engineering â€” see non-goals). | Precision drawing, subdivision, metrics, DXF/GeoJSON interop. |
| **Urban / community planner** | Neighborhoods, zoning, land-use mixes, corridors. | Zones, land-use allocation, density/coverage, scenarios. |
| **Municipality / review board** | Reviews and governs plans. | Collaborative review, versioning, audit trail, public sharing. |
| **Developer / architect** | Early feasibility and site concepts. | Fast massing/envelopes, quick metrics, export exhibits. |
| **Community stakeholder** | Non-CAD public participant. | View & comment on plans without special software. |
| **Organization admin** | Manages team, roles, projects. | Accounts, roles, access control, org settings. |
| **System / integrator** | Automation & external systems. | Public API, import/export, self-hosting. |

## External interfaces

- **Identity provider** _(planned)_ â€” OIDC/OAuth2 for sign-in and SSO.
- **File formats** â€” GeoJSON, KML/KMZ, Shapefile, DXF/DWG, GeoPackage, CSV, PDF.
- **Coordinate reference systems** â€” EPSG registry (geographic and projected,
  incl. US State Plane, UTM, Web Mercator).
- **Basemap / tile providers** _(planned)_ â€” raster/vector tiles for context.

## Constraints & assumptions

Constraints bound the solution space and are traced from by requirements that
exist because of them.

| ID | Constraint / assumption | Source |
| --- | --- | --- |
| `CON-001` | The client shall be **web-first**: no installed desktop or native mobile app is required to view, edit, or comment on a plan. | [VISION](../../VISION.md) principle 1 |
| `CON-002` | The system shall be **cloud-first, not offline-first**; shared server state is the source of truth. Offline-tolerant editing is a later enhancement, not a foundation. | [ARCHITECTURE](../../ARCHITECTURE.md) |
| `CON-003` | `packages/domain` shall remain **framework-agnostic**: no React, no server framework, no database driver. | [CLAUDE.md](../../../CLAUDE.md) rule 2 |
| `CON-004` | All geometry shall carry a **coordinate reference system, units, and scale**; unitless shapes are invalid. | [VISION](../../VISION.md) principle 3 |
| `CON-005` | The platform shall be **domain-native**: planning objects are first-class, not anonymous shapes. | [VISION](../../VISION.md) principle 2 |
| `CON-006` | The project is a **monorepo**; each workspace owns its `package.json` and scripts. | [CLAUDE.md](../../../CLAUDE.md) |
| `CON-007` | The product is **licensed GPLv3** and shall be inspectable, extensible, and self-hostable. | [VISION](../../VISION.md) principle 7 |
| `CON-008` | The archived app under `artifact/` is **read-only reference**; new features shall not import from or extend it. | [MIGRATION](../../MIGRATION.md) |
| `CON-009` | Implementation is **TypeScript, strict**; `any` is avoided in favor of explicit domain types. | [CLAUDE.md](../../../CLAUDE.md) |
| `CON-010` | Delivery is **phased, domain-model first** (Phase 1 gates most later work). | [ROADMAP](../../ROADMAP.md) |
| `CON-011` | CAD sheet production shall conform to recognised industry standards for sheet sizes (ANSI/ASME Y14.1 Â· ISO 5457), title-block data fields (ISO 7200), layer organisation (US National CAD Standard v6 / AIA Layer Guidelines Â· ISO 13567), and drawing conventions (ISO 128 / ISO 129 / ISO 3098) rather than a house-only convention. | Phase 6 sheet production; [`_meta/research-cad-sheets.md`](../_meta/research-cad-sheets.md) |
| `CON-012` | CAD sheets shall be **compositions of the shared planning domain model** (`packages/domain`), not a separate authoring model; a change to a modelled object flows to every sheet that shows it. | Phase 6 sheet production; [ARCHITECTURE](../../ARCHITECTURE.md) |

## Dependencies & assumptions

External systems and platform capabilities the product leans on. Each is a risk
the whole system depends on; requirements that assume one trace to it (`DEP-â€¦`),
and each names the degraded behavior if the dependency is unavailable â€” important
for self-hosting substitution.

| ID | Dependency / assumption | Degraded behavior if absent | Traced by |
| --- | --- | --- | --- |
| `DEP-001` | An external **OIDC/OAuth2 identity provider** for sign-in. | Public read-only/comment share links remain viewable; authenticated editing is unavailable. | `BE-AUTH-001` |
| `DEP-002` | An **EPSG registry / coordinate-transformation library** for CRS definitions and datum transforms. | CRS assignment/reprojection and area/distance-correct metrics are unavailable. | `BE-GEO-001`, `DOM-CRS-002` |
| `DEP-003` | A **basemap / tile provider** for contextual imagery _(planned)_. | The plan renders without a contextual basemap; all planning geometry still works. | `BE-GEO-005`, `FE-NAV-003` |
| `DEP-004` | A modern **evergreen browser** providing Canvas/WebGL rendering, WebSocket (presence), and the File API (import). | The workspace is unsupported below the browser matrix (`NFR-COMPAT-005`); no silent degradation. | `apps/web`, `FE-*` |
| `DEP-005` | A **PDF generation runtime** capable of vector output, embedded fonts, layers/optional content, and (for archival releases) PDF/A-2 and PDF/E-1 conformance. | Multi-sheet PDF plot output is unavailable; DXF/DWG export and on-screen sheet composition continue to work. | `BE-SHEET-*`, `IOP-PDFSHEET-*` |
| `DEP-006` | A **CAD interchange library** capable of writing DXF/DWG containing layouts, viewports, xrefs, plot styles, and NCS-conformant layer names. | DXF/DWG sheet-set export is unavailable; PDF sheet export continues to work. | `IOP-DXFSHEET-*` |

## Relationship to other documents

- [`VISION.md`](../../VISION.md) â€” the product and its principles (source of `BR`).
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) â€” modules requirements map onto.
- [`ROADMAP.md`](../../ROADMAP.md) â€” phases requirements are scheduled into.
- [`GLOSSARY.md`](../../GLOSSARY.md) â€” the definitive vocabulary; all defined
  terms come from here.

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

