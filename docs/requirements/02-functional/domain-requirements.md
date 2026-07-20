# Functional Requirements — Domain Model (`DOM`)

Requirements for the **framework-agnostic planning domain model**
(`packages/domain`): the spatial foundation, planning primitives, the rules and
metrics over them, and the model-level concerns (identity, serialization,
determinism, snapshots) that let the client and services share one source of
truth. This is the gating Phase-1 work ([ROADMAP](../../ROADMAP.md)).

The model shall remain **framework-agnostic** — no React, no server framework, no
database driver
([`CON-003`](../00-overview/scope-and-context.md#constraints--assumptions)) — and
all definitions shall use the vocabulary of [`GLOSSARY.md`](../../GLOSSARY.md).
Conventions in
[standards & conventions](../00-overview/standards-and-conventions.md); numeric
tolerances referenced below are defined in its
[tolerances table](../00-overview/standards-and-conventions.md#tolerances).

## Coordinate reference systems — `DOM-CRS`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-CRS-001` | Every plan and its geometry shall carry a coordinate reference system; geometry without a CRS shall be rejected as invalid. | M | P1 | STK-001; BR-004, CON-004 | T |
| `DOM-CRS-002` | The model shall represent geographic and projected CRSs identified by EPSG code (incl. WGS84, Web Mercator, US State Plane, UTM). | M | P1 | STK-001; DEP-002 | T |
| `DOM-CRS-003` | The model shall support datum-aware transformation of geometry between CRSs. | M | P1 | STK-001; BR-004 | T |
| `DOM-CRS-004` | The model shall distinguish geographic (angular) from projected (linear) CRSs so callers can enforce projected-CRS computation of area/distance. | M | P1 | STK-001; NFR-COMPAT-002 | T |

## Units & scale — `DOM-UNIT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-UNIT-001` | Every plan shall carry explicit linear units (at least meters and feet, distinguishing US survey foot from international foot). | M | P1 | STK-001; BR-004, CON-004 | T |
| `DOM-UNIT-002` | The model shall represent plan scale as an explicit ratio. | M | P1 | STK-001; BR-004 | T |
| `DOM-UNIT-003` | The model shall convert measurements between supported units within the conversion tolerance. | M | P1 | STK-001; BR-004 | T |
| `DOM-UNIT-004` | The model shall carry explicit area units (at least acre, hectare, square foot, square meter), distinct from linear units. | M | P1 | STK-001; BR-004, BR-008 | T |
| `DOM-UNIT-005` | The model shall carry explicit angular/bearing units (decimal degrees, degrees-minutes-seconds). | S | P1 | STK-001; BR-004 | T |

## Geometry — `DOM-GEOM`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-GEOM-001` | The model shall provide point, polyline, and polygon primitives consistent with OGC Simple Features. | M | P1 | STK-001; BR-002 | T |
| `DOM-GEOM-002` | The model shall compute area and perimeter/length of geometry in the plan's units, using a projected CRS. | M | P1 | STK-001; BR-004 | T |
| `DOM-GEOM-003` | The model shall validate geometry (closed polygon rings, no self-intersection) and flag invalid geometry. | M | P1 | STK-001; NFR-REL-003 | T |
| `DOM-GEOM-004` | The model shall evaluate spatial predicates (contains, intersects, disjoint) between geometries. | S | P1 | STK-002; BR-008 | T |
| `DOM-GEOM-005` | The model shall support boolean operations (split, union, difference) on polygons. | S | P2 | STK-001; BR-002 | T |
| `DOM-GEOM-006` | The model shall represent circular-arc segments within polygon and polyline boundaries. | S | P1 | STK-001; BR-002 | T |
| `DOM-GEOM-007` | The model shall represent polygons with interior rings (holes) and account for them in area and perimeter. | S | P1 | STK-001; BR-002 | T |
| `DOM-GEOM-008` | The model shall represent multi-part geometry (multi-polygon, multi-line). | S | P2 | STK-001; BR-002 | T |
| `DOM-GEOM-009` | The model shall define an explicit coordinate tolerance used for vertex equality and snapping. | M | P1 | STK-001; NFR-REL-003 | T |
| `DOM-GEOM-010` | The model shall simplify geometry (vertex reduction) while preserving topology within tolerance. | C | P2 | STK-001; BR-005 | T |
| `DOM-GEOM-011` | The model shall normalize polygon ring orientation/winding to the OGC right-hand rule. | S | P1 | STK-001; NFR-COMPAT-001 | T |

## Survey / metes-and-bounds — `DOM-SURVEY`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SURVEY-001` | The model shall represent a boundary as a sequence of bearing-and-distance courses (metes and bounds). | S | P2 | STK-001; BR-002 | T |
| `DOM-SURVEY-002` | The model shall compute the bearing/azimuth and distance between two coordinates (inverse COGO). | S | P2 | STK-001; BR-004 | T |
| `DOM-SURVEY-003` | The model shall report closure error for a metes-and-bounds description. | C | P3 | STK-001; NFR-REL-003 | T |

## Identity & integrity — `DOM-IDENT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-IDENT-001` | Every domain element shall carry a stable, unique identifier that persists across edits and serialization. | M | P1 | STK-003; BR-003 | T |
| `DOM-IDENT-002` | The model shall enforce referential integrity of the Site→Parcel→Block→Lot hierarchy (no orphan children, no dangling parent references). | M | P1 | STK-001; NFR-REL-003 | T |
| `DOM-IDENT-003` | The model shall support grouping of elements independent of layer assignment. | C | P2 | STK-002; BR-002 | T |

## Layers — `DOM-LAYER`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-LAYER-001` | The model shall represent layers with a defined draw order. | M | P1 | STK-002; BR-002 | T |
| `DOM-LAYER-002` | The model shall carry per-layer visibility and lock state. | M | P1 | STK-002; BR-002 | T |
| `DOM-LAYER-003` | The model shall associate each element with exactly one layer. | M | P1 | STK-002; BR-002 | T |

## Site — `DOM-SITE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SITE-001` | The model shall provide a `Site` as the top-level container for a project's spatial content. | M | P1 | STK-002; BR-002 | T |
| `DOM-SITE-002` | A `Site` shall carry its CRS, units, and scale, which its contained geometry inherits. | M | P1 | STK-001; BR-004, CON-004 | T |

## Parcels — `DOM-PARCEL`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-PARCEL-001` | The model shall provide a `Parcel` with a closed boundary. | M | P1 | STK-001; BR-002 | T |
| `DOM-PARCEL-002` | The model shall compute a parcel's area. | M | P1 | STK-001; BR-008 | T |
| `DOM-PARCEL-003` | The model shall carry parcel attributes (identifier, label, and optional legal description). | S | P1 | STK-001; BR-002 | T |
| `DOM-PARCEL-004` | The model shall detect gaps and overlaps between adjacent parcels within a site. | S | P2 | STK-001; NFR-REL-003 | T |
| `DOM-PARCEL-005` | The model shall classify boundary segments (front/street, side, rear) so frontage and directional setbacks resolve deterministically. | S | P2 | STK-004; BR-008 | T |
| `DOM-PARCEL-006` | The model shall represent parcel adjacency/topology (shared boundaries between parcels). | S | P2 | STK-001; BR-002 | T |
| `DOM-PARCEL-007` | The model shall compute a parcel's street frontage. | M | P1 | STK-001; BR-008 | T |

## Lots — `DOM-LOT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-LOT-001` | The model shall provide a `Lot` as a subdivided unit of a parcel intended for a building or use. | M | P1 | STK-001; BR-002 | T |
| `DOM-LOT-002` | The model shall compute a lot's area, width, and frontage. | M | P1 | STK-001; BR-008 | T |
| `DOM-LOT-003` | Each lot shall reference the parcel it derives from and, optionally, the block that contains it. | M | P1 | STK-001; BR-002 | T |

## Blocks — `DOM-BLOCK`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-BLOCK-001` | The model shall provide a `Block` as an area bounded by rights-of-way that contains lots. | M | P1 | STK-001; BR-002 | T |
| `DOM-BLOCK-002` | The model shall derive blocks from the surrounding ROW/street network. | S | P2 | STK-001; BR-002 | T |
| `DOM-BLOCK-003` | The model shall compute a block's area and perimeter. | S | P1 | STK-001; BR-008 | T |

## Zones — `DOM-ZONE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-ZONE-001` | The model shall provide a `Zone` as an area governed by planning rules. | M | P1 | STK-002; BR-002 | T |
| `DOM-ZONE-002` | A zone shall carry configurable parameters: FAR limit, max height, max coverage, setbacks, and allowed land uses. | M | P1 | STK-002; BR-008 | T |
| `DOM-ZONE-003` | The model shall associate parcels/lots with the zone(s) governing them. | S | P1 | STK-002; BR-002 | T |

## Land uses — `DOM-LANDUSE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-LANDUSE-001` | The model shall provide a `LandUse` designation applicable to areas (residential, commercial, park, civic, mixed-use, etc.). | M | P1 | STK-002; BR-002 | T |
| `DOM-LANDUSE-002` | The model shall compute land-use allocation (area per land use) across a site. | M | P1 | STK-002; BR-008 | T |
| `DOM-LANDUSE-003` | The model shall support a configurable land-use catalog rather than a fixed enumeration. | S | P1 | STK-002; BR-002 | T |

## Rights-of-way — `DOM-ROW`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-ROW-001` | The model shall provide a `RightOfWay` representing land reserved for streets, paths, or utilities. | S | P1 | STK-001; BR-002 | T |
| `DOM-ROW-002` | A ROW shall carry a width and classification (e.g. local, collector, arterial). | S | P2 | STK-001; BR-002 | T |
| `DOM-ROW-003` | The model shall represent a ROW as an area with an associated centerline. | S | P2 | STK-001; BR-002 | T |

## Easements — `DOM-EASEMENT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-EASEMENT-001` | The model shall provide an `Easement` as an area encumbering a parcel/lot that restricts building (utility, access, drainage). | S | P2 | STK-004; BR-002 | T |
| `DOM-EASEMENT-002` | The model shall exclude easement areas from a lot's buildable area. | S | P2 | STK-004; BR-008 | T |

## Dedications — `DOM-DEDICATION`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-DEDICATION-001` | The model shall provide a `Dedication` marking land dedicated to public use (ROW, park, open space). | S | P2 | STK-001; BR-002 | T |
| `DOM-DEDICATION-002` | The model shall exclude dedicated land from net developable/site area. | S | P2 | STK-004; BR-008 | T |

## Setbacks & buildable area — `DOM-SETBACK`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SETBACK-001` | The model shall represent a `Setback` as a required minimum distance from a specified boundary. | M | P1 | STK-004; BR-002 | T |
| `DOM-SETBACK-002` | The model shall distinguish front, side, and rear setbacks. | S | P2 | STK-004; BR-008 | T |
| `DOM-SETBACK-003` | The model shall compute the buildable area of a lot from its boundary, setbacks, and encumbrances. | M | P2 | STK-004; BR-008 | T |
| `DOM-SETBACK-004` | The model shall distinguish building setbacks (buildable-envelope) from landscape/open-space setbacks. | C | P5 | STK-004; BR-008 | T |

## Buildings — `DOM-BUILDING`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-BUILDING-001` | The model shall provide a `Building` with a 2D footprint placeable on a lot. | M | P1 | STK-004; BR-008 | T |
| `DOM-BUILDING-002` | A building shall carry height and/or storey count as attributes (not 3D geometry). | S | P2 | STK-004; BR-008 | T |
| `DOM-BUILDING-003` | The model shall compute a building's gross floor area from footprint and floors. | S | P2 | STK-004; BR-008 | T |
| `DOM-BUILDING-004` | A building shall carry a dwelling-unit count and/or use program. | S | P2 | STK-002; BR-008 | T |

## Zoning envelopes — `DOM-ENVELOPE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-ENVELOPE-001` | The model shall derive a lot's zoning envelope from setbacks, height limits, and coverage rules. | S | P5 | STK-004; BR-008 | T |
| `DOM-ENVELOPE-002` | The model shall express the envelope as a 2D buildable footprint. | S | P5 | STK-004; BR-008 | T |
| `DOM-ENVELOPE-003` | The model shall express the envelope as a 3D volume. | W | P5 | STK-004; BR-008 | T |

## Open space — `DOM-OPENSPACE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-OPENSPACE-001` | The model shall provide an `OpenSpace` / common-area designation for unbuilt land reserved as open space. | S | P2 | STK-002; BR-008 | T |
| `DOM-OPENSPACE-002` | The model shall distinguish required (regulated) from provided open space. | C | P5 | STK-002; BR-008 | T |

## Parking — `DOM-PARKING`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-PARKING-001` | The model shall represent parking supply as a count of spaces associated with a building, lot, or use. | S | P2 | STK-004; BR-008 | T |
| `DOM-PARKING-002` | The model shall compute required parking from a configurable ratio and report supply vs requirement. | S | P5 | STK-004; BR-008 | T |

## Infrastructure networks — `DOM-INFRA`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-INFRA-001` | The model shall represent infrastructure (roads, utilities) as a network of nodes and edges rather than loose lines, modeling connectivity only (not hydraulic or geometric-design calculations). | C | P5 | STK-001; BR-002 | T |
| `DOM-INFRA-002` | The model shall maintain connectivity between network elements under edits. | C | P5 | STK-001; BR-002 | T |

## Subdivision — `DOM-SUBDIV`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SUBDIV-001` | The model shall subdivide a parcel into lots according to rules (minimum frontage, area, and access). | M | P1 | STK-001; BR-002 | T |
| `DOM-SUBDIV-002` | The model shall validate generated lots against configured minimums and flag non-conforming lots. | S | P2 | STK-001; NFR-REL-003 | T |
| `DOM-SUBDIV-003` | The model shall report subdivision yield (resulting lot count). | S | P2 | STK-004; BR-008 | T |

## Metrics — `DOM-METRIC`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-METRIC-001` | The model shall compute coverage (building/impervious footprint ÷ area) for a parcel, lot, or zone. | M | P1 | STK-002; BR-008 | T |
| `DOM-METRIC-002` | The model shall compute density (dwelling units per acre) for an area. | M | P1 | STK-002; BR-008 | T |
| `DOM-METRIC-003` | The model shall compute floor area ratio (FAR/FSI) for a lot or zone. | M | P1 | STK-004; BR-008 | T |
| `DOM-METRIC-004` | The model shall compute the land-use allocation breakdown across a site. | M | P1 | STK-002; BR-008 | T |
| `DOM-METRIC-005` | The model shall compute impervious-surface ratio and open-space ratio. | S | P1 | STK-002; BR-008 | T |
| `DOM-METRIC-006` | All area/distance-derived metrics shall be computed in a projected CRS to avoid geographic/Web-Mercator distortion. | M | P1 | STK-001; BR-004, NFR-COMPAT-002 | T |
| `DOM-METRIC-007` | Area-based metrics shall distinguish gross from net land area (net excluding ROW, easements, dedications, and undevelopable land). | M | P1 | STK-004; BR-008 | T |
| `DOM-METRIC-008` | Each metric shall be reportable with its defining formula and input values so results are explainable. | C | P5 | STK-004; BR-008 | T |

## Compliance checks — `DOM-COMPLY`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-COMPLY-001` | The model shall check a building/footprint against a lot's setbacks and report violations. | S | P5 | STK-002; BR-008 | T |
| `DOM-COMPLY-002` | The model shall check coverage, density, and FAR against the governing zone's limits. | S | P5 | STK-002; BR-008 | T |
| `DOM-COMPLY-003` | The model shall check an area's land use against the governing zone's allowed uses. | S | P5 | STK-002; BR-008 | T |
| `DOM-COMPLY-004` | The model shall report each violation with its location and the rule breached. | S | P5 | STK-002; BR-008 | T |
| `DOM-COMPLY-005` | The model shall aggregate all compliance violations across a site into a single validation report. | S | P5 | STK-002; BR-008 | T |
| `DOM-COMPLY-006` | Each compliance evaluation shall record its parameter source (governing zone/config) and the computed value versus limit. | C | P5 | STK-003; BR-008 | T |

## Scenarios & phasing — `DOM-SCENARIO`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SCENARIO-001` | The model shall represent alternative scenarios of a plan sharing a common base. | S | P5 | STK-002; BR-001 | T |
| `DOM-SCENARIO-002` | The model shall compute metrics per scenario to support side-by-side comparison. | S | P5 | STK-002; BR-008 | T |
| `DOM-SCENARIO-003` | The model shall represent development phases (staging) within a plan. | C | P5 | STK-002; BR-008 | T |

## Serialization & portability — `DOM-SERIAL`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SERIAL-001` | The model shall define a canonical, portable serialization of a whole plan (site + elements + attributes + CRS/units/scale) shared by client and services. | M | P1 | STK-007; BR-005, CON-002 | T |
| `DOM-SERIAL-002` | The serialized representation shall carry a schema version, and the model shall reject or migrate incompatible versions. | M | P1 | STK-007; NFR-MAINT-001 | T |
| `DOM-SERIAL-003` | Serialization and deserialization shall round-trip without loss of geometry, attributes, or identity. | M | P1 | STK-007; NFR-REL-003 | T |

## Determinism — `DOM-COMPUTE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-COMPUTE-001` | All metric and derivation computations shall be deterministic: identical inputs yield identical outputs. | M | P1 | STK-002; NFR-REL-002 | T |
| `DOM-COMPUTE-002` | The model shall distinguish derived/computed values from authored values. | S | P1 | STK-002; BR-008 | T |

## Snapshots — `DOM-SNAPSHOT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SNAPSHOT-001` | The model shall produce an immutable snapshot of a plan's full state suitable for a Checkpoint/Version. | M | P1 | STK-003; BR-003 | T |
| `DOM-SNAPSHOT-002` | The model shall compute a structural diff between two snapshots (added/removed/changed elements). | C | P5 | STK-003; BR-003 | T |

## Sheets & layouts — `DOM-SHEET`

Framework-agnostic sheet, layout, viewport, and paper-space geometry model that
`apps/web` composes and `services/geospatial` renders for Phase 6 CAD sheets.

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SHEET-001` | The model shall provide a `Sheet` as a printable page carrying a sheet number, title, discipline designator, sheet size, orientation, and rotation. | M | P6 | STK-008; BR-012 | T |
| `DOM-SHEET-002` | The model shall provide a `Layout` (paper space) associated with a sheet, expressed in the sheet's paper units (mm or inches), distinct from world-scale model space. | M | P6 | STK-008; BR-012, CON-012 | T |
| `DOM-SHEET-003` | The model shall provide a `Viewport` referencing model-space extents at an explicit plot scale, with an optional polygon clip and rotation. | M | P6 | STK-008; BR-012 | T |
| `DOM-SHEET-004` | A viewport shall carry per-viewport layer overrides (visibility, colour, lineweight, linetype) that do not mutate the shared layer model. | M | P6 | STK-008; BR-012 | T |
| `DOM-SHEET-005` | The model shall compute the world-to-paper affine transform for a viewport from its extent, scale, and rotation, and expose it deterministically. | M | P6 | STK-008; NFR-REL-002 | T |
| `DOM-SHEET-006` | The model shall distinguish layout-space geometry (composed on paper) from model-space geometry, so CRS-based measurement/metrics are only reported for the latter. | M | P6 | STK-008; BR-012, CON-004 | T |
| `DOM-SHEET-007` | The model shall represent a sheet's plot area, printable area, and margin insets per the sheet-size catalog. | S | P6 | STK-008; BR-012, CON-011 | T |

## Title blocks — `DOM-TITLEBLOCK`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-TITLEBLOCK-001` | The model shall provide a `TitleBlock` template defining a set of named data fields, their placement in paper space, and their formatting. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-TITLEBLOCK-002` | Templates shall accept at minimum the ISO 7200 data fields (drawing identifier, sheet number, title, date, revision, sizes/scale, drawn/checked/approved by, owner) plus custom user-defined fields. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-TITLEBLOCK-003` | A title-block instance shall bind template fields to project-level and per-sheet data; a project-level change shall propagate to every sheet using the template. | M | P6 | STK-008; BR-012, CON-012 | T |
| `DOM-TITLEBLOCK-004` | The model shall allow a title block to embed a seal/signature image or vector asset without treating it as editable geometry. | S | P6 | STK-008; BR-012 | T |

## Sheet sets — `DOM-SHEETSET`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SHEETSET-001` | The model shall provide a `SheetSet` as an ordered, discipline-grouped collection of sheets owned by a project. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-SHEETSET-002` | The model shall let a sheet set be filtered by discipline, sheet-type digit, phase, and issue set. | S | P6 | STK-008; BR-012 | T |
| `DOM-SHEETSET-003` | The model shall derive a canonical sheet index (list of sheets in sheet-number order, with title, discipline, revision, and issue status) from the sheet set. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-SHEETSET-004` | The model shall enforce sheet-number uniqueness within a sheet set. | M | P6 | STK-008; NFR-REL-003 | T |

## Discipline designators — `DOM-DISCIPLINE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-DISCIPLINE-001` | The model shall provide the US NCS v6 discipline designator catalog (G, H, V, B, C, L, S, A, I, Q, F, P, D, M, E, T, R, X, Z, O) with human names. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-DISCIPLINE-002` | Each `Sheet` shall carry exactly one discipline designator. | M | P6 | STK-008; BR-012 | T |
| `DOM-DISCIPLINE-003` | The model shall support extensible designators for jurisdictions that use additional codes (documented per project). | C | P6 | STK-008; BR-012 | T |

## Sheet numbering — `DOM-NUMBERING`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-NUMBERING-001` | The model shall provide a sheet-number scheme of the form `<Discipline><Sheet-type><Sequence>` (e.g. `A-101`), and interpret the sheet-type hundreds digit per NCS (0 general · 1 plans · 2 elevations · 3 sections · 4 enlarged · 5 details · 6 schedules · 9 3D). | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-NUMBERING-002` | The model shall support an alternative jurisdictional numbering scheme configured per project without altering the NCS default. | C | P6 | STK-008; BR-012 | T |
| `DOM-NUMBERING-003` | Renumbering a sheet or a range of sheets shall update every cross-reference (callouts, match-lines, sheet-index references) to those sheets atomically. | M | P6 | STK-008; NFR-REL-003, CON-012 | T |

## CAD layer standards — `DOM-LAYERSTD`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-LAYERSTD-001` | The model shall provide layer-name catalogs for the US National CAD Standard v6 / AIA Layer Guidelines and for ISO 13567. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-LAYERSTD-002` | A project shall carry a designated active layer standard used to name new layers automatically from element type + status. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-LAYERSTD-003` | The model shall let a project author a per-project layer catalog that extends the active standard without breaking round-trip. | S | P6 | STK-008; BR-012 | T |
| `DOM-LAYERSTD-004` | The model shall validate a layer name against the active standard and report non-conforming names. | S | P6 | STK-008; NFR-STD-001 | T |

## Plot styles — `DOM-PLOTSTYLE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-PLOTSTYLE-001` | The model shall represent a colour-dependent plot-style table (CTB) and a named plot-style table (STB), each mapping a key to plotted colour, lineweight, screening (percent), and linetype. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-PLOTSTYLE-002` | The model shall carry an extensible lineweight catalog including the ISO series (0.13 · 0.18 · 0.25 · 0.35 · 0.50 · 0.70 · 1.00 · 1.40 · 2.00 mm). | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-PLOTSTYLE-003` | The model shall carry a linetype catalog (continuous, dashed, hidden, centre, phantom, and user-defined) with an authored dash pattern in paper units. | S | P6 | STK-008; BR-012 | T |
| `DOM-PLOTSTYLE-004` | A plot-style table shall be applicable at the sheet, viewport, or layer scope, with the innermost binding winning. | S | P6 | STK-008; BR-012 | T |

## Symbols & blocks — `DOM-SYMBOL`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SYMBOL-001` | The model shall provide a `Symbol` (block) primitive with a base geometry, a set of authored parameters, and a scoping rule (paper-space, model-space, or both). | M | P6 | STK-008; BR-012 | T |
| `DOM-SYMBOL-002` | The model shall provide a `SymbolInstance` referencing a symbol with a placement, rotation, and per-instance parameter values, without duplicating the symbol geometry. | M | P6 | STK-008; BR-012 | T |
| `DOM-SYMBOL-003` | Symbols shall support annotative scaling (see `DOM-ANNO`). | M | P6 | STK-008; BR-012 | T |
| `DOM-SYMBOL-004` | The model shall provide the standard callout/coordination symbol families (grid bubble, section marker, elevation marker, detail marker, north arrow, scale bar, revision cloud, delta tag, match-line marker). | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-SYMBOL-005` | Editing a symbol shall propagate to every instance of that symbol across the project. | M | P6 | STK-008; BR-012, CON-012 | T |

## Dimensions — `DOM-DIM`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-DIM-001` | The model shall provide linear, aligned, angular, radial, diameter, ordinate, and arc-length dimension primitives. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-DIM-002` | A dimension shall reference the geometry it measures (element+vertex/edge/arc), and its reported value shall update when that geometry moves. | M | P6 | STK-008; BR-012, CON-012 | T |
| `DOM-DIM-003` | The model shall provide a `DimensionStyle` (extension length/offset, arrowhead type/size, text style, precision, tolerance format, unit conversion) applicable per project or per dimension. | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-DIM-004` | Dimensions shall support annotative scaling. | M | P6 | STK-008; BR-012 | T |
| `DOM-DIM-005` | Dimensions authored in paper space shall report distances in paper units; dimensions in model space shall report distances in the plan's units through the viewport scale. | M | P6 | STK-008; BR-004, BR-012 | T |

## Annotation & annotative scaling — `DOM-ANNO`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-ANNO-001` | The model shall provide text, leader, and callout primitives with position, rotation, and style. | M | P6 | STK-008; BR-012 | T |
| `DOM-ANNO-002` | Text/leader/dimension/symbol primitives shall carry an annotative-scale set (`{1:20, 1:50, …}`); when displayed in a viewport whose plot scale is enabled on the primitive, the primitive shall render at its configured plotted size (default: 2.5 mm body / 3.5 mm heading text · 2.5 mm arrowhead). | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-ANNO-003` | The model shall provide a `TextStyle` (font, height, width factor, oblique angle) applicable per project or per annotation. | S | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-ANNO-004` | Annotation shall not participate in area/perimeter/length metrics of a plan. | M | P6 | STK-008; NFR-REL-003 | T |

## Grids & levels — `DOM-GRID`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-GRID-001` | The model shall provide a `ColumnGrid` composed of labelled orthogonal (or user-oriented) grid lines, each carrying a bubble label (A/B/C… or 1/2/3…). | M | P6 | STK-008; BR-012 | T |
| `DOM-GRID-002` | The model shall provide a `LevelDatum` (labelled horizontal reference with elevation) for section and elevation viewports. | S | P6 | STK-008; BR-012 | T |
| `DOM-GRID-003` | Grid lines and level datums shall render on every viewport whose extent intersects them, unless explicitly hidden. | M | P6 | STK-008; BR-012, CON-012 | T |
| `DOM-GRID-004` | Renaming a grid line or level shall propagate to every viewport that shows it and to every schedule cell that references it. | M | P6 | STK-008; CON-012 | T |

## Match-lines & callouts — `DOM-MATCHLINE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-MATCHLINE-001` | The model shall provide a `MatchLine` polyline on a viewport that carries a reference to the adjoining sheet + viewport, and a `Callout` primitive (section, elevation, detail) that carries a reference to a destination sheet + drawing number. | M | P6 | STK-008; BR-012 | T |
| `DOM-MATCHLINE-002` | Callouts and match-lines shall auto-render the current sheet/drawing number of their target, updating on renumber. | M | P6 | STK-008; CON-012 | T |
| `DOM-MATCHLINE-003` | Creating a section/elevation/detail callout shall create (or link to) a reciprocal marker on the destination drawing, preserving referential integrity. | M | P6 | STK-008; NFR-REL-003 | T |
| `DOM-MATCHLINE-004` | The model shall report broken callout/match-line references (destination missing or renumbered without an update path). | M | P6 | STK-008; NFR-REL-003 | T |

## Schedules — `DOM-SCHEDULE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SCHEDULE-001` | The model shall provide a `Schedule` primitive representing a query over domain objects (e.g. all `Door` objects on the project, grouped by fire rating), plus column definitions and formatting. | M | P6 | STK-008; BR-012, CON-012 | T |
| `DOM-SCHEDULE-002` | Schedule rows shall be derived from the underlying objects and shall not carry independent state. | M | P6 | STK-008; CON-012 | T |
| `DOM-SCHEDULE-003` | The model shall support standard schedule types (door, window, room/finish, panel, fixture, equipment) with a documented default column set. | M | P6 | STK-008; BR-012 | T |
| `DOM-SCHEDULE-004` | The model shall support derived cells (total, count, area sum, unit sum) with a defined evaluation order. | S | P6 | STK-008; BR-012 | T |
| `DOM-SCHEDULE-005` | Schedule computation shall be deterministic (`DOM-COMPUTE-001`). | M | P6 | STK-008; NFR-REL-002 | T |

## Revisions & issues — `DOM-REV`, `DOM-ISSUE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-REV-001` | The model shall provide a `RevisionCloud` (scalloped polyline with metadata) and a `DeltaTag` (numbered triangle) primitive that anchor to a sheet's paper-space region. | M | P6 | STK-008; BR-012 | T |
| `DOM-REV-002` | The model shall maintain a per-sheet revision block: an ordered list of revisions (number, date, description, drawn/approved by). | M | P6 | STK-008; BR-012, CON-011 | T |
| `DOM-REV-003` | A revision shall track which sheets it touches, so a batch operation can plot only touched sheets. | S | P6 | STK-008; BR-012 | T |
| `DOM-ISSUE-001` | The model shall provide an `IssueSet` (name, purpose, issue date, member sheets, per-sheet revision-pin) representing a formal release. | M | P6 | STK-008; BR-012, BR-007 | T |
| `DOM-ISSUE-002` | Issue-sets shall be immutable once released; edits create a superseding issue-set rather than mutating the prior. | M | P6 | STK-008, STK-003; BR-007, NFR-SEC-001 | T |
| `DOM-ISSUE-003` | The model shall stamp every sheet of a released issue-set with the issue name, date, and per-sheet revision at release time. | M | P6 | STK-008; BR-012 | T |

## External references — `DOM-XREF`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-XREF-001` | The model shall represent an external reference from a sheet/viewport to another project artefact (another sheet, a schedule, an imported CAD file) with a resolvable path and cached last-known version. | M | P6 | STK-008; BR-012 | T |
| `DOM-XREF-002` | The model shall invalidate a viewport's cached render when any xref target changes, so the next render reflects the change. | M | P6 | STK-008; CON-012 | T |
| `DOM-XREF-003` | The model shall detect and report a broken or circular xref chain. | M | P6 | STK-008; NFR-REL-003 | T |
