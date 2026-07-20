# Functional Requirements â€” Interoperability (`IOP`)

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

## GeoJSON (RFC 7946) â€” `IOP-GEOJSON`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-GEOJSON-001` | The system shall import GeoJSON features into typed domain objects and layers. | M | P3 | STK-001, STK-007; BR-005 | T |
| `IOP-GEOJSON-002` | The system shall export a project's domain objects as valid RFC 7946 GeoJSON. | M | P3 | STK-007; BR-005 | T |
| `IOP-GEOJSON-003` | On import/export the system shall treat GeoJSON coordinates as WGS84 (OGC:CRS84) and reproject to/from the plan CRS. | M | P3 | STK-001; BR-004 | T |

## KML / KMZ â€” `IOP-KML`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-KML-001` | The system shall import KML and KMZ features and styling into the plan. | S | P3 | STK-001; BR-005 | T |
| `IOP-KML-002` | The system shall export a plan as KML/KMZ for viewing in KML consumers. | S | P3 | STK-007; BR-005 | T |

## Shapefile â€” `IOP-SHP`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-SHP-001` | The system shall import an Esri Shapefile set (`.shp`, `.dbf`, `.shx`, `.prj`) into domain objects and attributes. | M | P3 | STK-001; BR-005 | T |
| `IOP-SHP-002` | The system shall read the CRS from the `.prj` file, or prompt when it is absent. | M | P3 | STK-001; BR-004 | T |
| `IOP-SHP-003` | The system shall export domain objects as a Shapefile set. | S | P3 | STK-007; BR-005 | T |

## DXF / DWG â€” `IOP-DXF`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-DXF-001` | The system shall import DXF/DWG drawings as basemap/reference geometry. | M | P3 | STK-001, STK-004; BR-005 | T |
| `IOP-DXF-002` | The system shall map CAD layers to planning layers on import. | S | P3 | STK-001; BR-005 | T |
| `IOP-DXF-003` | When a CAD drawing lacks georeferencing, the system shall let the user place/assign a CRS and origin. | M | P3 | STK-001; BR-004 | D |
| `IOP-DXF-004` | The system shall export plan geometry as DXF. | S | P3 | STK-004; BR-005 | T |

## GeoPackage â€” `IOP-GPKG`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-GPKG-001` | The system shall import GeoPackage vector features and their CRS. | C | P3 | STK-007; BR-005 | T |
| `IOP-GPKG-002` | The system shall export a project as a GeoPackage. | C | P3 | STK-007; BR-005 | T |

## PDF exhibits â€” `IOP-PDF`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-PDF-001` | The system shall export a to-scale PDF exhibit including legend, north arrow, and scale bar. | S | P3 | STK-004, STK-005; BR-005 | D |
| `IOP-PDF-002` | The PDF exhibit shall optionally include a metrics summary (coverage, density, land-use allocation). | C | P3 | STK-004; BR-008 | D |

## CSV â€” `IOP-CSV`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-CSV-001` | The system shall import point data from CSV using lat/long columns or a WKT geometry column. | C | P3 | STK-007; BR-005 | T |
| `IOP-CSV-002` | The system shall export tabular attributes/metrics as CSV. | C | P3 | STK-004; BR-005 | T |

## Raster / image underlay â€” `IOP-RASTER`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-RASTER-001` | The system shall import a georeferenced raster (GeoTIFF, incl. embedded CRS/world-file) as a read-only basemap/underlay positioned by its own georeferencing. | M | P3 | STK-001, STK-004; BR-005 | T |
| `IOP-RASTER-002` | The system shall let a user place a non-georeferenced image or PDF as an underlay by assigning a CRS, scale, and control points, never treating it as editable geometry. | S | P3 | STK-001; BR-004 | D |
| `IOP-RASTER-003` | The system shall constrain imported basemap rasters to reference-only (non-selectable, not exported as features). | S | P3 | STK-001; CON-005 | I |

