# @thoth/domain

The **framework-agnostic planning domain model** for Thoth Blueprint — the shared
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

- ❌ No React / no DOM.
- ❌ No server framework.
- ❌ No database driver or storage.
- ✅ Pure TypeScript domain types and rules that run anywhere (client, service, test).

Presentation belongs in `apps/`, transport/storage in `services/`.

## What lives here

- **Spatial foundation** (`geometry.ts`, `spatial.ts`) — coordinate reference
  systems, units, scale, geometry (area, perimeter, centroid, bounds,
  point-in-polygon, polygon offset for setbacks, bearing), and measured (unit-aware)
  area/length helpers.
- **Planning primitives** (`primitives.ts`, `landuse.ts`) — `Site`, `Parcel`,
  `Block`, `Lot`, `Zone`, `LandUse`, `Building`, `RightOfWay`, `Easement`,
  `OpenSpace`, `Layer`, and the land-use category registry.
- **Rules & metrics** (`rules.ts`, `metrics.ts`) — buildable envelope from
  setbacks, grid subdivision, compliance checks, and coverage / FAR / density /
  land-use allocation / impervious & open-space ratios.
- **Survey** (`survey.ts`) — the plat/surveyor functions: metes-and-bounds
  courses, quadrant bearings (DMS) & azimuths, traverse closure and precision,
  corner coordinates (northing/easting), area in survey units, and generated
  metes-and-bounds legal descriptions.
- **Infrastructure networks** (`network.ts`) — roads and utilities as connected
  nodes and edges: length, connectivity/components, intersections & dead-ends,
  corridor area, and service coverage.
- **Terrain & earthwork** (`terrain.ts`) — elevation grids interpolated from spot
  elevations, bilinear sampling, contour generation (marching squares), slope and
  aspect, buildable-slope analysis, pad grading, and cut/fill volumes between an
  existing and a proposed surface.

See [`docs/GLOSSARY.md`](../../docs/GLOSSARY.md) for definitions; types here mirror
that vocabulary exactly.

## Invariants

1. Every geometry carries a CRS, units, and scale — no unitless shapes.
2. Rules are pure functions with tests.
3. Named, documented tolerance constants — no magic numbers in geometric compares.

## Reference

The archived app (`../../artifact/src/lib`) is a useful pattern reference for
import/export and data modeling, but **do not import from it** — re-implement
cloud-first here.
