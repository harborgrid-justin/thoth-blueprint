# Requirements Standards & Conventions

This document defines **how requirements are written, identified, and traced** in
the Thoth Blueprint requirements suite. Every other file in
[`docs/requirements/`](../README.md) follows these rules so the suite stays
consistent and the [Requirements Traceability Matrix](../04-traceability/traceability-matrix.md)
(RTM) can be validated mechanically.

## Governing standards

The suite is structured to align with, without ceremonially reproducing, the
following:

- **ISO/IEC/IEEE 29148:2018** — Requirements engineering. Drives the layering
  (business → stakeholder → system/software requirements), the requirement
  quality rules below, and the traceability discipline.
- **IEEE 830 (historical)** — Software Requirements Specification structure,
  folded into 29148.
- **ISO/IEC 25010** — the product-quality model used to organize the
  [non-functional requirements](../03-nonfunctional/nonfunctional-requirements.md).
- **OGC Simple Features / GeoJSON (RFC 7946)** — geometry and interchange
  semantics referenced by the domain and interoperability requirements.
- **WCAG 2.2 AA** and **OWASP ASVS 4.0** — external criteria referenced by
  accessibility and security NFRs respectively.
- **US National CAD Standard v6 / AIA CAD Layer Guidelines**, **ISO 13567**,
  **ANSI/ASME Y14.1**, **ISO 5457**, **ISO 7200**, and **ISO 128 / 129 / 3098**
  — CAD sheet, layer, title-block, and drawing-convention standards referenced
  by the Phase-6 sheet-production requirements and by `CON-011`.
- **PDF/A (ISO 19005)** and **PDF/E-1 (ISO 24517-1)** — archival and
  engineering PDF variants referenced by multi-sheet plot output.

These are references, not compliance obligations. Where a requirement claims
conformance it says so explicitly and names the criterion.

## Requirement layers

Requirements are organized into layers. Each layer traces **up** to the layer
above (why it exists) and **down** to the layer below (how it is satisfied).

| Layer | Prefix | Answers | Lives in |
| --- | --- | --- | --- |
| Business requirements | `BR` | Why build this at all? | [`01-business/business-requirements.md`](../01-business/business-requirements.md) |
| Stakeholder requirements | `STK` | What do specific users need? | [`01-business/stakeholders.md`](../01-business/stakeholders.md) |
| Functional — Frontend | `FE` | What must the client/workspace do? | [`02-functional/frontend-requirements.md`](../02-functional/frontend-requirements.md) |
| Functional — Backend | `BE` | What must the cloud services do? | [`02-functional/backend-requirements.md`](../02-functional/backend-requirements.md) |
| Functional — Domain model | `DOM` | What must `packages/domain` model & compute? | [`02-functional/domain-requirements.md`](../02-functional/domain-requirements.md) |
| Functional — Interoperability | `IOP` | What must import/export do? | [`02-functional/interoperability-requirements.md`](../02-functional/interoperability-requirements.md) |
| Non-functional | `NFR` | How well must it behave? | [`03-nonfunctional/nonfunctional-requirements.md`](../03-nonfunctional/nonfunctional-requirements.md) |
| Constraint / assumption | `CON` | What bounds the solution? | [`00-overview/scope-and-context.md`](scope-and-context.md) |
| Dependency / assumption | `DEP` | What external system does it lean on? | [`00-overview/scope-and-context.md`](scope-and-context.md) |

## Identifier scheme

Identifiers are stable and never reused. Format:

```
<PREFIX>-<AREA>-<NNN>
```

- **PREFIX** — one of the layer prefixes above.
- **AREA** — a short uppercase area code (see catalogs below). Business,
  stakeholder, constraint, and dependency IDs omit the AREA segment (e.g.
  `BR-007`, `DEP-001`).
- **NNN** — zero-padded 3-digit sequence, unique within its `PREFIX-AREA`.

Examples: `BR-003`, `STK-002`, `FE-CANVAS-004`, `BE-AUTH-002`,
`DOM-PARCEL-001`, `IOP-DXF-002`, `NFR-PERF-003`.

> **Stability rule:** once an ID is published it is not renumbered. If a
> requirement is withdrawn, mark it `Deprecated` in its Status field and leave
> the row in place; do not recycle the number.

### Functional area codes

**Frontend (`FE-…`)** — the browser planning workspace (`apps/web`):

