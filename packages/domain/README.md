# @thoth/domain

The **framework-agnostic planning domain model** for Thoth Blueprint â€” the shared
language of the built environment used by the client (`apps/`), the backend
(`services/`), and tooling.

> **Status: implemented (Phase 1).** The spatial foundation, planning primitives,
> and core rules/metrics are real and unit-tested. See the
> [roadmap](../../docs/ROADMAP.md); this package is the gating dependency for the
> workspace in [`apps/web`](../../apps/web), which consumes it directly.

## Scripts

```bash
npm install
npm run type-check   # tsc, strict
npm test             # vitest (geometry + metrics)
```

## Hard boundaries

This package must stay **pure**:

- âŒ No React / no DOM.
- âŒ No server framework.
- âŒ No database driver or storage.
- âœ… Pure TypeScript domain types and rules that run anywhere (client, service, test).

Presentation belongs in `apps/`, transport/storage in `services/`.

## What lives here

- **Spatial foundation** (`geometry.ts`, `spatial.ts`) â€” coordinate reference
  systems, units, scale, geometry (area, perimeter, centroid, bounds,
  point-in-polygon, polygon offset for setbacks, bearing), and measured (unit-aware)
  area/length helpers.
- **Planning primitives** (`primitives.ts`, `landuse.ts`) â€” `Site`, `Parcel`,
  `Block`, `Lot`, `Zone`, `LandUse`, `Building`, `RightOfWay`, `Easement`,
  `OpenSpace`, `Layer`, and the land-use category registry.
- **Rules & metrics** (`rules.ts`, `metrics.ts`) â€” buildable envelope from
  setbacks, grid subdivision, compliance checks, and coverage / FAR / density /
  land-use allocation / impervious & open-space ratios.
- **Survey** (`survey.ts`) â€” the plat/surveyor functions: metes-and-bounds
  courses, quadrant bearings (DMS) & azimuths, traverse closure and precision,
  corner coordinates (northing/easting), area in survey units, and generated
  metes-and-bounds legal descriptions.
- **Infrastructure networks** (`network.ts`) â€” roads and utilities as connected
  nodes and edges: length, connectivity/components, intersections & dead-ends,
  corridor area, and service coverage.
- **Terrain & earthwork** (`terrain.ts`) â€” elevation grids interpolated from spot
  elevations, bilinear sampling, contour generation (marching squares), slope and
  aspect, buildable-slope analysis, pad grading, and cut/fill volumes between an
  existing and a proposed surface.
- **Point-cloud interchange** (`pointcloud.ts`) â€” colored point-cloud parse and
  serialize for XYZ, PTS, PLY (ascii + binary), LAS (ASPRS binary), and DXF, plus
  downsampling and conversion to/from spot elevations.
- **COLLADA export** (`collada.ts`) â€” a minimal, valid `.dae` writer for triangle
  meshes, used to export a plan as a 3D model.

See [`docs/GLOSSARY.md`](../../docs/GLOSSARY.md) for definitions; types here mirror
that vocabulary exactly.

## Invariants

1. Every geometry carries a CRS, units, and scale â€” no unitless shapes.
2. Rules are pure functions with tests.
3. Named, documented tolerance constants â€” no magic numbers in geometric compares.

## Reference

The archived app (`../../artifact/src/lib`) is a useful pattern reference for
import/export and data modeling, but **do not import from it** â€” re-implement
cloud-first here.

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

