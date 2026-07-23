# Gaps between `packages/domain/src/civil` and `crates/thoth-civil`

`thoth-civil` depends only on `thoth-spatial` (per the migration brief — it
must not depend on `thoth-planning`, `thoth-survey`, or `thoth-drawing`, all
of which are other agents' crates, in the dependency order `thoth-spatial ->
thoth-civil -> thoth-survey -> thoth-planning -> thoth-drawing`). The TS
source under `packages/domain/src/civil/**` does not respect that boundary:
several modules import types and even runtime data from
`packages/domain/src/survey`, `packages/domain/src/spatial/primitives` (the
planning element hierarchy), `packages/domain/src/drawing`, and
`packages/domain/src/parts/registry`. None of these are gaps in
`thoth-spatial` itself — `thoth-spatial` was read in full and has everything
this crate needs of it (`Point`, `Polygon`, `Bounds`, `SpatialContext`,
`Unit`, the pure geometry ops). The gaps below are *cross-domain*
dependencies in the TS source that don't fit the crate boundaries this
migration was given, plus one genuine design decision on error-vs-`Option`
semantics. Nothing here was worked around by editing `thoth-spatial`.

## 1. `Point2D`/`LineSegment` from `packages/domain/src/survey/transparentCommands` — RESOLVED

**Status as of this round: closed.** `thoth-survey`'s own `Point2D` turned
out to be `pub type Point2D = thoth_spatial::Point` — a type alias, not a
distinct type (see `crates/thoth-survey/src/transparent_commands.rs`) — and
`LineSegment` is a trivial `{start, end}` two-point struct. Neither actually
requires depending on `thoth-survey`: this crate now defines its own
structurally identical `LineSegment` in `src/common/line_segment.rs` (see
that file's doc comment) and uses `thoth_spatial::Point` directly wherever
the TS source used `Point2D`. All ten files previously blocked on this (see
below) are now ported.

Originally documented gap (kept for history): TS files that imported
`Point2D`/`LineSegment` from the survey domain —
`siteAndParcels.ts`, `viewFramesAndMatchLines.ts`,
`sampleLinesAndSections.ts`, `featureLinesAndGrading.ts`,
`gisAnd3DVisualization.ts`, `labelsAndUDP.ts`, `scriptsAnd3DObjects.ts` —
plus the two that only depended on those —
`parcelTables.ts` (depends on `labelsAndUDP`/`siteAndParcels`) and
`layoutTemplates.ts`/`sheetsAndDataRefs.ts` (depend on
`viewFramesAndMatchLines`) — were marked `not-yet-ported`. Re-reading each
file's actual body (not just its import list) for this round confirmed that,
once the `Point2D`/`LineSegment` blocker is lifted, **none of these ten
files touch `thoth-planning` or `thoth-drawing` at all** — every other
import is to a sibling module within `packages/domain/src/civil/**` itself,
which is exactly this crate's territory. So all ten port fully, with one
narrow exception noted in §6 below (an arbitrary-script-execution feature in
`scriptsAnd3DObjects.ts` that has no Rust equivalent for reasons unrelated to
crate boundaries).

## 2. Planning element hierarchy (`Site`, `GradeRegion`, `SpotElevationPoint`) from `packages/domain/src/spatial/primitives`/`types`

- `terrainModel.ts`'s `buildTerrainModel(site: Site)` pulls
  `SpotElevationPoint`/`GradeRegion` elements out of a whole `Site`.
  `thoth-planning` owns `Site` and the rest of the element hierarchy (see
  `thoth-spatial`'s own module docs, which say as much). **Worked around**:
  `terrain_model.rs` ports the actual civil-engineering logic — building an
  existing/proposed `ElevationGrid` pair from a set of spots and grade
  regions — as `build_terrain_model(spots: &[SpotElevation], grades:
  &[GradeRegionInput], extent: Option<Bounds>)`, taking the already-extracted
  spot/grade data instead of a `Site`. Extracting spots and grade regions
  from an actual `Site` is a planning-domain concern left to
  `thoth-planning` or a caller with both crates in scope.
- `pointcloud.ts`'s `pointCloudToSpots`/`spotsToPointCloud` convert to/from
  the planning `SpotElevationPoint` element. **Worked around**: ported
  against a local `PointCloudSpot` struct (same fields: id, layer id,
  position, z, label) instead of the planning element type.

## 3. `packages/domain/src/drawing/{qto,labeling,planproduction}`

`tests/engineering.test.ts` (one of the five test files in scope) imports
`calculateSectionArea`/`averageEndAreaVolume` from `../../drawing/qto`,
`compileLabelTemplate` from `../../drawing/labeling`, and
`generateViewFrames` from `../../drawing/planproduction`. These functions
operate on civil types (`CrossSection`, station-formatted label variables)
but live in the **drawing** domain (`thoth-drawing`'s crate). The civil-only
parts of that test file — vertical profile curves, pipe network rules,
superelevation, assembly offsets, corridor sections, grading volumes,
alignment design-speed checks — are ported into this crate's own
`#[cfg(test)]` modules (see `STATUS.md`); the three drawing-domain pieces are
not, and are out of scope for `thoth-civil`.

## 4. Parts-catalog registry (`packages/domain/src/parts/registry`) and `planning/geoid/data/federalReference.json`

Several modules (`assembly.ts`, `corridor.ts`, `intersection.ts`,
`partbuilder.ts`, `pipedesign.ts`, `sections.ts`, `superelevation.ts`) read
default numeric constants (design speeds, curb radii, sampling frequencies,
lane widths, …) from two places at runtime: a static JSON file
(`federalReference.json`) and a `GlobalPartsDatabase` registry that can be
extended at runtime with user-defined parts. Neither is a Rust crate this
one can depend on:

- `federalReference.json` is plain data. Its values are mirrored directly as
  named Rust constants (e.g. `superelevation::DEFAULT_EMAX`,
  `network::default_road_width`, `pipedesign::DEFAULT_PIPE_DESIGN_RULES`),
  each doc-commented with the exact JSON path it mirrors.
- The parts registry is, in every module this crate ports, consulted only
  as an *optional override* with the same federal-data value as its
  fallback (`catalogStd?.properties?.X as number) || defaultRoads.X`) — and
  at the time of this port, the registry has no entries in the relevant
  subcategories (`"pipes"`, `"civil_design_standards"` beyond what's already
  mirrored), so the override branch is dead in practice today. This crate
  therefore always takes the federal-data fallback value. If the parts
  registry later gains real overrides that need to reach `thoth-civil`, that
  is a runtime configuration concern for whatever composes this crate with
  the registry (most naturally: a caller-supplied override struct passed
  into the relevant functions) — not a reason to add a
  `thoth-parts`-equivalent dependency to this crate.

## 5. `Option` vs. `Result<T, CivilError>` — a deliberate, not a forced, deviation

Not a cross-crate gap, but worth stating explicitly since it's the one place
this port doesn't mirror the TS control flow 1:1: the TS source frequently
returns `null` for both (a) a legitimate "no such point on this alignment"
query and (b) a genuine caller error (fewer than 2 PIs, a grid with `cellSize
<= 0`). This crate keeps `Option` for (a) and introduces
[`crate::error::CivilError`] for (b) — see `resolve_alignment`,
`point_at_station`, and `ElevationGrid::new`'s doc comments for the specific
reasoning at each call site. This is a strict improvement in fidelity to
*intent*, not a loss of behavioral parity: every TS test case's actual
inputs/outputs are preserved, only the "why did I get nothing back" signal is
sharpened.

## 6. `scriptsAnd3DObjects.ts`'s `executeImportScript` — a runtime gap, not a crate-boundary one

`executeImportScript` evaluates an arbitrary caller-supplied JavaScript
string via `new Function(...)` to compute a data-mapping result, falling
back to a fixed default mapping if the script throws. This is **not** a
cross-crate dependency gap like the others in this document — no sibling
Rust crate owns "arbitrary script execution" for this crate to depend on.
Rust simply has no embedded JS engine, and embedding one (e.g. `boa`,
`deno_core`) purely to run short id/description-mapping snippets would be a
disproportionate addition to a systems-engineering domain crate, well
outside this port's scope. `crate::scripts_and_3d_objects` ports the actual
mapping logic every current call site's default script computes
(`default_import_script_mapping`) and exposes `execute_import_script` taking
a native Rust closure in place of an interpreted string — the idiomatic Rust
equivalent of "caller-supplied mapping rule" without an interpreter. Every
behavior this domain's tests exercise (the default mapping) is fully
covered; only literally-interpreted, caller-authored-at-runtime JS text has
no equivalent.
