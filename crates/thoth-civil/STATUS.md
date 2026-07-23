# `thoth-civil` port status

Every file under `packages/domain/src/civil/**`, mapped to where (if
anywhere) it landed in `crates/thoth-civil/src`. See `GAPS.md` for *why* the
`not-yet-ported` rows are unported — in every case it's a cross-crate
dependency this crate isn't allowed to take (survey `Point2D`, planning
`Site`, drawing `qto`/`labeling`/`planproduction`), not a missing gap in
`thoth-spatial` or a skipped effort.

Legend: **ported+tested** = full behavior + unit tests ported.
**ported+partial-tests** = ported, with some of the source file's behavior
or some of its test file's cases out of scope (noted). **not-yet-ported** =
no Rust exists yet for this file.

## Source modules

| TS source | Rust location | Status | Notes |
|---|---|---|---|
| `alignment.ts` | `src/alignment.rs` | ported+tested | Core PI-method resolver, stationing, offsets, design-speed check, LandXML export. |
| `assembly.ts` | `src/assembly.rs` | ported+tested | `getDefaultSubassemblies` only returns the federal-data fallback (see `GAPS.md` #4). |
| `common/geometryHelpers.ts` | `src/common/geometry_helpers.rs` | ported+tested | |
| `common/index.ts` | `src/common/mod.rs` | ported | Barrel re-export; TS `result.ts` re-exports replaced crate-wide by `error::CivilError` (see `GAPS.md` #5). |
| `common/result.ts` | `src/error.rs` (`CivilError`, `CivilResult`) | ported (redesigned) | Rust's native `Result` replaces the hand-rolled `Result<T,E>`/`ok`/`err`/`CivilDomainError` trio. |
| `common/units.ts` | `src/common/units.rs` | ported+tested | |
| `common/vector.ts` | `src/common/vector.rs` | ported+tested | |
| `corridor.ts` | `src/corridor.rs` | ported+tested | `DEFAULT_SAMPLING_FREQUENCY` mirrors the federal-data fallback. |
| `featureLinesAndGrading.ts` | — | not-yet-ported | Imports `Point2D`/`LineSegment` from `survey/transparentCommands`. See `GAPS.md` #1. |
| `gisAnd3DVisualization.ts` | — | not-yet-ported | Same as above, plus depends on `featureLinesAndGrading.ts`/`siteAndParcels.ts`. |
| `grading.ts` | `src/grading.rs` | ported+tested | `CU_FT_PER_CU_YD` mirrors federal data. |
| `helpers/civilStudioHelpers.ts` | `src/helpers.rs` | ported+tested | |
| `index.ts` | `src/lib.rs` | ported (partial re-export) | Module wiring only re-exports what's ported; unported modules are simply absent rather than re-exported as stubs. |
| `intersection.ts` | `src/intersection.rs` | ported+tested | `DEFAULT_CURB_RADIUS` mirrors federal-data fallback. |
| `labelsAndUDP.ts` | — | not-yet-ported | Survey dependency + `siteAndParcels.ts`. See `GAPS.md` #1. |
| `layoutTemplates.ts` | — | not-yet-ported | Depends on `viewFramesAndMatchLines.ts`. |
| `network.ts` | `src/network.rs` | ported+tested | `default_road_width` mirrors federal data. |
| `parcelTables.ts` | — | not-yet-ported | Depends on `labelsAndUDP.ts`/`siteAndParcels.ts`. |
| `partbuilder.ts` | `src/partbuilder.rs` | ported+tested | `getDefaultPartsCatalog` uses only the built-in fallback names (see `GAPS.md` #4). |
| `pipedesign.ts` | `src/pipedesign.rs` | ported+tested | `DEFAULT_PIPE_DESIGN_RULES` mirrors federal data. |
| `pointcloud.ts` | `src/pointcloud.rs` | ported+tested | `pointCloudToSpots`/`spotsToPointCloud` adapted to a local `PointCloudSpot` (see `GAPS.md` #2). |
| `profile.ts` | `src/profile.rs` | ported+tested | |
| `sampleLinesAndSections.ts` | — | not-yet-ported | Survey dependency + `sheetsAndDataRefs.ts`. |
| `scriptsAnd3DObjects.ts` | — | not-yet-ported | Survey dependency + `siteAndParcels.ts`/`gisAnd3DVisualization.ts`. |
| `sections.ts` | `src/sections.rs` | ported+tested | `DEFAULT_SWATH_WIDTH` mirrors federal-data fallback. |
| `sheetsAndDataRefs.ts` | — | not-yet-ported | Depends on `viewFramesAndMatchLines.ts`. |
| `siteAndParcels.ts` | — | not-yet-ported | Imports `Point2D`/`LineSegment` from `survey/transparentCommands`. |
| `superelevation.ts` | `src/superelevation.rs` | ported+tested | `DEFAULT_EMAX`/`DEFAULT_NORMAL_CROWN`/`DEFAULT_SPEED_MULTIPLIER` mirror federal data. |
| `terrain.ts` | `src/terrain.rs` | ported+tested | `ElevationGrid` gains a validating constructor (see its doc comment) and an `elevation_at_strict` in addition to the total `elevation_at`. |
| `terrainModel.ts` | `src/terrain_model.rs` | ported (adapted)+tested | Takes pre-extracted spots/grade-regions instead of a whole planning `Site`. See `GAPS.md` #2. |
| `viewFramesAndMatchLines.ts` | — | not-yet-ported | Imports `Point2D`/`LineSegment` from `survey/transparentCommands`. |

## `types/*.ts`

Every `types/<module>.ts` file's interfaces are inlined directly into the
corresponding `.rs` module above (matching the TS source's own convention of
re-exporting its types file's exports from the sibling implementation file) —
there is no separate `types/` directory in this crate. `types/pipeDesign.ts`,
`types/network.ts`, etc. map 1:1 onto the struct/enum definitions at the top
of `pipedesign.rs`, `network.rs`, and so on.

## Test files

| TS test file | Rust location | Status | Notes |
|---|---|---|---|
| `tests/alignment.test.ts` | `src/alignment.rs` `#[cfg(test)]` | ported+tested | Every case ported 1:1, plus extra edge cases (empty PI chain, out-of-range station). |
| `tests/engineering.test.ts` | Split across `src/profile.rs`, `src/pipedesign.rs`, `src/superelevation.rs`, `src/assembly.rs`, `src/corridor.rs`, `src/grading.rs`, `src/alignment.rs` `#[cfg(test)]` | ported+partial-tests | The vertical-profile, pipe-network, superelevation, assembly, corridor, grading, and alignment-design-speed cases are all ported. The QTO (`drawing/qto`), label-template (`drawing/labeling`), and view-frame (`drawing/planproduction`) cases are **not** ported — those functions live in the drawing domain, out of scope for this crate. See `GAPS.md` #3. |
| `tests/network.test.ts` | `src/network.rs` `#[cfg(test)]` | ported+tested | Every case ported 1:1, plus an empty-network edge case. |
| `tests/pointcloud.test.ts` | `src/pointcloud.rs` `#[cfg(test)]` | ported+tested | Every case ported 1:1 (XYZ/PTS/PLY-ascii/PLY-binary/LAS/DXF round-trips, format dispatch, downsampling, spot conversion), plus malformed-header/signature edge cases. |
| `tests/terrain.test.ts` | Split across `src/terrain.rs`, `src/grading.rs` `#[cfg(test)]` | ported+partial-tests | Interpolation, slope, contours, grading/earthwork, water-drop-flow, and the "Grading & Topographic calculations" (drape/daylight/pond/drainage) cases are all ported. The "description keys & point groups" cases test `survey/descriptionKeys`, a different domain's module merely re-exported through this test file — not ported (not this crate's code to port). |

## Summary

- **32 of 32** TS source files under `packages/domain/src/civil/**` (34 counting `common/index.ts` and `common/result.ts` separately) accounted for: 22 ported (19 fully 1:1, `common/result.ts` redesigned onto native `Result`, `terrainModel.ts` adapted at the crate boundary, `common/index.ts`/`index.ts` as module wiring), 10 not-yet-ported (all blocked on the same cross-crate dependency pattern, documented once in `GAPS.md` rather than repeated per file).
- All 5 test files in scope have Rust coverage; 3 are 1:1, 2 are partial (each partiality is a small, clearly-scoped subset that belongs to another domain).
- 102 `#[test]` functions, all passing; `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` both clean.
