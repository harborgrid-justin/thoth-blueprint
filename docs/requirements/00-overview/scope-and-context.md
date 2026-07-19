# Scope, Context & Constraints

This document bounds the requirements suite: what the system is meant to do, what
it explicitly is not, the actors and external systems it touches, and the
constraints and assumptions every requirement is written under.

## Purpose

Thoth Blueprint is a **cloud-based platform for site planning and community
planning** — a collaborative, web-native alternative to traditional CAD, scoped
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
  DXF/DWG (basemaps), GeoPackage, PDF exhibits, CSV.

## Out of scope (non-goals)

Mirrors [`ROADMAP.md`](../../ROADMAP.md) non-goals; requirements are **not**
written for these:

- Mechanical/product CAD (MCAD), parametric part modeling.
- A full GIS analysis suite — the platform interoperates with GIS, it does not
  replace it.
- Detailed construction documentation / engineering deliverables (structural,
  stormwater design, utility engineering calcs).
- **Grading and earthwork engineering** (cut/fill optimization, TIN/terrain
  surface design, machine-guidance output).
- **Corridor / alignment design** (horizontal/vertical road alignments, profiles,
  corridor models).
- **Procedural 3D city generation** and detailed 3D building/facade modeling.
- **Financial pro forma / cost estimating.** Feasibility here is spatial
  (yield/FAR/coverage/density), not financial.
- **Predictive simulation** (travel-demand, environmental, or market simulation).
- **Multi-sheet construction plan sets.** A single to-scale PDF *exhibit* is in
  scope (`IOP-PDF-001`); a construction/permit sheet series is not.
- Native mobile or desktop-installed applications (the client is web-first).

> These exclusions are also reflected in the
> [competitive analysis](competitive-analysis.md#deliberate-exclusions); the
> platform **interoperates** with tools that do this work rather than reproducing
> it.

## System context

```
        ┌──────────────┐        ┌────────────────────┐
        │  Planners &  │        │  Community &        │
        │  reviewers   │        │  public stakeholders│
        └──────┬───────┘        └─────────┬──────────┘
               │  browser (view/edit/comment)         │
               ▼                                       ▼
        ┌──────────────────────────────────────────────────┐
        │            apps/web  (planning workspace)          │
        └───────────────┬──────────────────────────────────┘
                        │ API + realtime
        ┌───────────────┴───────────────────────────────────┐
        │  services/auth · projects · geospatial · collaboration │
        └───────────────┬───────────────────────────────────┘
                        │ shared model
                  packages/domain
                        │
   ┌────────────────────┼─────────────────────┐
   ▼                    ▼                     ▼
 Identity provider   External formats     Basemap / tile
 (OIDC, planned)     (GeoJSON, KML, SHP,  providers
                      DXF, GPKG, PDF, CSV) (planned)
```

## Actors

| Actor | Description | Primary needs |
| --- | --- | --- |
| **Site planner / civil designer** | Lays out parcels, lots, and roads (planning layout, not grading/earthwork engineering — see non-goals). | Precision drawing, subdivision, metrics, DXF/GeoJSON interop. |
| **Urban / community planner** | Neighborhoods, zoning, land-use mixes, corridors. | Zones, land-use allocation, density/coverage, scenarios. |
| **Municipality / review board** | Reviews and governs plans. | Collaborative review, versioning, audit trail, public sharing. |
| **Developer / architect** | Early feasibility and site concepts. | Fast massing/envelopes, quick metrics, export exhibits. |
| **Community stakeholder** | Non-CAD public participant. | View & comment on plans without special software. |
| **Organization admin** | Manages team, roles, projects. | Accounts, roles, access control, org settings. |
| **System / integrator** | Automation & external systems. | Public API, import/export, self-hosting. |

## External interfaces

- **Identity provider** _(planned)_ — OIDC/OAuth2 for sign-in and SSO.
- **File formats** — GeoJSON, KML/KMZ, Shapefile, DXF/DWG, GeoPackage, CSV, PDF.
- **Coordinate reference systems** — EPSG registry (geographic and projected,
  incl. US State Plane, UTM, Web Mercator).
- **Basemap / tile providers** _(planned)_ — raster/vector tiles for context.

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

## Dependencies & assumptions

External systems and platform capabilities the product leans on. Each is a risk
the whole system depends on; requirements that assume one trace to it (`DEP-…`),
and each names the degraded behavior if the dependency is unavailable — important
for self-hosting substitution.

| ID | Dependency / assumption | Degraded behavior if absent | Traced by |
| --- | --- | --- | --- |
| `DEP-001` | An external **OIDC/OAuth2 identity provider** for sign-in. | Public read-only/comment share links remain viewable; authenticated editing is unavailable. | `BE-AUTH-001` |
| `DEP-002` | An **EPSG registry / coordinate-transformation library** for CRS definitions and datum transforms. | CRS assignment/reprojection and area/distance-correct metrics are unavailable. | `BE-GEO-001`, `DOM-CRS-002` |
| `DEP-003` | A **basemap / tile provider** for contextual imagery _(planned)_. | The plan renders without a contextual basemap; all planning geometry still works. | `BE-GEO-005`, `FE-NAV-003` |
| `DEP-004` | A modern **evergreen browser** providing Canvas/WebGL rendering, WebSocket (presence), and the File API (import). | The workspace is unsupported below the browser matrix (`NFR-COMPAT-005`); no silent degradation. | `apps/web`, `FE-*` |

## Relationship to other documents

- [`VISION.md`](../../VISION.md) — the product and its principles (source of `BR`).
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — modules requirements map onto.
- [`ROADMAP.md`](../../ROADMAP.md) — phases requirements are scheduled into.
- [`GLOSSARY.md`](../../GLOSSARY.md) — the definitive vocabulary; all defined
  terms come from here.
