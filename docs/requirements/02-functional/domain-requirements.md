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