## Attribute / field mapping â€” `IOP-FIELD`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-FIELD-001` | On import the system shall let the user map each source attribute/field to a domain object property (or mark it ignored/retained-as-metadata) before ingestion commits. | M | P3 | STK-001, STK-007; BR-005 | D |
| `IOP-FIELD-002` | The system shall persist a named field-mapping profile and offer it for reuse on subsequent imports of the same schema. | S | P3 | STK-007; BR-005 | T |

## Character encoding â€” `IOP-ENC`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-ENC-001` | The system shall default text I/O to UTF-8, honor a declared source encoding (e.g. Shapefile `.cpg`, XML/GeoJSON charset), and emit UTF-8 on export. | M | P3 | STK-001; BR-005, NFR-COMPAT-001 | T |

## Bundle / archive import â€” `IOP-BUNDLE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-BUNDLE-001` | The system shall accept a single ZIP archive containing a complete Shapefile set or a KMZ and resolve its members without requiring separate uploads. | M | P3 | STK-001, STK-005; BR-005 | T |
| `IOP-BUNDLE-002` | When a bundle is missing a required sidecar (e.g. `.prj` or `.dbf`), the system shall report which member is absent and fall back to the `IOP-CRSX-001` prompt rather than failing silently. | S | P3 | STK-001; BR-004 | D |

## Streaming / large-file import â€” `IOP-STREAM`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-STREAM-001` | The system shall ingest features from a file larger than available memory by streaming/chunked parsing, reporting progress without loading the whole file into memory. | S | P3 | STK-007; BR-005 | A |
| `IOP-STREAM-002` | A stream import that fails partway shall commit nothing (atomic import). | M | P3 | STK-007; NFR-REL-003 | T |

## Round-trip identity â€” `IOP-IDENT`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-IDENT-001` | On export the system shall write a stable per-element identifier and on re-import of the same file match elements to existing domain objects by that identifier rather than duplicating them. | S | P3 | STK-001, STK-007; NFR-COMPAT-001 | T |

## Documented schema mapping â€” `IOP-SCHEMA`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-SCHEMA-001` | The system shall maintain and publish a documented mapping between each supported format's schema and the domain object model (which domain properties map to which fields, and what is dropped). | M | P3 | STK-007; BR-005, CON-005 | I |

## Unsupported geometry handling â€” `IOP-GEOMX`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-GEOMX-001` | When an import contains a geometry type the domain cannot represent (e.g. 3D/Z, unsupported multipart, GeometryCollection members), the system shall skip or downgrade it with an itemized report rather than aborting the whole import or producing invalid geometry. | M | P3 | STK-001; BR-005, NFR-REL-003 | T |

## Coordinate precision on export â€” `IOP-PREC`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-PREC-001` | On export the system shall write coordinates at a configurable precision whose default preserves the plan CRS's positional accuracy (â‰¥ 6 decimal places for geographic degrees; â‰¥ 3 for projected metres/feet) without gratuitous digits. | S | P3 | STK-007; BR-005, NFR-COMPAT-001 | T |

## Cross-format CRS handling â€” `IOP-CRSX`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-CRSX-001` | On import the system shall detect the source CRS where declared and require the user to specify it where absent. | M | P3 | STK-001; BR-004 | T |
| `IOP-CRSX-002` | The system shall reproject imported/exported geometry between the source CRS and the plan CRS with the correct datum transformation. | M | P3 | STK-001; BR-004 | T |
| `IOP-CRSX-003` | The system shall warn the user when a chosen CRS is unsuitable for area/distance work (e.g. a geographic or Web-Mercator CRS used as the plan CRS). | S | P3 | STK-001; NFR-COMPAT-002 | D |

## Multi-sheet DXF/DWG sheet-set export â€” `IOP-DXFSHEET`

