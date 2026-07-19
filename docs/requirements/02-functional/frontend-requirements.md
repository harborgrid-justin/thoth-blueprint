# Functional Requirements — Frontend (`FE`)

Requirements for the **browser planning workspace** (`apps/web`): the canvas,
precision tooling, layers, styling, metrics, navigation, project management,
review, presence, import/export UI, and account/sharing UI, plus editing,
search, keyboard/command access, notifications, help, application-state
resilience, display preferences, print/exhibit output, and scenarios. These
realize the client half of the platform and map to the `apps/web` architecture
module.

Conventions, priorities, and verification codes are defined in
[standards & conventions](../00-overview/standards-and-conventions.md). Every row
traces **up** to a [stakeholder requirement](../01-business/stakeholders.md) and,
through it, to a [business requirement](../01-business/business-requirements.md).
The [traceability matrix](../04-traceability/traceability-matrix.md) is generated
from the **Trace** column below — keep it authoritative.

> The archived app under [`artifact/`](../../../artifact/) is a **pattern
> reference** for canvas interaction (React Flow), state (Zustand), and
> import/export ergonomics — re-implemented cloud-first, never imported
> ([`CON-008`](../00-overview/scope-and-context.md#constraints--assumptions)).

## Drawing & editing — `FE-CANVAS`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-CANVAS-001` | The workspace shall let a user draw polygon regions (parcels, zones, land-use areas) on the canvas. | M | P2 | STK-001, STK-002; BR-002 | D |
| `FE-CANVAS-002` | The workspace shall let a user draw polylines (e.g. right-of-way centerlines, paths). | M | P2 | STK-001; BR-002 | D |
| `FE-CANVAS-003` | The workspace shall let a user place points (markers, survey/reference points). | S | P2 | STK-001; BR-002 | D |
| `FE-CANVAS-004` | The workspace shall let a user edit geometry by adding, moving, and deleting vertices. | M | P2 | STK-001; BR-002 | D |
| `FE-CANVAS-005` | The workspace shall require the user to create each drawn element **as a typed planning primitive** (Site, Parcel, Lot, Zone, Land Use, ROW, Building), never as an untyped shape. | M | P2 | STK-002; BR-002 | T |
| `FE-CANVAS-006` | The workspace shall let a user subdivide a parcel into lots interactively, invoking the domain subdivision operation. | S | P2 | STK-001; BR-002 | D |
| `FE-CANVAS-007` | The workspace shall let a user split a region into two by a drawn line. | S | P2 | STK-001; BR-002 | D |
| `FE-CANVAS-008` | The workspace shall provide session-scoped undo/redo of at least the most recent 50 editing actions. | M | P2 | STK-001; BR-006 | T |
| `FE-CANVAS-009` | The workspace shall let a user place free-text notes anchored to the canvas. | S | P2 | STK-002; BR-002 | D |
| `FE-CANVAS-010` | The workspace shall let a user place a callout (leader line) linking a text note to an element or location. | C | P3 | STK-003; BR-003 | D |
| `FE-CANVAS-011` | The workspace shall let a user place a Building with a 2D footprint on a lot. | M | P2 | STK-004; BR-008 | D |
| `FE-CANVAS-012` | The workspace shall let a user merge two adjacent regions into one. | S | P2 | STK-001; BR-002 | D |

## Precision & constraints — `FE-PRECISION`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-PRECISION-001` | The workspace shall snap the cursor to vertices, endpoints, edges, intersections, and grid points during drawing and editing. | M | P2 | STK-001; BR-006 | D |
| `FE-PRECISION-002` | The workspace shall let a user enter exact coordinates and dimensions numerically instead of free-hand placement. | M | P2 | STK-001; BR-006 | D |
| `FE-PRECISION-003` | The workspace shall support constraints on segment length, angle, and orthogonality while drawing. | S | P2 | STK-001; BR-006 | D |
| `FE-PRECISION-004` | The workspace shall expose a configurable grid and snap tolerance. | S | P2 | STK-001; BR-006 | D |
| `FE-PRECISION-005` | The workspace shall display alignment guides/cues relative to existing geometry. | C | P2 | STK-001; BR-006 | D |
| `FE-PRECISION-006` | The workspace shall let a user toggle individual snap types on/off and indicate the active snap. | S | P2 | STK-001; BR-006 | D |
| `FE-PRECISION-007` | The workspace shall let a user draw a segment by entering a bearing/azimuth and distance (metes-and-bounds entry). | S | P2 | STK-001; BR-006 | D |

## Measurement — `FE-MEASURE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-MEASURE-001` | The workspace shall measure distance between two or more picked points, reported in the plan's units. | M | P2 | STK-001; BR-004 | D |
| `FE-MEASURE-002` | The workspace shall measure the area of a picked region, reported in the plan's units. | M | P2 | STK-001; BR-004 | D |
| `FE-MEASURE-003` | The workspace shall show a live readout of the selected element's area, perimeter, and length. | M | P2 | STK-001; BR-004 | D |
| `FE-MEASURE-004` | The workspace shall let a user place dimension annotations that update with geometry. | C | P2 | STK-001; BR-004 | D |
| `FE-MEASURE-005` | The workspace shall report the bearing/azimuth of a picked segment or between two picked points. | S | P2 | STK-001; BR-004 | D |

## Layers — `FE-LAYER`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-LAYER-001` | The workspace shall present a layer panel listing all layers in draw order. | M | P2 | STK-002; BR-002 | D |
| `FE-LAYER-002` | The workspace shall let a user show or hide each layer. | M | P2 | STK-002; BR-002 | D |
| `FE-LAYER-003` | The workspace shall let a user lock/unlock a layer to prevent edits. | S | P2 | STK-002; BR-002 | D |
| `FE-LAYER-004` | The workspace shall let a user reorder layers. | S | P2 | STK-002; BR-002 | D |
| `FE-LAYER-005` | The workspace shall let a user assign elements to a layer. | M | P2 | STK-002; BR-002 | D |

## Styling & labels — `FE-STYLE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-STYLE-001` | The workspace shall style elements by land use (fill color / pattern) from a configurable palette. | M | P2 | STK-002; BR-002 | D |
| `FE-STYLE-002` | The workspace shall render a legend reflecting the active land-use styling. | S | P2 | STK-002; BR-002 | D |
| `FE-STYLE-003` | The workspace shall label elements with a configurable set of fields drawn from name, land use, and area. | S | P2 | STK-002; BR-002 | D |

## Metrics & analysis panel — `FE-METRIC`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-METRIC-001` | The workspace shall present a live metrics panel showing coverage, density, land-use allocation, and FAR for the site or selection. | M | P2 | STK-002, STK-004; BR-008 | D |
| `FE-METRIC-002` | The metrics panel shall recompute and update whenever the underlying geometry or attributes change. | M | P2 | STK-002; BR-008 | T |
| `FE-METRIC-003` | The workspace shall show metrics scoped to the current selection (parcel/lot/zone). | S | P2 | STK-004; BR-008 | D |
| `FE-METRIC-004` | The workspace shall visually indicate compliance violations (e.g. setback/coverage/density breaches) on the affected elements. | S | P5 | STK-002; BR-008 | D |

## Navigation & viewport — `FE-NAV`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-NAV-001` | The workspace shall support smooth pan and zoom of the canvas. | M | P2 | STK-005; BR-001 | D |
| `FE-NAV-002` | The workspace shall display cursor coordinates and a scale bar reflecting the plan CRS/units. | M | P2 | STK-001; BR-004 | D |
| `FE-NAV-003` | The workspace shall let a user toggle a contextual tile basemap. | C | P3 | STK-002; BR-001 | D |
| `FE-NAV-004` | The workspace shall support fit-to-content and zoom-to-selection. | S | P2 | STK-005; BR-001 | D |
| `FE-NAV-005` | The workspace shall display and georeference a user-supplied reference underlay (image, PDF, or CAD) beneath the plan, with adjustable position, scale, rotation, and opacity. | S | P3 | STK-001; BR-005 | D |
| `FE-NAV-006` | The workspace shall let a user save and recall named views (bookmarked viewport and extent). | C | P2 | STK-002; BR-001 | D |
| `FE-NAV-007` | The workspace shall display a north-arrow orientation indicator reflecting the plan CRS. | S | P2 | STK-001; BR-004 | D |
| `FE-NAV-008` | The workspace shall provide an overview minimap for navigating large sites. | C | P2 | STK-005; BR-001 | D |

## Selection & editing — `FE-SELECT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-SELECT-001` | The workspace shall let a user select single and multiple elements. | M | P2 | STK-001; BR-006 | D |
| `FE-SELECT-002` | The workspace shall let a user move, rotate, and scale selected elements with snapping applied. | M | P2 | STK-001; BR-006 | D |
| `FE-SELECT-003` | The workspace shall present a property inspector to view and edit the selected element's planning attributes. | M | P2 | STK-002; BR-002 | D |
| `FE-SELECT-004` | The workspace shall let a user delete selected elements (respecting layer locks). | M | P2 | STK-001; BR-006 | D |
| `FE-SELECT-005` | The workspace shall let a user lock/unlock an individual element independent of its layer. | S | P2 | STK-002; BR-002 | D |

## Clipboard & structural editing — `FE-EDIT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-EDIT-001` | The workspace shall let a user cut, copy, and paste selected elements, including across projects and scenarios. | M | P2 | STK-001; BR-006 | T |
| `FE-EDIT-002` | The workspace shall let a user duplicate selected elements in place with an offset. | M | P2 | STK-001; BR-006 | D |
| `FE-EDIT-003` | The workspace shall let a user group and ungroup elements into a manageable set. | S | P2 | STK-001; BR-002 | D |
| `FE-EDIT-004` | The workspace shall let a user align and distribute selected elements. | C | P2 | STK-001; BR-006 | D |

## Search & find — `FE-FIND`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-FIND-001` | The workspace shall let a user search for elements within a plan by name, type, land use, or attribute. | S | P2 | STK-002; BR-002 | D |
| `FE-FIND-002` | The workspace shall let a user select all elements matching a query or type. | S | P2 | STK-002; BR-002 | D |
| `FE-FIND-003` | The workspace shall let a user filter the canvas to show only elements matching criteria. | C | P2 | STK-002; BR-002 | D |

## Keyboard & command access — `FE-CMD`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-CMD-001` | The workspace shall provide keyboard shortcuts for frequent actions (tool selection, undo/redo, delete, save). | S | P2 | STK-001; BR-006 | D |
| `FE-CMD-002` | The workspace shall provide a command palette to search for and invoke commands. | C | P2 | STK-001; BR-001 | D |
| `FE-CMD-003` | The workspace shall make drawing, selection, and navigation operable by keyboard alone. | S | P2 | STK-005; NFR-A11Y-002 | T |
| `FE-CMD-004` | The workspace shall present a discoverable reference of available keyboard shortcuts. | C | P2 | STK-001; NFR-USE-001 | D |

## Notifications & activity (client) — `FE-NOTIFY`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-NOTIFY-001` | The workspace shall notify a user in-app of comments, @mentions, and shares directed at them. | S | P4 | STK-003; BR-003 | D |
| `FE-NOTIFY-002` | The workspace shall show an unread/unresolved-comment badge. | C | P4 | STK-003; BR-003 | D |
| `FE-NOTIFY-003` | The workspace shall present a project activity feed of recent edits, comments, and checkpoints. | S | P4 | STK-003; BR-007 | D |

## Onboarding & help — `FE-HELP`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-HELP-001` | The workspace shall present contextual empty states that guide the user's first action (empty project, no layers, no comments). | S | P2 | STK-005, STK-006; BR-009 | D |
| `FE-HELP-002` | The workspace shall provide a first-run onboarding introduction for new users. | C | P2 | STK-005; BR-009 | D |
| `FE-HELP-003` | The workspace shall provide in-context access to end-user help/documentation. | C | P2 | STK-005; NFR-USE-004 | D |

## Application state & resilience — `FE-STATE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-STATE-001` | The workspace shall display a persistent save-status indicator (saved / saving / failed). | M | P2 | STK-003; CON-002 | D |
| `FE-STATE-002` | The workspace shall present loading states while project and layer data are fetched. | S | P2 | STK-006; NFR-USE-001 | D |
| `FE-STATE-003` | The workspace shall present actionable error states with retry when an operation fails. | M | P2 | STK-006; NFR-OBS-002 | D |
| `FE-STATE-004` | The workspace shall detect loss of connectivity and warn the user before edits can be silently lost. | M | P4 | STK-003; CON-002 | D |
| `FE-STATE-005` | The workspace shall recover the session (restore server state and pending intent) after a disconnect or reload. | S | P4 | STK-003; BR-003 | T |
| `FE-STATE-006` | The workspace shall warn a user before navigating away while edits are unsynced. | S | P2 | STK-003; CON-002 | D |

## Display & unit preferences — `FE-PREFS`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-PREFS-001` | The workspace shall let a user choose the display unit system (metric/imperial) for a plan. | M | P2 | STK-001; BR-004 | D |
| `FE-PREFS-002` | The workspace shall let a user choose the area unit for readouts and metrics (m², ha, ft², acres). | S | P2 | STK-001; BR-004 | D |
| `FE-PREFS-003` | The workspace shall let a user choose the angle/bearing display format (decimal degrees vs degrees-minutes-seconds). | C | P2 | STK-001; BR-004 | D |
| `FE-PREFS-004` | The workspace shall let a user choose the coordinate display format for the cursor readout. | C | P2 | STK-001; BR-004 | D |
| `FE-PREFS-005` | The workspace shall provide a light/dark theme and a high-contrast mode. | S | P2 | STK-005; NFR-A11Y-001 | D |

## Print & exhibit output — `FE-PRINT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-PRINT-001` | The workspace shall let a user print (or print-to-PDF) the current plan view as an exhibit. | S | P3 | STK-004; BR-005 | D |
| `FE-PRINT-002` | The workspace shall let a user compose an exhibit sheet with title block, legend, scale bar, and north arrow before output. | C | P3 | STK-004; BR-005 | D |
| `FE-PRINT-003` | The workspace shall let a user share a link to a specific saved view/extent. | C | P4 | STK-005; BR-009 | D |

## Project management (client) — `FE-PROJECT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-PROJECT-001` | The workspace shall present a project browser to list, open, and create projects the user can access. | M | P2 | STK-006; BR-007 | D |
| `FE-PROJECT-002` | The workspace shall persist edits to the server (no local-only source of truth). | M | P2 | STK-001, STK-003; CON-002 | T |
| `FE-PROJECT-003` | The workspace shall let a user create a named checkpoint and restore the project to one. | S | P2 | STK-003; BR-007 | D |
| `FE-PROJECT-004` | The workspace shall present the project's version history. | S | P4 | STK-003; BR-007 | D |
| `FE-PROJECT-005` | The workspace shall require a user to set the plan's CRS, units, and scale when creating a project. | M | P2 | STK-001; BR-004, CON-004 | D |
| `FE-PROJECT-006` | The workspace shall let a user create a new project from a template. | S | P2 | STK-006; BR-007 | D |
| `FE-PROJECT-007` | The workspace shall let a user rename, duplicate, archive, or delete a project from the browser. | S | P2 | STK-006; BR-007 | D |

## Review & comments (client) — `FE-REVIEW`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-REVIEW-001` | The workspace shall let a user attach a comment anchored to a specific element or map location. | M | P4 | STK-003, STK-005; BR-003 | D |
| `FE-REVIEW-002` | The workspace shall present comments as threads with replies. | M | P4 | STK-003; BR-003 | D |
| `FE-REVIEW-003` | The workspace shall let a user resolve and reopen a comment thread. | S | P4 | STK-003; BR-003 | D |
| `FE-REVIEW-004` | The workspace shall support @mentions of project members in comments. | S | P4 | STK-003; BR-003 | D |
| `FE-REVIEW-005` | The workspace shall offer a simplified, comment-first view suitable for non-CAD public stakeholders. | S | P4 | STK-005; BR-009 | D |

## Presence & live collaboration (client) — `FE-PRESENCE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-PRESENCE-001` | The workspace shall display other participants' cursors and presence (named, color-coded). | M | P4 | STK-003; BR-003 | D |
| `FE-PRESENCE-002` | The workspace shall apply other participants' edits in near-real-time without a manual refresh. | M | P4 | STK-003; BR-003 | T |
| `FE-PRESENCE-003` | The workspace shall indicate which elements other participants have selected. | S | P4 | STK-003; BR-003 | D |
| `FE-PRESENCE-004` | The workspace shall let a user follow another participant's viewport. | C | P4 | STK-003; BR-003 | D |

## Scenario comparison — `FE-SCENARIO`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-SCENARIO-001` | The workspace shall let a user create alternative scenarios (variants) of a plan. | S | P5 | STK-002; BR-001 | D |
| `FE-SCENARIO-002` | The workspace shall let a user compare two scenarios side-by-side or overlaid. | S | P5 | STK-002; BR-008 | D |
| `FE-SCENARIO-003` | The workspace shall present a metrics comparison across scenarios. | S | P5 | STK-002, STK-004; BR-008 | D |

## Import / export UI — `FE-IO`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-IO-001` | The workspace shall provide an import flow to choose a file and confirm/assign its coordinate reference system. | M | P3 | STK-001, STK-007; BR-005 | D |
| `FE-IO-002` | The workspace shall provide an export flow to choose a format, extent, and layers. | M | P3 | STK-004, STK-007; BR-005 | D |
| `FE-IO-003` | The import flow shall let a user map source attributes/layers to planning objects and layers. | S | P3 | STK-001; BR-005 | D |
| `FE-IO-004` | The import/export flows shall show progress and surface actionable errors. | M | P3 | STK-007; NFR-OBS-002 | D |

## Account & sharing UI — `FE-ACCOUNT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `FE-ACCOUNT-001` | The workspace shall let a user sign in and sign out. | M | P2 | STK-006; NFR-SEC-002 | D |
| `FE-ACCOUNT-002` | The workspace shall let a user switch between organizations/teams they belong to. | S | P2 | STK-006; BR-009 | D |
| `FE-ACCOUNT-003` | The workspace shall provide a share dialog to grant view/comment/edit access and produce share links. | M | P4 | STK-006; BR-007 | D |
| `FE-ACCOUNT-004` | The workspace shall let an organization admin view and manage members and roles. | S | P4 | STK-006; BR-009 | D |
| `FE-ACCOUNT-005` | The workspace shall let a user invite a person to a project or organization by email. | S | P4 | STK-006; BR-007 | D |
