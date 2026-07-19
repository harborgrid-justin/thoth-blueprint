# Glossary Additions (requirements suite)

The definitive planning vocabulary lives in the project
[`GLOSSARY.md`](../../GLOSSARY.md) — including the domain terms this suite added
(Block, Building, Easement, Dedication, Open Space, Scenario, Datum,
Bearing/Azimuth, Basemap, FAR/FSI, Frontage, Yield, Metes and Bounds, Gross vs
Net Area, Parking Ratio, GSI/OSR). This file defines the **technical and UI terms**
introduced by the requirements that are not planning-domain vocabulary. Each names
the requirement that introduces it.

## Client / UI terms

- **Reference Underlay** — a user-supplied image, PDF, or CAD drawing positioned and
  georeferenced beneath a plan for tracing/context; distinct from a tile basemap.
  (`FE-NAV-005`, `IOP-RASTER-002`)
- **Saved View** — a named, recallable viewport and extent within a plan.
  (`FE-NAV-006`, `FE-PRINT-003`)
- **North Arrow** — an on-plan indicator of orientation relative to the CRS.
  (`FE-NAV-007`, `FE-PRINT-002`)
- **Exhibit / Sheet** — a composed, printable presentation of a plan view with title
  block, legend, scale bar, and north arrow. (`FE-PRINT-001/002`, `IOP-PDF-001`)
- **Command Palette** — a searchable list of invokable workspace commands.
  (`FE-CMD-002`)
- **Callout** — a text note connected to an element or location by a leader line.
  (`FE-CANVAS-010`)
- **Save Status** — the client's indication of whether local edits are persisted to
  the server (saved / saving / failed). (`FE-STATE-001`)
- **Scenario Comparison** — a side-by-side or overlaid view of alternative plan
  variants and their metrics. (`FE-SCENARIO-*`)

## Interoperability terms

- **Field Mapping (Attribute Mapping) / Mapping Profile** — a persisted correspondence
  between source-file fields and domain object properties. (`IOP-FIELD-*`)
- **Round-trip Identity** — preservation of stable element identifiers across export
  and re-import, so re-importing updates rather than duplicates. (`IOP-IDENT-001`)
- **Georeferencing / Rubber-sheeting** — assigning real-world coordinates (and, for
  un-referenced images, control-point warping) to raster/image data.
  (`IOP-RASTER-002`)
- **Schema Mapping** — the documented correspondence between a file format's schema
  and the domain object model. (`IOP-SCHEMA-001`)

## Domain-model & serialization terms

- **Element Identifier** — a stable, unique ID borne by every domain element,
  persistent across edits and serialization. (`DOM-IDENT-001`)
- **Plan Serialization / Portable Plan** — the canonical, schema-versioned serialized
  representation of a whole plan, shared by client and services. (`DOM-SERIAL-*`)
- **Snapshot** — an immutable capture of a plan's full state backing a
  Checkpoint/Version. (`DOM-SNAPSHOT-001`)
- **Structural Diff** — the added/removed/changed elements between two snapshots.
  (`DOM-SNAPSHOT-002`)
- **Arc / Curved Boundary** — a circular-arc boundary segment (e.g., curved road
  frontage). (`DOM-GEOM-006`)
- **Interior Ring (Hole)** — an excluded region within a polygon. (`DOM-GEOM-007`)
- **Closure Error** — the gap between the start and computed end of a metes-and-bounds
  boundary. (`DOM-SURVEY-003`)
- **Tolerance** — a named allowed deviation (coordinate, conversion, metric,
  interoperability); values in the
  [standards tolerances table](standards-and-conventions.md#tolerances).

## Non-functional terms

- **Benchmark Scenario / Reference Dataset** — a named fixed input
  (`BENCH-TYPICAL` / `BENCH-LARGE` / `BENCH-STRESS` / `BENCH-COLLAB`) used to measure
  performance and scalability targets. (`NFR-BENCH-*`)
- **Performance Regression Budget** — the allowed degradation on a benchmarked metric
  before CI fails. (`NFR-BENCH-004`)
- **RPO / RTO** — Recovery Point / Recovery Time Objectives for backup and disaster
  recovery. (`NFR-AVAIL-002`)
- **SBOM / SCA** — Software Bill of Materials / Software Composition Analysis.
  (`NFR-SEC-009/010`)
- **Data Residency** — constraint that data is stored/processed within a specified
  geographic region. (`NFR-PRIV-005`)