Phase-6 sheet-set export that preserves layouts, viewports, xrefs, plot styles,
and NCS-conformant layer names. Distinct from the planar `IOP-DXF` basemap
interchange.

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-DXFSHEET-001` | The system shall export a sheet-set as DXF (and, where DEP-006 permits, DWG), one layout per sheet, preserving viewport extent, plot scale, clipping, and rotation. | M | P6 | STK-008; BR-012, DEP-006 | T |
| `IOP-DXFSHEET-002` | The export shall preserve per-viewport layer overrides (visibility, colour, lineweight, linetype). | M | P6 | STK-008; BR-012 | T |
| `IOP-DXFSHEET-003` | The export shall preserve title blocks, dimensions, text, symbols/blocks (including annotative scale sets), and revision graphics. | M | P6 | STK-008; BR-012 | T |
| `IOP-DXFSHEET-004` | The export shall preserve xref relationships between sheets and referenced drawings/schedules. | S | P6 | STK-008; BR-012 | T |
| `IOP-DXFSHEET-005` | The export shall write layer names conformant with the project's active layer standard (`DOM-LAYERSTD`). | M | P6 | STK-008; BR-012, CON-011 | T |
| `IOP-DXFSHEET-006` | Sheet-set import from a well-formed DXF/DWG shall reconstruct sheets, layouts, viewports, title-block instances, layers, and per-viewport overrides. | S | P6 | STK-008; BR-012 | T |

## Multi-sheet PDF plot output â€” `IOP-PDFSHEET`

Phase-6 multi-sheet PDF, distinct from the single-page `IOP-PDF` exhibit.

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-PDFSHEET-001` | The system shall export a sheet-set as a single multi-sheet PDF in sheet-number order with a bookmark per sheet and per discipline. | M | P6 | STK-008; BR-012, DEP-005 | T |
| `IOP-PDFSHEET-002` | The system shall alternatively export the sheet-set as a per-sheet ZIP archive of single-page PDFs. | S | P6 | STK-008; BR-012 | T |
| `IOP-PDFSHEET-003` | The system shall optionally produce a PDF conformant with PDF/A-2 (ISO 19005-2) for archival submission. | S | P6 | STK-008; BR-012, DEP-005 | T |
| `IOP-PDFSHEET-004` | The system shall optionally produce a PDF conformant with PDF/E-1 (ISO 24517-1) for engineering deliverables. | C | P6 | STK-008; BR-012, DEP-005 | T |
| `IOP-PDFSHEET-005` | The PDF shall embed all fonts used by annotations, dimensions, and title blocks. | M | P6 | STK-008; NFR-PLOT-002, DEP-005 | T |
| `IOP-PDFSHEET-006` | The PDF shall be plotted at true scale so that a distance measured on a printed sheet at 100 % is within the plot scale tolerance of the intended distance. | M | P6 | STK-008; NFR-PLOT-001 | A |
| `IOP-PDFSHEET-007` | The PDF shall preserve layer/optional-content groups so that consumers with a compatible viewer can toggle disciplines/layers. | S | P6 | STK-008; BR-012, DEP-005 | T |
| `IOP-PDFSHEET-008` | The PDF export flow shall include a manifest file listing sheet number, title, revision, and issue for every sheet in the bundle. | S | P6 | STK-008, STK-003; BR-007 | T |

## Plot-style-table interchange â€” `IOP-PLTSTYLE`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-PLTSTYLE-001` | The system shall import a colour-dependent plot-style table (CTB) or a named plot-style table (STB) supplied by a project team and apply it to sheet-set plots. | S | P6 | STK-008; BR-012, CON-011 | T |
| `IOP-PLTSTYLE-002` | The system shall export the project's active plot-style tables in CTB/STB form for consumers who require them for downstream production. | S | P6 | STK-008; BR-012 | T |

