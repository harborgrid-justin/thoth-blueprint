# @thoth/service-geospatial

Geospatial & interoperability for Thoth Blueprint.

> **Status: scaffold.** Not implemented. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
> and [`docs/ROADMAP.md`](../../docs/ROADMAP.md) (Phase 3).

## Responsibilities

- Coordinate reference systems and transforms between them.
- Layer storage and spatial queries.
- **Import:** GeoJSON, KML, Shapefile, DXF/DWG basemaps.
- **Export:** GeoJSON, KML, PDF exhibits.

## Boundaries

- Maps external formats to and from `@thoth/domain` objects — it does not define a
  parallel geometry model.
- Establishes a CRS on every import and declares one on every export; documents
  lossy conversions. No silent unit/CRS assumptions.

## Reference

`../../artifact/src/lib/importer` (DBML/DDL parsers) is a useful reference for
parser structure and error handling — reuse the shape, re-implement here. Never
import from `artifact/`.