| Area | Scope |
| --- | --- |
| `CANVAS` | Drawing & editing planning geometry on the canvas |
| `PRECISION` | Snapping, constraints, grid, coordinate entry |
| `MEASURE` | Measurement, dimensions, area/length readout |
| `LAYER` | Layer panel: order, visibility, lock |
| `STYLE` | Land-use / element styling & legends |
| `METRIC` | Live metrics & analysis panels |
| `NAV` | Viewport, zoom/pan, basemap, coordinate display |
| `SELECT` | Selection, transform, snapping-aware editing |
| `PROJECT` | Project browser, open/save, checkpoints (client) |
| `REVIEW` | Comments, review threads, markup (client) |
| `PRESENCE` | Multi-user cursors, presence, live sync (client) |
| `IO` | Import/export UI & wizards (client) |
| `ACCOUNT` | Sign-in, org/team, sharing UI |
| `EDIT` | Clipboard & structural editing (copy/paste, group, align) |
| `FIND` | Search, select-by-query, canvas filtering |
| `CMD` | Keyboard shortcuts & command palette |
| `NOTIFY` | In-app notifications & activity feed (client) |
| `HELP` | Onboarding, empty states, in-context help |
| `STATE` | Save status, loading/error states, disconnect resilience |
| `PREFS` | Display, unit, and theme preferences |
| `PRINT` | Print & exhibit-sheet output |
| `SCENARIO` | Scenario/variant comparison (client) |
| `SHEET` | CAD sheet composer: layouts (paper space), sheet size, per-sheet properties |
| `VIEWPORT` | Viewports on a layout: extent, scale, clipping, per-viewport layer overrides |
| `TITLE` | Title-block editor and per-sheet title-block data binding |
| `PLOT` | Plot styles / lineweights / pen tables / plot preview |
| `ANNO` | Annotation authoring: dimensions, text, leaders, callouts with annotative scaling |
| `SYMBOL` | Symbol / block library palette and placement |
| `GRIDLINE` | Column-grid and level datum authoring and display |
| `MATCHLINE` | Match lines and section/elevation/detail callouts across sheets |
| `SCHEDULE` | Schedule / table editor (door, window, room/finish, panel, fixture, equipment) |
| `REV` | Revision clouds, delta tags, revision-block editing |
| `SHEETSET` | Sheet-set browser (project navigator), filters, batch plot |

**Backend (`BE-…`)** — the cloud services (`services/*`):

| Area | Scope | Service |
| --- | --- | --- |
| `AUTH` | Identity, sessions, orgs, roles | `services/auth` |
| `ACCESS` | Authorization, sharing, permissions | `services/auth` |
| `PROJECT` | Project lifecycle & persistence | `services/projects` |
| `VERSION` | Versioning, checkpoints, history | `services/projects` |
| `GEO` | CRS transforms, spatial queries, layer storage | `services/geospatial` |
| `IMPORT` | Server-side format ingestion | `services/geospatial` |
| `EXPORT` | Server-side format generation | `services/geospatial` |
| `COLLAB` | Real-time co-editing, conflict resolution | `services/collaboration` |
| `COMMENT` | Comment/review thread storage | `services/collaboration` |
| `AUDIT` | Audit trail & governance events | `services/projects` |
| `API` | Public API surface & contracts | all |
| `JOB` | Asynchronous import/export/exhibit jobs | `services/geospatial` |
| `STORAGE` | Binary asset storage | `services/projects` |
| `NOTIFY` | Notification delivery (in-app, email) | `services/collaboration` |
| `SEARCH` | Project listing, filtering, search | `services/projects` |
| `WEBHOOK` | Integrator event webhooks | all |
| `SHEET` | Sheet-set persistence, layout/viewport rendering, per-sheet plot generation | `services/geospatial` |
| `TEMPLATE` | Title-block templates, sheet templates, symbol/block library storage & versioning | `services/projects` |
| `PLOT` | Plot-style/CTB/STB table storage, batch plot orchestration | `services/geospatial` |
| `SCHEDULE` | Server-side extraction of schedules (door/window/room/finish/panel) from domain objects | `services/projects` |
| `PACKAGE` | Issue-set release packaging: bundle sheets + manifest + checksums into deliverables | `services/projects` |

**Domain model (`DOM-…`)** — `packages/domain`:

| Area | Scope |
| --- | --- |
| `CRS` | Coordinate reference systems |
| `UNIT` | Units & scale |
| `GEOM` | Geometry primitives & operations |
| `LAYER` | Layer model |
| `SITE` | Site container |
| `PARCEL` | Parcels |
| `LOT` | Lots |
| `ZONE` | Zones / zoning districts |
| `LANDUSE` | Land uses & allocation |
| `ROW` | Rights-of-way |
| `SETBACK` | Setbacks & buildable area |
| `ENVELOPE` | Zoning envelopes |
| `INFRA` | Infrastructure networks |
| `SUBDIV` | Subdivision operations |
| `METRIC` | Coverage, density, allocation metrics |
| `COMPLY` | Compliance checks & validation |
| `SURVEY` | Metes-and-bounds / COGO |
| `IDENT` | Element identity & referential integrity |
| `BLOCK` | Blocks (ROW-bounded lot groups) |
| `EASEMENT` | Easements |
| `DEDICATION` | Public-use dedications |
| `BUILDING` | Buildings / footprints |
| `OPENSPACE` | Open space / common area |
| `PARKING` | Parking supply & requirement |
| `SCENARIO` | Scenarios & phasing |
| `SERIAL` | Plan serialization & portability |
| `COMPUTE` | Computation determinism |
| `SNAPSHOT` | Immutable snapshots & diff |
| `SHEET` | Sheet, layout, viewport primitives; sheet-relative (paper) vs model-relative geometry |
| `TITLEBLOCK` | Title-block template model, data fields, per-sheet binding |
| `SHEETSET` | Sheet-set collection, ordering, filters |
| `DISCIPLINE` | Discipline designators (NCS v6: G, H, V, B, C, L, S, A, I, Q, F, P, D, M, E, T, R, X, Z, O) |
| `NUMBERING` | Sheet-numbering schemes (`<Discipline><Sheet-type><Sequence>`), automatic renumbering |
| `LAYERSTD` | CAD layer standards (NCS/AIA, ISO 13567) and layer catalogs |
| `PLOTSTYLE` | Plot-style tables (CTB/STB), lineweight, linetype, and colour maps |
| `SYMBOL` | Symbol/block model with parametric attributes |
| `DIM` | Dimension primitives (linear, aligned, angular, radial, ordinate, arc-length) |
| `ANNO` | Text, leader, callout, and annotative-scale model |
| `GRID` | Building column grids (A/B/C, 1/2/3) and level datums |
| `MATCHLINE` | Match-line and section/elevation/detail-callout model |
| `SCHEDULE` | Schedule/table model derived from domain-object queries |
| `REV` | Revision, revision cloud, delta tag, revision-block model |
| `XREF` | External references between sheets/drawings and their invalidation |
| `ISSUE` | Named issue sets (For Permit / For Bid / IFC / As-Built) and per-sheet stamping |

**Interoperability (`IOP-…`)** — importers/exporters:

| Area | Format / concern |
| --- | --- |
| `GEOJSON` | GeoJSON (RFC 7946) |
| `KML` | KML / KMZ |
| `SHP` | Esri Shapefile |
| `DXF` | DXF / DWG (CAD) |
| `GPKG` | GeoPackage |
| `PDF` | PDF exhibits |
| `CSV` | Tabular CSV |
| `RASTER` | Georeferenced raster / image underlay |
| `FIELD` | Attribute / field mapping |
| `ENC` | Character encoding |
| `BUNDLE` | ZIP / KMZ archive import |
| `STREAM` | Streaming large-file import |
| `IDENT` | Round-trip element identity |
| `SCHEMA` | Documented format↔domain schema mapping |
| `GEOMX` | Unsupported-geometry handling |
| `PREC` | Coordinate precision on export |
| `CRSX` | Cross-format CRS handling |
| `DXFSHEET` | DXF/DWG multi-sheet export (layouts, viewports, xrefs, plot styles) |
| `PDFSHEET` | Multi-sheet PDF plot output (incl. PDF/A, PDF/E-1) |
| `PLTSTYLE` | Plot-style-table (CTB/STB) import/export and translation |
| `LAYERMAP` | Layer-name mapping to/from NCS/AIA/ISO 13567 on import/export |
| `TITLEBLOCK` | Title-block block-import from external DWG/DXF templates |
| `BLOCK` | Symbol/block library round-trip (import DWG/DXF blocks, export as blocks) |

**Non-functional (`NFR-…`)** — categories from ISO/IEC 25010:

| Area | Category |
| --- | --- |
| `PERF` | Performance efficiency |
| `SCALE` | Scalability / capacity |
| `SEC` | Security |
| `PRIV` | Privacy & data protection |
| `A11Y` | Accessibility |
| `USE` | Usability |
| `REL` | Reliability & availability |
| `COMPAT` | Compatibility (browsers, formats, CRS) |
| `MAINT` | Maintainability |
| `OBS` | Observability & operability |
| `PORT` | Portability & self-hosting |
| `LEGAL` | Licensing & compliance |
| `AVAIL` | Availability, backup & disaster recovery |
| `I18N` | Internationalization & localization |
| `MOD` | Content safety & moderation |
| `BENCH` | Benchmarks & performance validation |
| `PLOT` | Plot fidelity: paper accuracy, lineweight rendering, scale trueness, font embedding |
| `STD` | Standards conformance for sheet size, layer naming, title-block fields, numbering |

## Requirement attributes