## CAD layer-name mapping â€” `IOP-LAYERMAP`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-LAYERMAP-001` | On import the system shall let a user map source CAD layer names to the project's active layer standard (NCS/AIA/ISO 13567) with a documented default. | M | P6 | STK-008; BR-012, CON-011 | D |
| `IOP-LAYERMAP-002` | The system shall persist a named layer-mapping profile per source template for reuse across imports from the same source. | S | P6 | STK-008; BR-012 | T |
| `IOP-LAYERMAP-003` | On export the system shall emit layers using the project's active layer standard, or a caller-specified alternative standard, without altering the on-project canonical names. | S | P6 | STK-008; BR-012 | T |

## Title-block interchange â€” `IOP-TITLEBLOCK`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-TITLEBLOCK-001` | The system shall import a title-block template supplied as a DWG/DXF drawing (block definition + attribute placeholders) into the project's title-block catalog. | S | P6 | STK-008; BR-012, DEP-006 | T |
| `IOP-TITLEBLOCK-002` | The import shall map DWG/DXF block attributes to the ISO 7200 data fields and prompt for unmapped attributes. | S | P6 | STK-008; BR-012, CON-011 | D |
| `IOP-TITLEBLOCK-003` | The system shall export a title-block template as a DWG/DXF block for round-trip. | C | P6 | STK-008; BR-012 | T |

## Symbol / block library interchange â€” `IOP-BLOCK`

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `IOP-BLOCK-001` | The system shall import a DWG/DXF block library archive into the project or organisation symbol palette, preserving attributes and (where present) annotative-scale sets. | S | P6 | STK-008; BR-012, DEP-006 | T |
| `IOP-BLOCK-002` | The system shall export placed symbols as DWG/DXF block instances on sheet-set export, preserving the block-instance relationship rather than exploding to primitive geometry. | S | P6 | STK-008; BR-012 | T |

## Format coverage summary

| Format | Import | Export | Priority | Phase |
| --- | :--: | :--: | :--: | :--: |
| GeoJSON | âœ“ | âœ“ | M | P3 |
| KML/KMZ | âœ“ | âœ“ | S | P3 |
| Shapefile | âœ“ | âœ“ | M / S | P3 |
| DXF/DWG (basemap) | âœ“ | âœ“ | M / S | P3 |
| DXF/DWG sheet-set | âœ“ | âœ“ | S / M | P6 |
| GeoPackage | âœ“ | âœ“ | C | P3 |
| GeoTIFF (raster underlay) | âœ“ | â€” | M | P3 |
| Image/PDF underlay | âœ“ | â€” | S | P3 |
| PDF exhibit (single page) | â€” | âœ“ | S | P3 |
| PDF sheet-set (multi-page) | â€” | âœ“ | M | P6 |
| PDF/A-2 archival | â€” | âœ“ | S | P6 |
| PDF/E-1 engineering | â€” | âœ“ | C | P6 |
| CSV | âœ“ | âœ“ | C | P3 |
| Plot-style tables (CTB/STB) | âœ“ | âœ“ | S | P6 |
| Title-block templates (DWG/DXF block) | âœ“ | âœ“ | S / C | P6 |
| Symbol/block libraries (DWG/DXF) | âœ“ | âœ“ | S | P6 |

> Formats deliberately **excluded** for now (per [scope](../00-overview/scope-and-context.md#out-of-scope-non-goals)):
> LandXML, CityGML, IFC/BIM, and glTF/OBJ 3D exchange. These are candidates for a
> later phase if 3D and BIM interchange enter scope; they are not requirements
> today. Sheet-set interchange is scoped to DXF/DWG and PDF variants.

---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](file:///f:/AutoCAD%20Competitor/docs/requirements/README.md)
- [Master Requirements Traceability Matrix (RTM)](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/traceability-matrix.md)
- [Requirements Coverage Report](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/unimplemented_requirements.md)
- [Frontend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/frontend-requirements.md)
- [Backend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/backend-requirements.md)
- [Domain Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/domain-requirements.md)
- [Interoperability Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/03-nonfunctional/nonfunctional-requirements.md)

