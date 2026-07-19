# Functional Requirements — Interoperability (`IOP`)

Requirements for **importing and exporting** the formats planners use. Interop is
a first-class capability ([`BR-005`](../01-business/business-requirements.md)),
implemented in `services/geospatial` (see [`BE-IMPORT`/`BE-EXPORT`/`BE-GEO`](backend-requirements.md))
and surfaced through the [import/export UI](frontend-requirements.md#import--export-ui--fe-io).
This file specifies the **per-format** behavior; the services file specifies the
generic ingestion/generation pipeline.

Format semantics and CRS concerns are grounded in
[`_meta/research-formats-metrics-standards.md`](../_meta/research-formats-metrics-standards.md).
Most interop lands in **Phase 3** ([ROADMAP](../../ROADMAP.md)).

> **CRS correctness is the crosscutting risk.** GeoJSON mandates WGS84 lon/lat;
> CAD formats are usually in local/project coordinates; area-based metrics
> require a projected CRS. Every importer/exporter shall route through the CRS
> handling in `IOP-CRSX` and `BE-GEO-001`/`BE-GEO-004`.

## GeoJSON (RFC 7946) — `IOP-GEOJSON`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-GEOJSON-001` | The system shall import GeoJSON features into typed domain objects and layers. | M | P3 | STK-001, STK-007; BR-005 | T |
| `IOP-GEOJSON-002` | The system shall export a project's domain objects as valid RFC 7946 GeoJSON. | M | P3 | STK-007; BR-005 | T |
| `IOP-GEOJSON-003` | On import/export the system shall treat GeoJSON coordinates as WGS84 (OGC:CRS84) and reproject to/from the plan CRS. | M | P3 | STK-001; BR-004 | T |

## KML / KMZ — `IOP-KML`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-KML-001` | The system shall import KML and KMZ features and styling into the plan. | S | P3 | STK-005; BR-005 | T |
| `IOP-KML-002` | The system shall export a plan as KML/KMZ for viewing in KML consumers. | S | P3 | STK-005; BR-005 | T |

## Shapefile — `IOP-SHP`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-SHP-001` | The system shall import an Esri Shapefile set (`.shp`, `.dbf`, `.shx`, `.prj`) into domain objects and attributes. | M | P3 | STK-001; BR-005 | T |
| `IOP-SHP-002` | The system shall read the CRS from the `.prj` file, or prompt when it is absent. | M | P3 | STK-001; BR-004 | T |
| `IOP-SHP-003` | The system shall export domain objects as a Shapefile set. | S | P3 | STK-007; BR-005 | T |

## DXF / DWG — `IOP-DXF`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-DXF-001` | The system shall import DXF/DWG drawings as basemap/reference geometry. | M | P3 | STK-001, STK-004; BR-005 | T |
| `IOP-DXF-002` | The system shall map CAD layers to planning layers on import. | S | P3 | STK-001 | T |
| `IOP-DXF-003` | When a CAD drawing lacks georeferencing, the system shall let the user place/assign a CRS and origin. | M | P3 | STK-001; BR-004 | D |
| `IOP-DXF-004` | The system shall export plan geometry as DXF. | S | P3 | STK-004; BR-005 | T |

## GeoPackage — `IOP-GPKG`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-GPKG-001` | The system shall import GeoPackage vector features and their CRS. | C | P3 | STK-007; BR-005 | T |
| `IOP-GPKG-002` | The system shall export a project as a GeoPackage. | C | P3 | STK-007; BR-005 | T |

## PDF exhibits — `IOP-PDF`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-PDF-001` | The system shall export a to-scale PDF exhibit including legend, north arrow, and scale bar. | S | P3 | STK-004, STK-005; BR-005 | D |
| `IOP-PDF-002` | The PDF exhibit shall optionally include a metrics summary (coverage, density, land-use allocation). | C | P3 | STK-004 | D |

## CSV — `IOP-CSV`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-CSV-001` | The system shall import point data from CSV using lat/long columns or a WKT geometry column. | C | P3 | STK-007; BR-005 | T |
| `IOP-CSV-002` | The system shall export tabular attributes/metrics as CSV. | C | P3 | STK-004 | T |

## Cross-format CRS handling — `IOP-CRSX`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-CRSX-001` | On import the system shall detect the source CRS where declared and require the user to specify it where absent. | M | P3 | STK-001; BR-004 | T |
| `IOP-CRSX-002` | The system shall reproject imported/exported geometry between the source CRS and the plan CRS with the correct datum transformation. | M | P3 | STK-001; BR-004 | T |
| `IOP-CRSX-003` | The system shall warn the user when a chosen CRS is unsuitable for area/distance work (e.g. a geographic or Web-Mercator CRS used as the plan CRS). | S | P3 | STK-001; NFR-COMPAT | D |

## Format coverage summary

| Format | Import | Export | Priority | Phase |
| --- | :--: | :--: | :--: | :--: |
| GeoJSON | ✓ | ✓ | M | P3 |
| KML/KMZ | ✓ | ✓ | S | P3 |
| Shapefile | ✓ | ✓ | M / S | P3 |
| DXF/DWG | ✓ | ✓ | M / S | P3 |
| GeoPackage | ✓ | ✓ | C | P3 |
| PDF exhibit | — | ✓ | S | P3 |
| CSV | ✓ | ✓ | C | P3 |

> Formats deliberately **excluded** for now (per [scope](../00-overview/scope-and-context.md#out-of-scope-non-goals)):
> LandXML, CityGML, IFC, and glTF/OBJ 3D exchange. These are candidates for a
> later phase if 3D and civil-engineering interchange enter scope; they are not
> requirements today.
