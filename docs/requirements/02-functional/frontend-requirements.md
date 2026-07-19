# Functional Requirements — Frontend (`FE`)

Requirements for the **browser planning workspace** (`apps/web`): the canvas,
precision tooling, layers, styling, metrics, navigation, project management,
review, presence, import/export UI, and account/sharing UI. These realize the
client half of the platform and map to the `apps/web` architecture module.

Conventions, priorities, and verification codes are defined in
[standards & conventions](../00-overview/standards-and-conventions.md). Every row
traces **up** to a [stakeholder requirement](../01-business/stakeholders.md) and,
through it, to a [business requirement](../01-business/business-requirements.md).
The full cross-reference lives in the
[traceability matrix](../04-traceability/traceability-matrix.md).

> The archived app under [`artifact/`](../../../artifact/) is a **pattern
> reference** for canvas interaction (React Flow), state (Zustand), and
> import/export ergonomics — re-implemented cloud-first, never imported
> ([`CON-008`](../00-overview/scope-and-context.md#constraints--assumptions)).

## Drawing & editing — `FE-CANVAS`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-CANVAS-001` | The workspace shall let a user draw polygon regions (parcels, zones, land-use areas) on the canvas. | M | P2 | STK-001, STK-002 | D |
| `FE-CANVAS-002` | The workspace shall let a user draw polylines (e.g. right-of-way centerlines, paths). | M | P2 | STK-001 | D |
| `FE-CANVAS-003` | The workspace shall let a user place points (markers, survey/reference points). | S | P2 | STK-001 | D |
| `FE-CANVAS-004` | The workspace shall let a user edit geometry by adding, moving, and deleting vertices. | M | P2 | STK-001 | D |
| `FE-CANVAS-005` | The workspace shall require the user to create each drawn element **as a typed planning primitive** (Site, Parcel, Lot, Zone, Land Use, ROW), never as an untyped shape. | M | P2 | STK-002; BR-002 | T |
| `FE-CANVAS-006` | The workspace shall let a user subdivide a parcel into lots interactively, invoking the domain subdivision operation. | S | P2 | STK-001 | D |
| `FE-CANVAS-007` | The workspace shall let a user split a region by a drawn line and merge adjacent regions. | S | P2 | STK-001 | D |
| `FE-CANVAS-008` | The workspace shall provide unlimited undo/redo of editing actions within a session. | M | P2 | STK-001 | T |

## Precision & constraints — `FE-PRECISION`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-PRECISION-001` | The workspace shall snap the cursor to vertices, endpoints, edges, intersections, and grid points during drawing and editing. | M | P2 | STK-001; BR-006 | D |
| `FE-PRECISION-002` | The workspace shall let a user enter exact coordinates and dimensions numerically instead of free-hand placement. | M | P2 | STK-001; BR-006 | D |
| `FE-PRECISION-003` | The workspace shall support constraints on segment length, angle, and orthogonality while drawing. | S | P2 | STK-001 | D |
| `FE-PRECISION-004` | The workspace shall expose a configurable grid and snap tolerance. | S | P2 | STK-001 | D |
| `FE-PRECISION-005` | The workspace shall display alignment guides/cues relative to existing geometry. | C | P2 | STK-001 | D |

## Measurement — `FE-MEASURE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-MEASURE-001` | The workspace shall measure distance between two or more picked points, reported in the plan's units. | M | P2 | STK-001; BR-004 | D |
| `FE-MEASURE-002` | The workspace shall measure the area of a picked region, reported in the plan's units. | M | P2 | STK-001; BR-004 | D |
| `FE-MEASURE-003` | The workspace shall show a live readout of the selected element's area, perimeter, and/or length. | M | P2 | STK-001 | D |
| `FE-MEASURE-004` | The workspace shall let a user place dimension annotations that update with geometry. | C | P2 | STK-001 | D |

## Layers — `FE-LAYER`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-LAYER-001` | The workspace shall present a layer panel listing all layers in draw order. | M | P2 | STK-002 | D |
| `FE-LAYER-002` | The workspace shall let a user show or hide each layer. | M | P2 | STK-002 | D |
| `FE-LAYER-003` | The workspace shall let a user lock/unlock a layer to prevent edits. | S | P2 | STK-002 | D |
| `FE-LAYER-004` | The workspace shall let a user reorder layers. | S | P2 | STK-002 | D |
| `FE-LAYER-005` | The workspace shall let a user assign elements to a layer. | M | P2 | STK-002 | D |

## Styling & labels — `FE-STYLE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-STYLE-001` | The workspace shall style elements by land use (fill color / pattern) from a configurable palette. | M | P2 | STK-002; BR-002 | D |
| `FE-STYLE-002` | The workspace shall render a legend reflecting the active land-use styling. | S | P2 | STK-002 | D |
| `FE-STYLE-003` | The workspace shall label elements with name, land use, and/or area. | S | P2 | STK-002 | D |

## Metrics & analysis panel — `FE-METRIC`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-METRIC-001` | The workspace shall present a live metrics panel showing coverage, density, land-use allocation, and FAR for the site or selection. | M | P2 | STK-002, STK-004; BR-008 | D |
| `FE-METRIC-002` | The metrics panel shall recompute and update whenever the underlying geometry or attributes change. | M | P2 | STK-002 | T |
| `FE-METRIC-003` | The workspace shall show metrics scoped to the current selection (parcel/lot/zone). | S | P2 | STK-004 | D |
| `FE-METRIC-004` | The workspace shall visually indicate compliance violations (e.g. setback/coverage/density breaches) on the affected elements. | S | P5 | STK-002; BR-008 | D |

## Navigation & viewport — `FE-NAV`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-NAV-001` | The workspace shall support smooth pan and zoom of the canvas. | M | P2 | STK-005 | D |
| `FE-NAV-002` | The workspace shall display cursor coordinates and a scale bar reflecting the plan CRS/units. | M | P2 | STK-001; BR-004 | D |
| `FE-NAV-003` | The workspace shall let a user toggle a contextual basemap. | C | P3 | STK-002 | D |
| `FE-NAV-004` | The workspace shall support fit-to-content and zoom-to-selection. | S | P2 | STK-005 | D |

## Selection & editing — `FE-SELECT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-SELECT-001` | The workspace shall let a user select single and multiple elements. | M | P2 | STK-001 | D |
| `FE-SELECT-002` | The workspace shall let a user move, rotate, and scale selected elements with snapping applied. | M | P2 | STK-001; BR-006 | D |
| `FE-SELECT-003` | The workspace shall present a property inspector to view and edit the selected element's planning attributes. | M | P2 | STK-002 | D |
| `FE-SELECT-004` | The workspace shall let a user delete selected elements (respecting layer locks). | M | P2 | STK-001 | D |

## Project management (client) — `FE-PROJECT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-PROJECT-001` | The workspace shall present a project browser to list, open, and create projects the user can access. | M | P2 | STK-006 | D |
| `FE-PROJECT-002` | The workspace shall persist edits to the server (no local-only source of truth). | M | P2 | STK-003; CON-002 | T |
| `FE-PROJECT-003` | The workspace shall let a user create a named checkpoint and restore the project to one. | S | P2 | STK-003; BR-007 | D |
| `FE-PROJECT-004` | The workspace shall present the project's version history. | S | P4 | STK-003 | D |

## Review & comments (client) — `FE-REVIEW`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-REVIEW-001` | The workspace shall let a user attach a comment anchored to a specific element or map location. | M | P4 | STK-003, STK-005; BR-003 | D |
| `FE-REVIEW-002` | The workspace shall present comments as threads with replies. | M | P4 | STK-003 | D |
| `FE-REVIEW-003` | The workspace shall let a user resolve and reopen a comment thread. | S | P4 | STK-003 | D |
| `FE-REVIEW-004` | The workspace shall support @mentions of project members in comments. | S | P4 | STK-003 | D |
| `FE-REVIEW-005` | The workspace shall offer a simplified, comment-first view suitable for non-CAD public stakeholders. | S | P4 | STK-005; BR-009 | D |

## Presence & live collaboration (client) — `FE-PRESENCE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-PRESENCE-001` | The workspace shall display other participants' cursors and presence (named, color-coded). | M | P4 | STK-003; BR-003 | D |
| `FE-PRESENCE-002` | The workspace shall apply other participants' edits in near-real-time without a manual refresh. | M | P4 | STK-003; BR-003 | T |
| `FE-PRESENCE-003` | The workspace shall indicate which elements other participants have selected. | S | P4 | STK-003 | D |
| `FE-PRESENCE-004` | The workspace shall let a user follow another participant's viewport. | C | P4 | STK-003 | D |

## Import / export UI — `FE-IO`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-IO-001` | The workspace shall provide an import flow to choose a file and confirm/assign its coordinate reference system. | M | P3 | STK-001, STK-007; BR-005 | D |
| `FE-IO-002` | The workspace shall provide an export flow to choose a format, extent, and layers. | M | P3 | STK-004, STK-007 | D |
| `FE-IO-003` | The import flow shall let a user map source attributes/layers to planning objects and layers. | S | P3 | STK-001 | D |
| `FE-IO-004` | The import/export flows shall show progress and surface actionable errors. | M | P3 | STK-007 | D |

## Account & sharing UI — `FE-ACCOUNT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-ACCOUNT-001` | The workspace shall let a user sign in and sign out. | M | P2 | STK-006 | D |
| `FE-ACCOUNT-002` | The workspace shall let a user switch between organizations/teams they belong to. | S | P2 | STK-006 | D |
| `FE-ACCOUNT-003` | The workspace shall provide a share dialog to grant view/comment/edit access and produce share links. | M | P4 | STK-006; BR-007 | D |
| `FE-ACCOUNT-004` | The workspace shall let an organization admin view and manage members and roles. | S | P4 | STK-006 | D |
