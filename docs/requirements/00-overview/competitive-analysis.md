# Competitive & Domain Analysis

This document grounds the requirements suite in the capabilities of established
site- and community-planning software. It is **research-derived**: findings come
from vendor documentation and standards bodies, captured in
[`_meta/`](../_meta/) and cited there. It exists to justify *why* each
requirement area exists and to make sure the catalog is not missing table-stakes
capability. It is **not** a plan to clone these tools — Thoth Blueprint is
deliberately narrower (planning-first, cloud-native) than the CAD/GIS suites.

## Tools surveyed

| Tool | Category | What we learn from it |
| --- | --- | --- |
| **AutoCAD / Civil 3D** | CAD / civil | Parcels-as-objects with topology & legal descriptions; COGO precision; layers; DWG/DXF/LandXML; sheet/exhibit production. |
| **Bentley OpenSite** | Site design | Auto parcel creation; site yield/feasibility; grading & drainage (later-phase depth). |
| **Vectorworks Landmark** | Site / landscape | Existing-vs-proposed site models; hardscape objects; SHP/DWG interop; land-use & quantity reports. |
| **Esri ArcGIS Urban** | Urban planning | Scenario-based zoning & land-use plans; 3D building envelopes; KPIs; browser-native 3D; public engagement. |
| **Esri ArcGIS Pro / Online** | GIS | Parcel Fabric (connected parcel network, gap/overlap detection); ~6,000 CRS with on-the-fly reprojection; branch versioning; dashboards. |
| **Esri CityEngine** | Procedural 3D | Rule-based zoning envelopes (setbacks, sky-exposure, FAR); street→block→lot subdivision; broad 3D export. |
| **UrbanFootprint** | Scenario planning | Paint-land-use-on-map; parcel gridding; density prototypes; base-vs-proposed scenarios; analysis modules. |
| **UrbanSim** | Simulation | Parcel/block/zone resolutions; zoning parameters (FAR/setback/coverage/height); scenario comparison. |
| **TestFit** | Feasibility solver | Draw from metes & bounds; buildable-envelope vs landscape setbacks; real-time yield/FAR/coverage/parking takeoffs. |
| **Modelur** | Parametric urban | Real-time FSI/GSI/density/parking metrics at building/block/model level; zoning-compliance warnings. |
| **Figma / Miro / FigJam / Google Docs** | Collaboration | Multiplayer cursors & presence; anchored threaded comments; role-based sharing; version history & branching. |

## Capability landscape → requirement areas

The columns below are the recurring capability clusters. ● = strong/native,
◐ = partial/adjacent, blank = not a focus. The final column names the
requirement area(s) each cluster seeds.

| Capability cluster | CAD/Civil3D | ArcGIS | CityEngine | Scenario tools | Collab tools | Seeds |
| --- | :--: | :--: | :--: | :--: | :--: | --- |
| Precise drawing & snapping | ● | ● | ● | ◐ | | `FE-CANVAS`, `FE-PRECISION` |
| Measurement & dimensions | ● | ● | | ◐ | | `FE-MEASURE`, `DOM-GEOM` |
| Parcels/lots as topological objects | ● | ● | ◐ | ◐ | | `DOM-PARCEL`, `DOM-LOT` |
| Subdivision (parcel→lots) | ● | ● | ● | ◐ | | `DOM-SUBDIV`, `FE-CANVAS` |
| Zoning & envelopes | ◐ | ● | ● | ● | | `DOM-ZONE`, `DOM-SETBACK`, `DOM-ENVELOPE` |
| Land-use allocation | | ● | ◐ | ● | | `DOM-LANDUSE`, `FE-STYLE` |
| Planning metrics (FAR/coverage/density) | ◐ | ● | ● | ● | | `DOM-METRIC`, `FE-METRIC` |
| Coordinate systems & reprojection | ● | ● | ● | ◐ | | `DOM-CRS`, `BE-GEO`, `IOP-CRSX` |
| Layers & styling | ● | ● | ● | ◐ | | `DOM-LAYER`, `FE-LAYER`, `FE-STYLE` |
| Import/export interoperability | ● | ● | ● | ● | | `IOP-*`, `BE-IMPORT`, `BE-EXPORT` |
| Real-time multi-user editing | ◐ | ◐ | | ● | ● | `BE-COLLAB`, `FE-PRESENCE` |
| Comments & review | | ◐ | | ◐ | ● | `BE-COMMENT`, `FE-REVIEW` |
| Versioning / checkpoints | ● | ● | ◐ | ● | ● | `BE-VERSION`, `FE-PROJECT` |
| Sharing & permissions | ◐ | ● | | ◐ | ● | `BE-AUTH`, `BE-ACCESS`, `FE-ACCOUNT` |
| Public engagement / view-only | | ● | ◐ | ◐ | ● | `BE-ACCESS`, `FE-REVIEW` |
| Sheet / exhibit output (PDF) | ● | ◐ | ◐ | ◐ | | `IOP-PDF`, `FE-IO` |