Every functional and non-functional requirement is a table row with these
columns:

| Column | Meaning |
| --- | --- |
| **ID** | The stable identifier. |
| **Requirement** | A single testable statement using **shall**. |
| **Priority** | MoSCoW: **M** (Must) · **S** (Should) · **C** (Could) · **W** (Won't-yet). |
| **Phase** | Target roadmap phase `P0`–`P5` (see [ROADMAP](../../ROADMAP.md)). |
| **Trace** | Parent requirement IDs this satisfies (upward trace). |
| **Verify** | Verification method — see below. |

Priority reflects product intent, not current build state; a `Must` requirement
in `P4` is still unbuilt today. Build state lives in the RTM's **Status** column.

## Requirement quality rules (per ISO/IEC/IEEE 29148 §5.2)

Each requirement statement is:

1. **Necessary** — traces to a real business or stakeholder need.
2. **Singular** — one requirement per statement; no "and/or" compounds that
   hide two requirements.
3. **Unambiguous** — one interpretation; defined terms come from
   [`GLOSSARY.md`](../../GLOSSARY.md).
4. **Verifiable** — paired with a verification method that could actually fail.
5. **Feasible & bounded** — implementable within the architecture; measurable
   thresholds where the requirement is quantitative.
6. **Free of design** — states *what*, not *how*, unless the how is a genuine
   constraint.

The keyword **shall** denotes a binding requirement. *Should* and *may* are
reserved for non-binding guidance and are avoided in requirement statements
(priority carries that nuance instead).

## Verification methods

| Code | Method | Typical use |
| --- | --- | --- |
| **T** | Test | Automated/manual tests exercise the behavior. |
| **D** | Demonstration | Operate the feature and observe the result. |
| **I** | Inspection | Review code, config, or a document. |
| **A** | Analysis | Reason from models, load tests, or calculation. |

Verification evidence (test-case IDs `TC-…`, once a test suite exists) is
tracked in the RTM, keeping this catalog focused on *what* is required.

## Tolerances

Requirements that say "within tolerance" refer to these named tolerances. Values
are **initial targets**, pinned here so the requirements are verifiable and so a
single change updates every referencing requirement. They are confirmed the same
way performance targets are — see [`NFR-BENCH`](../03-nonfunctional/nonfunctional-requirements.md#benchmarks--validation--nfr-bench).

| Tolerance | Meaning | Initial target | Referenced by |
| --- | --- | --- | --- |
| **Coordinate tolerance** | Distance within which two vertices are treated as coincident (snapping, gap/overlap). | 1 mm in the plan's projected units | `DOM-GEOM-009`, `DOM-PARCEL-004` |
| **Conversion tolerance** | Max error permitted when converting between units. | ≤ 1 part in 10⁶ | `DOM-UNIT-003` |
| **Metric tolerance** | Max deviation of an area/distance metric from an authoritative GIS for the same input. | ≤ 0.1% relative | `NFR-COMPAT-002`, `DOM-METRIC-*` |
| **Interoperability tolerance** | Max positional shift permitted on a format round-trip. | ≤ coordinate tolerance for projected CRS; ≤ 1 mm equivalent for geographic | `NFR-COMPAT-001`, `IOP-*` |
| **Plot scale tolerance** | Max deviation of a printed distance from the nominal scaled distance on a physical (or true-scale PDF) plot. | ≤ 0.2 mm at plot scale | `NFR-PLOT-001`, `IOP-PDFSHEET-*` |
| **Annotation plot size** | Nominal plotted text height for schedule and body text; nominal arrowhead length; nominal linetype dash gap — all pinned so annotative scaling can be verified. | body text 2.5 mm; headings 3.5 mm; arrowheads 2.5 mm | `DOM-ANNO-*`, `DOM-DIM-*`, `NFR-PLOT-002` |

## Traceability model

The RTM realizes bidirectional traceability across the full chain:

```
BR ─▶ STK ─▶ {FE, BE, DOM, IOP} ─▶ NFR (cross-cutting)
                   │
                   ├─▶ Roadmap phase (P0–P5)
                   ├─▶ Architecture module (apps/web, services/*, packages/domain)
                   └─▶ Verification method (T/D/I/A) ─▶ TC-… (future)
```

Coverage rules the RTM validates:

- **R1** — every `BR` traces down to at least one `STK`.
- **R2** — every `STK` traces down to at least one functional requirement.
- **R3** — every functional requirement traces up to at least one `STK` (no
  orphan features) and maps to exactly one architecture module.
- **R4** — every functional requirement has a verification method.
- **R5** — every `NFR` names the requirements or modules it constrains.

Gaps against these rules are reported in the
[coverage report](../04-traceability/coverage-report.md).
