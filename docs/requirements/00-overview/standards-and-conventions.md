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

## Identifier scheme

Identifiers are stable and never reused. Format:

```
<PREFIX>-<AREA>-<NNN>
```

- **PREFIX** — one of the layer prefixes above.
- **AREA** — a short uppercase area code (see catalogs below). Business,
  stakeholder, and constraint IDs omit the AREA segment (e.g. `BR-007`).
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

**Interoperability (`IOP-…`)** — importers/exporters:

| Area | Format |
| --- | --- |
| `GEOJSON` | GeoJSON (RFC 7946) |
| `KML` | KML / KMZ |
| `SHP` | Esri Shapefile |
| `DXF` | DXF / DWG (CAD) |
| `GPKG` | GeoPackage |
| `PDF` | PDF exhibits |
| `CSV` | Tabular CSV |
| `CRSX` | Cross-format CRS handling |

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