## Key domain insights that shaped requirements

1. **Parcels are objects, not polygons.** Every serious tool models parcels/lots
   with topology, labels, area/frontage, and (in CAD/GIS) legal descriptions and
   gap/overlap detection. This validates the domain-native thesis
   ([`CON-005`](scope-and-context.md)) and drives `DOM-PARCEL`/`DOM-LOT`.

2. **CRS is mandatory and area-sensitive.** GeoJSON mandates WGS84 lon/lat
   (RFC 7946), but computing area/distance in a geographic or Web-Mercator CRS
   yields materially wrong numbers. Accurate FAR, coverage, and yield **require
   reprojection to a local projected CRS** (US State Plane / UTM) with consistent
   datums. This is a first-class correctness requirement, not a convenience —
   see `DOM-CRS`, `DOM-METRIC`, and `NFR-COMPAT`.

3. **Setbacks split into buildable-envelope vs landscape/open-space.** TestFit and
   CityEngine distinguish the setback that defines the buildable envelope from
   landscape setbacks / open-space reservations. `DOM-SETBACK`/`DOM-ENVELOPE`
   reflect this nuance.

4. **Real-time planning metrics are table stakes.** FAR/FSI, coverage/GSI,
   density (DU/acre), parking ratio, and open-space ratio update live in
   Giraffe, TestFit, Modelur, and UrbanFootprint. Metrics are a domain-model
   responsibility surfaced live in the client (`DOM-METRIC` → `FE-METRIC`).

5. **The interoperability backbone is GeoJSON + DWG/DXF + Shapefile, with
   LandXML and PDF exhibits close behind.** These are non-negotiable for adoption
   and shape the `IOP-*` catalog and its phasing.

6. **Cloud collaboration is a differentiator, not a checkbox.** The strongest
   comparable planning tools (Giraffe, ArcGIS Urban, UrbanFootprint) are already
   web-native and collaborative; the SketchUp/desktop-bound tools (Modelur, Land
   F/X, classic Civil 3D) show exactly the friction Thoth removes. Collaboration
   mechanics (presence, anchored comments, roles, version history/branching) are
   well-established patterns to adopt — see `BE-COLLAB`, `FE-PRESENCE`,
   `BE-COMMENT`, `FE-REVIEW`.

7. **Presence-aware locking is an opening.** Figma/Miro/etc. lock objects
   statically, not by live presence. True presence-aware editing for multiple
   planners on one site is a potential differentiator, captured as a `Could`
   in `BE-COLLAB`.

## Deliberate exclusions

Consistent with [scope](scope-and-context.md) and the [roadmap](../../ROADMAP.md)
non-goals, the following capabilities seen in the surveyed tools are **not**
turned into requirements (or are deferred to `Won't-yet`): detailed grading /
earthwork optimization, stormwater/utility engineering calculations, corridor/
alignment design, procedural facade/3D-city generation, and construction
documentation. Thoth interoperates with the tools that do these (via `IOP-*`)
rather than reproducing them.

## Provenance

Raw, per-cluster research with source URLs:

- [`_meta/research-cad-site-tools.md`](../_meta/research-cad-site-tools.md)
- [`_meta/research-esri.md`](../_meta/research-esri.md)
- [`_meta/research-scenario-feasibility.md`](../_meta/research-scenario-feasibility.md)
- [`_meta/research-collaboration.md`](../_meta/research-collaboration.md)
- [`_meta/research-formats-metrics-standards.md`](../_meta/research-formats-metrics-standards.md)
