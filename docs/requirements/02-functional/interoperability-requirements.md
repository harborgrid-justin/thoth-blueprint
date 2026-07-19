# Functional Requirements — Interoperability (`IOP`)

Requirements for **importing and exporting** the formats planners use, and for the
cross-format concerns (CRS, encoding, field mapping, geometry compatibility) that
make interchange correct. Interop is a first-class capability
([`BR-005`](../01-business/business-requirements.md)), implemented in
`services/geospatial` (see [`BE-IMPORT`/`BE-EXPORT`/`BE-GEO`/`BE-JOB`](backend-requirements.md))
and surfaced through the [import/export UI](frontend-requirements.md#import--export-ui--fe-io).
This file specifies the **per-format and cross-format** behavior.

Format semantics and CRS concerns are grounded in
[`_meta/research-formats-metrics-standards.md`](../_meta/research-formats-metrics-standards.md).
Most interop lands in **Phase 3** ([ROADMAP](../../ROADMAP.md)). The
[traceability matrix](../04-traceability/traceability-matrix.md) is generated from
the **Trace** column here.

> **CRS correctness is the crosscutting risk.** GeoJSON mandates WGS84 lon/lat;
> CAD formats are usually in local/project coordinates; area-based metrics require
> a projected CRS. Every importer/exporter shall route through `IOP-CRSX` and
> `BE-GEO-001`/`BE-GEO-004`.

## GeoJSON (RFC 7946) — `IOP-GEOJSON`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-GEOJSON-001` | The system shall import GeoJSON features into typed domain objects and layers. | M | P3 | STK-001, STK-007; BR-005 | T |
| `IOP-GEOJSON-002` | The system shall export a project's domain objects as valid RFC 7946 GeoJSON. | M | P3 | STK-007; BR-005 | T |
| `IOP-GEOJSON-003` | On import/export the system shall treat GeoJSON coordinates as WGS84 (OGC:CRS84) and reproject to/from the plan CRS. | M | P3 | STK-001; BR-004 | T |

## KML / KMZ — `IOP-KML`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-KML-001` | The system shall import KML and KMZ features and styling into the plan. | S | P3 | STK-001; BR-005 | T |
| `IOP-KML-002` | The system shall export a plan as KML/KMZ for viewing in KML consumers. | S | P3 | STK-007; BR-005 | T |

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
| `IOP-DXF-002` | The system shall map CAD layers to planning layers on import. | S | P3 | STK-001; BR-005 | T |
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
| `IOP-PDF-002` | The PDF exhibit shall optionally include a metrics summary (coverage, density, land-use allocation). | C | P3 | STK-004; BR-008 | D |

## CSV — `IOP-CSV`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-CSV-001` | The system shall import point data from CSV using lat/long columns or a WKT geometry column. | C | P3 | STK-007; BR-005 | T |
| `IOP-CSV-002` | The system shall export tabular attributes/metrics as CSV. | C | P3 | STK-004; BR-005 | T |

## Raster / image underlay — `IOP-RASTER`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-RASTER-001` | The system shall import a georeferenced raster (GeoTIFF, incl. embedded CRS/world-file) as a read-only basemap/underlay positioned by its own georeferencing. | M | P3 | STK-001, STK-004; BR-005 | T |
| `IOP-RASTER-002` | The system shall let a user place a non-georeferenced image or PDF as an underlay by assigning a CRS, scale, and control points, never treating it as editable geometry. | S | P3 | STK-001; BR-004 | D |
| `IOP-RASTER-003` | The system shall constrain imported basemap rasters to reference-only (non-selectable, not exported as features). | S | P3 | STK-001; CON-005 | I |

## Attribute / field mapping — `IOP-FIELD`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-FIELD-001` | On import the system shall let the user map each source attribute/field to a domain object property (or mark it ignored/retained-as-metadata) before ingestion commits. | M | P3 | STK-001, STK-007; BR-005 | D |
| `IOP-FIELD-002` | The system shall persist a named field-mapping profile and offer it for reuse on subsequent imports of the same schema. | S | P3 | STK-007; BR-005 | T |

## Character encoding — `IOP-ENC`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-ENC-001` | The system shall default text I/O to UTF-8, honor a declared source encoding (e.g. Shapefile `.cpg`, XML/GeoJSON charset), and emit UTF-8 on export. | M | P3 | STK-001; BR-005, NFR-COMPAT-001 | T |

## Bundle / archive import — `IOP-BUNDLE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-BUNDLE-001` | The system shall accept a single ZIP archive containing a complete Shapefile set or a KMZ and resolve its members without requiring separate uploads. | M | P3 | STK-001, STK-005; BR-005 | T |
| `IOP-BUNDLE-002` | When a bundle is missing a required sidecar (e.g. `.prj` or `.dbf`), the system shall report which member is absent and fall back to the `IOP-CRSX-001` prompt rather than failing silently. | S | P3 | STK-001; BR-004 | D |

## Streaming / large-file import — `IOP-STREAM`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-STREAM-001` | The system shall ingest features from a file larger than available memory by streaming/chunked parsing, reporting progress without loading the whole file into memory. | S | P3 | STK-007; BR-005 | A |
| `IOP-STREAM-002` | A stream import that fails partway shall commit nothing (atomic import). | M | P3 | STK-007; NFR-REL-003 | T |

## Round-trip identity — `IOP-IDENT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-IDENT-001` | On export the system shall write a stable per-element identifier and on re-import of the same file match elements to existing domain objects by that identifier rather than duplicating them. | S | P3 | STK-001, STK-007; NFR-COMPAT-001 | T |

## Documented schema mapping — `IOP-SCHEMA`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-SCHEMA-001` | The system shall maintain and publish a documented mapping between each supported format's schema and the domain object model (which domain properties map to which fields, and what is dropped). | M | P3 | STK-007; BR-005, CON-005 | I |

## Unsupported geometry handling — `IOP-GEOMX`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-GEOMX-001` | When an import contains a geometry type the domain cannot represent (e.g. 3D/Z, unsupported multipart, GeometryCollection members), the system shall skip or downgrade it with an itemized report rather than aborting the whole import or producing invalid geometry. | M | P3 | STK-001; BR-005, NFR-REL-003 | T |

## Coordinate precision on export — `IOP-PREC`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-PREC-001` | On export the system shall write coordinates at a configurable precision whose default preserves the plan CRS's positional accuracy (≥ 6 decimal places for geographic degrees; ≥ 3 for projected metres/feet) without gratuitous digits. | S | P3 | STK-007; BR-005, NFR-COMPAT-001 | T |

## Cross-format CRS handling — `IOP-CRSX`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-CRSX-001` | On import the system shall detect the source CRS where declared and require the user to specify it where absent. | M | P3 | STK-001; BR-004 | T |
| `IOP-CRSX-002` | The system shall reproject imported/exported geometry between the source CRS and the plan CRS with the correct datum transformation. | M | P3 | STK-001; BR-004 | T |
| `IOP-CRSX-003` | The system shall warn the user when a chosen CRS is unsuitable for area/distance work (e.g. a geographic or Web-Mercator CRS used as the plan CRS). | S | P3 | STK-001; NFR-COMPAT-002 | D |

## Format coverage summary

| Format | Import | Export | Priority | Phase |
| --- | :--: | :--: | :--: | :--: |
| GeoJSON | ✓ | ✓ | M | P3 |
| KML/KMZ | ✓ | ✓ | S | P3 |
| Shapefile | ✓ | ✓ | M / S | P3 |
| DXF/DWG | ✓ | ✓ | M / S | P3 |
| GeoPackage | ✓ | ✓ | C | P3 |
| GeoTIFF (raster underlay) | ✓ | — | M | P3 |
| Image/PDF underlay | ✓ | — | S | P3 |
| PDF exhibit | — | ✓ | S | P3 |
| CSV | ✓ | ✓ | C | P3 |

> Formats deliberately **excluded** for now (per [scope](../00-overview/scope-and-context.md#out-of-scope-non-goals)):
> LandXML, CityGML, IFC, and glTF/OBJ 3D exchange. These are candidates for a
> later phase if 3D and civil-engineering interchange enter scope; they are not
> requirements today.
