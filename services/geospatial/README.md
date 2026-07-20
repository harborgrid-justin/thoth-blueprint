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

- Maps external formats to and from `@thoth/domain` objects â€” it does not define a
  parallel geometry model.
- Establishes a CRS on every import and declares one on every export; documents
  lossy conversions. No silent unit/CRS assumptions.

## Reference

`../../artifact/src/lib/importer` (DBML/DDL parsers) is a useful reference for
parser structure and error handling â€” reuse the shape, re-implement here. Never
import from `artifact/`.

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

