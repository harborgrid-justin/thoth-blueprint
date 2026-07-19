# Functional Requirements — Domain Model (`DOM`)

Requirements for the **framework-agnostic planning domain model**
(`packages/domain`): the spatial foundation, planning primitives, and the
rules/metrics over them. This is the gating Phase-1 work
([ROADMAP](../../ROADMAP.md)) and the shared source of truth for client, services,
and tooling.

The model shall remain **framework-agnostic** — no React, no server framework, no
database driver
([`CON-003`](../00-overview/scope-and-context.md#constraints--assumptions)) — and
all definitions shall use the vocabulary of [`GLOSSARY.md`](../../GLOSSARY.md).
Conventions in
[standards & conventions](../00-overview/standards-and-conventions.md).

## Coordinate reference systems — `DOM-CRS`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-CRS-001` | Every plan and its geometry shall carry a coordinate reference system; geometry without a CRS shall be rejected as invalid. | M | P1 | STK-001; BR-004, CON-004 | T |
| `DOM-CRS-002` | The model shall represent geographic and projected CRSs identified by EPSG code (incl. WGS84, Web Mercator, US State Plane, UTM). | M | P1 | STK-001 | T |
| `DOM-CRS-003` | The model shall support datum-aware transformation of geometry between CRSs. | M | P1 | STK-001; BR-004 | T |
| `DOM-CRS-004` | The model shall distinguish geographic (angular) from projected (linear) CRSs so callers can enforce projected-CRS computation of area/distance. | M | P1 | STK-001; NFR-COMPAT | T |

## Units & scale — `DOM-UNIT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-UNIT-001` | Every plan shall carry explicit linear units (at least meters and feet, distinguishing US survey foot from international foot). | M | P1 | STK-001; BR-004, CON-004 | T |
| `DOM-UNIT-002` | The model shall represent plan scale as an explicit ratio. | M | P1 | STK-001; BR-004 | T |
| `DOM-UNIT-003` | The model shall convert measurements between supported units without precision loss beyond a defined tolerance. | M | P1 | STK-001 | T |

## Geometry — `DOM-GEOM`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-GEOM-001` | The model shall provide point, polyline, and polygon primitives consistent with OGC Simple Features. | M | P1 | STK-001 | T |
| `DOM-GEOM-002` | The model shall compute area and perimeter/length of geometry in the plan's units, using a projected CRS. | M | P1 | STK-001; BR-004 | T |
| `DOM-GEOM-003` | The model shall validate geometry (closed polygon rings, no self-intersection) and flag invalid geometry. | M | P1 | STK-001; NFR-REL | T |
| `DOM-GEOM-004` | The model shall evaluate spatial predicates (contains, intersects, disjoint) between geometries. | S | P1 | STK-002 | T |
| `DOM-GEOM-005` | The model shall support boolean operations (split, union, difference) on polygons. | S | P2 | STK-001 | T |

## Layers — `DOM-LAYER`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-LAYER-001` | The model shall represent layers with a defined draw order. | M | P1 | STK-002 | T |
| `DOM-LAYER-002` | The model shall carry per-layer visibility and lock state. | M | P1 | STK-002 | T |
| `DOM-LAYER-003` | The model shall associate each element with exactly one layer. | M | P1 | STK-002 | T |

## Site — `DOM-SITE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SITE-001` | The model shall provide a `Site` as the top-level container for a project's spatial content. | M | P1 | STK-002 | T |
| `DOM-SITE-002` | A `Site` shall carry its CRS, units, and scale, which its contained geometry inherits. | M | P1 | STK-001; BR-004 | T |

## Parcels — `DOM-PARCEL`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-PARCEL-001` | The model shall provide a `Parcel` with a closed boundary. | M | P1 | STK-001; BR-002 | T |
| `DOM-PARCEL-002` | The model shall compute a parcel's area and street frontage. | M | P1 | STK-001 | T |
| `DOM-PARCEL-003` | The model shall carry parcel attributes (identifier, label, and optional legal description). | S | P1 | STK-001 | T |
| `DOM-PARCEL-004` | The model shall detect gaps and overlaps between adjacent parcels within a site. | S | P2 | STK-001; NFR-REL | T |

## Lots — `DOM-LOT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-LOT-001` | The model shall provide a `Lot` as a subdivided unit of a parcel intended for a building or use. | M | P1 | STK-001; BR-002 | T |
| `DOM-LOT-002` | The model shall compute a lot's area, width, and frontage. | M | P1 | STK-001 | T |
| `DOM-LOT-003` | Each lot shall reference the parcel it derives from. | M | P1 | STK-001 | T |

## Zones — `DOM-ZONE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-ZONE-001` | The model shall provide a `Zone` as an area governed by planning rules. | M | P1 | STK-002; BR-002 | T |
| `DOM-ZONE-002` | A zone shall carry configurable parameters: FAR limit, max height, max coverage, setbacks, and allowed land uses. | M | P1 | STK-002 | T |
| `DOM-ZONE-003` | The model shall associate parcels/lots with the zone(s) governing them. | S | P1 | STK-002 | T |

## Land uses — `DOM-LANDUSE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-LANDUSE-001` | The model shall provide a `LandUse` designation applicable to areas (residential, commercial, park, civic, mixed-use, etc.). | M | P1 | STK-002; BR-002 | T |
| `DOM-LANDUSE-002` | The model shall compute land-use allocation (area per land use) across a site. | M | P1 | STK-002; BR-008 | T |
| `DOM-LANDUSE-003` | The model shall support a configurable land-use catalog rather than a fixed enumeration. | S | P1 | STK-002 | T |

## Rights-of-way — `DOM-ROW`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-ROW-001` | The model shall provide a `RightOfWay` representing land reserved for streets, paths, or utilities. | S | P1 | STK-001 | T |
| `DOM-ROW-002` | A ROW shall carry a width and classification (e.g. local, collector, arterial). | S | P2 | STK-001 | T |
| `DOM-ROW-003` | The model shall represent a ROW as an area with an associated centerline. | S | P2 | STK-001 | T |

## Setbacks & buildable area — `DOM-SETBACK`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SETBACK-001` | The model shall represent a `Setback` as a required minimum distance from a specified boundary. | M | P1 | STK-004; BR-002 | T |
| `DOM-SETBACK-002` | The model shall distinguish front, side, and rear setbacks. | S | P2 | STK-004 | T |
| `DOM-SETBACK-003` | The model shall compute the buildable area of a lot from its boundary and setbacks. | M | P2 | STK-004; BR-008 | T |
| `DOM-SETBACK-004` | The model shall distinguish building setbacks (buildable-envelope) from landscape/open-space setbacks. | C | P5 | STK-004 | T |

## Zoning envelopes — `DOM-ENVELOPE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-ENVELOPE-001` | The model shall derive a lot's zoning envelope from setbacks, height limits, and coverage rules. | S | P5 | STK-004; BR-008 | T |
| `DOM-ENVELOPE-002` | The model shall express the envelope as a 2D buildable footprint. | S | P5 | STK-004 | T |
| `DOM-ENVELOPE-003` | The model shall express the envelope as a 3D volume. | W | P5 | STK-004 | T |

## Infrastructure networks — `DOM-INFRA`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-INFRA-001` | The model shall represent infrastructure (roads, utilities) as a network of nodes and edges rather than loose lines. | C | P5 | STK-001; BR-002 | T |
| `DOM-INFRA-002` | The model shall maintain connectivity between network elements under edits. | C | P5 | STK-001 | T |

## Subdivision — `DOM-SUBDIV`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-SUBDIV-001` | The model shall subdivide a parcel into lots according to rules (minimum frontage, area, and access). | M | P1 | STK-001; BR-002 | T |
| `DOM-SUBDIV-002` | The model shall validate generated lots against configured minimums and flag non-conforming lots. | S | P2 | STK-001; NFR-REL | T |
| `DOM-SUBDIV-003` | The model shall report subdivision yield (resulting lot count). | S | P2 | STK-004; BR-008 | T |

## Metrics — `DOM-METRIC`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-METRIC-001` | The model shall compute coverage (building/impervious footprint ÷ area) for a parcel, lot, or zone. | M | P1 | STK-002; BR-008 | T |
| `DOM-METRIC-002` | The model shall compute density (dwelling units per acre) for an area. | M | P1 | STK-002; BR-008 | T |
| `DOM-METRIC-003` | The model shall compute floor area ratio (FAR/FSI) for a lot or zone. | M | P1 | STK-004; BR-008 | T |
| `DOM-METRIC-004` | The model shall compute the land-use allocation breakdown across a site. | M | P1 | STK-002; BR-008 | T |
| `DOM-METRIC-005` | The model shall compute impervious-surface ratio and open-space ratio. | S | P1 | STK-002 | T |
| `DOM-METRIC-006` | All area/distance-derived metrics shall be computed in a projected CRS to avoid geographic/Web-Mercator distortion. | M | P1 | STK-001; BR-004, NFR-COMPAT | T |

## Compliance checks — `DOM-COMPLY`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `DOM-COMPLY-001` | The model shall check a building/footprint against a lot's setbacks and report violations. | S | P5 | STK-002; BR-008 | T |
| `DOM-COMPLY-002` | The model shall check coverage, density, and FAR against the governing zone's limits. | S | P5 | STK-002; BR-008 | T |
| `DOM-COMPLY-003` | The model shall check an area's land use against the governing zone's allowed uses. | S | P5 | STK-002 | T |
| `DOM-COMPLY-004` | The model shall report each violation with its location and the rule breached. | S | P5 | STK-002 | T |
