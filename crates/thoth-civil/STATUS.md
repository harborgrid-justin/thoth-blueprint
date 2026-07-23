# `thoth-civil` port status

Every file under `packages/domain/src/civil/**`, mapped to where (if
anywhere) it landed in `crates/thoth-civil/src`. See `GAPS.md` for *why* the
remaining not-yet-ported rows are unported, and for the history of the ten
rows that were closed this round (they were blocked on a `Point2D`/
`LineSegment` cross-crate dependency that turned out not to require a new
crate dependency at all — see `GAPS.md` #1).

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
| *(new, this crate only)* | `src/common/line_segment.rs` | n/a | A local `LineSegment` (`{start, end}` over `thoth_spatial::Point`), added this round so the ten files below don't need a `thoth-survey` dependency (see `GAPS.md` #1). Not a port of any TS file — `thoth-survey` owns the TS `LineSegment` type this mirrors. |
| `corridor.ts` | `src/corridor.rs` | ported+tested | `DEFAULT_SAMPLING_FREQUENCY` mirrors the federal-data fallback. |
| `featureLinesAndGrading.ts` | `src/feature_lines_and_grading.rs` | ported+tested | `Point2D`/`LineSegment` now `thoth_spatial::Point`/`crate::common::LineSegment`; `Point3D` from `crate::grading`. All REQ-089–REQ-095, REQ-183–REQ-198 behavior ported (feature-line creation with the single-elevation topology rule, MAPCLEAN cleanup, stepped offset, delete PI, line weeding, Panorama elevation editor, grade/elevation-by-reference edits, corridor extraction, high/low insertion). |
| `gisAnd3DVisualization.ts` | `src/gis_and_3d_visualization.rs` | ported+tested | REQ-096–REQ-100, REQ-161–REQ-169: TIN breaklines/paste-surface, GeoJSON/CSV GIS import, aerial imagery config, Cloud Model Builder area (with the 200 sq km cap), coverage-area smoothing, tree-point→SDF conversion, Civil3D DWG import, Revit model import with filename/view-name validation. |
| `grading.ts` | `src/grading.rs` | ported+tested | `CU_FT_PER_CU_YD` mirrors federal data. |
| `helpers/civilStudioHelpers.ts` | `src/helpers.rs` | ported+tested | |
| `index.ts` | `src/lib.rs` | ported (partial re-export) | Module wiring only re-exports what's ported; unported modules are simply absent rather than re-exported as stubs. |
| `intersection.ts` | `src/intersection.rs` | ported+tested | `DEFAULT_CURB_RADIUS` mirrors federal-data fallback. |
| `labelsAndUDP.ts` | `src/labels_and_udp.rs` | ported+tested | REQ-036–REQ-046: area/segment label generation, azimuth↔DMS formatting, plan-readability enforcement, reverse/flip, geometry-change updates. `LabelEngine`'s registry-keyed style lookup is adapted to functions taking the parent style directly (see the module's doc comment) — this removes the "parent style not found" error class entirely rather than porting it. |
| `layoutTemplates.ts` | `src/layout_templates.rs` | ported+tested | REQ-130–REQ-141, REQ-148, REQ-149: standard ANSI D imperial templates (plan/profile/plan-over-plan/section), profile-view-shift calculation, selected-view-frame filtering. |
| `network.ts` | `src/network.rs` | ported+tested | `default_road_width` mirrors federal data. |
| `parcelTables.ts` | `src/parcel_tables.rs` | ported+tested | REQ-047–REQ-055: line/curve/segment/area table generation and tagging, static-table locking, column sort, header editing, stack splitting. |
| `partbuilder.ts` | `src/partbuilder.rs` | ported+tested | `getDefaultPartsCatalog` uses only the built-in fallback names (see `GAPS.md` #4). |
| `pipedesign.ts` | `src/pipedesign.rs` | ported+tested | `DEFAULT_PIPE_DESIGN_RULES` mirrors federal data. |
| `pointcloud.ts` | `src/pointcloud.rs` | ported+tested | `pointCloudToSpots`/`spotsToPointCloud` adapted to a local `PointCloudSpot` (see `GAPS.md` #2). |
| `profile.ts` | `src/profile.rs` | ported+tested | |
| `sampleLinesAndSections.ts` | `src/sample_lines_and_sections.rs` | ported+tested | REQ-081–REQ-088, REQ-154–REQ-160: sample-line-group generation along a station range, model-space section-view grid layout (by-rows/by-columns, starting-corner offsets, draft-mode prerequisite), section-sheet batching. |
| `scriptsAnd3DObjects.ts` | `src/scripts_and_3d_objects.rs` | ported+partial-tests | REQ-170–REQ-180: SDF/CSV export, Asset Card configuration, interactive 3D model placement all ported 1:1. `executeImportScript`'s arbitrary-JS-string execution has no Rust equivalent (no embedded JS engine — see `GAPS.md` #6, a runtime gap, not a crate-boundary one); the mapping logic every call site's default script actually computes is ported as `default_import_script_mapping`, with `execute_import_script` taking a native closure in its place. |
| `sections.ts` | `src/sections.rs` | ported+tested | `DEFAULT_SWATH_WIDTH` mirrors federal-data fallback. |
| `sheetsAndDataRefs.ts` | `src/sheets_and_data_refs.rs` | ported+tested | REQ-071–REQ-080: layout-sheet generation from a view frame group (with the >10-sheets-per-DWG advisory warning), Data Shortcut references. |
| `siteAndParcels.ts` | `src/site_and_parcels.rs` | ported+tested | REQ-023–REQ-035, REQ-123–REQ-129: site/parcel creation, geometry-based parcel generation, manual and slide-line subdivision, batch renumbering, global elevation edits, move/copy between sites, user-defined classification, table-tag numbering, boundary recompute. `SiteManager`'s registry-keyed class is adapted to functions taking `&mut SiteContainer` directly (see the module's doc comment) — this removes the "site not found" error class entirely; a parcel *id* can still fail to resolve within a given site, so `CivilError::UnknownParcel` is kept for that. |
| `superelevation.ts` | `src/superelevation.rs` | ported+tested | `DEFAULT_EMAX`/`DEFAULT_NORMAL_CROWN`/`DEFAULT_SPEED_MULTIPLIER` mirror federal data. |
| `terrain.ts` | `src/terrain.rs` | ported+tested | `ElevationGrid` gains a validating constructor (see its doc comment) and an `elevation_at_strict` in addition to the total `elevation_at`. |
| `terrainModel.ts` | `src/terrain_model.rs` | ported (adapted)+tested | Takes pre-extracted spots/grade-regions instead of a whole planning `Site`. See `GAPS.md` #2. |
| `viewFramesAndMatchLines.ts` | `src/view_frames_and_match_lines.rs` | ported+tested | REQ-056–REQ-070, REQ-143–REQ-145: parametric view-frame-group generation with automatic match lines, cascading group deletion, view-frame insertion (station-sorted), center/slider/rotation grip edits. `CivilDomainError` throws replaced by `CivilError::InvalidStationRange`/`InvalidViewportDimensions`/`NonPositiveInterval`. |

## `types/*.ts`

Every `types/<module>.ts` file's interfaces are inlined directly into the
corresponding `.rs` module above (matching the TS source's own convention of
re-exporting its types file's exports from the sibling implementation file) —
there is no separate `types/` directory in this crate. `types/pipeDesign.ts`,
`types/network.ts`, `types/featureLinesAndGrading.ts`,
`types/siteAndParcels.ts`, etc. map 1:1 onto the struct/enum definitions at
the top of the corresponding implementation file.

## Test files

| TS test file | Rust location | Status | Notes |
|---|---|---|---|
| `tests/alignment.test.ts` | `src/alignment.rs` `#[cfg(test)]` | ported+tested | Every case ported 1:1, plus extra edge cases (empty PI chain, out-of-range station). |
| `tests/engineering.test.ts` | Split across `src/profile.rs`, `src/pipedesign.rs`, `src/superelevation.rs`, `src/assembly.rs`, `src/corridor.rs`, `src/grading.rs`, `src/alignment.rs` `#[cfg(test)]` | ported+partial-tests | The vertical-profile, pipe-network, superelevation, assembly, corridor, grading, and alignment-design-speed cases are all ported. The QTO (`drawing/qto`), label-template (`drawing/labeling`), and view-frame (`drawing/planproduction`) cases are **not** ported — those functions live in the drawing domain, out of scope for this crate. See `GAPS.md` #3. |
| `tests/network.test.ts` | `src/network.rs` `#[cfg(test)]` | ported+tested | Every case ported 1:1, plus an empty-network edge case. |
| `tests/pointcloud.test.ts` | `src/pointcloud.rs` `#[cfg(test)]` | ported+tested | Every case ported 1:1 (XYZ/PTS/PLY-ascii/PLY-binary/LAS/DXF round-trips, format dispatch, downsampling, spot conversion), plus malformed-header/signature edge cases. |
| `tests/terrain.test.ts` | Split across `src/terrain.rs`, `src/grading.rs` `#[cfg(test)]` | ported+partial-tests | Interpolation, slope, contours, grading/earthwork, water-drop-flow, and the "Grading & Topographic calculations" (drape/daylight/pond/drainage) cases are all ported. The "description keys & point groups" cases test `survey/descriptionKeys`, a different domain's module merely re-exported through this test file — not ported (not this crate's code to port). |

None of the ten files closed this round (`siteAndParcels.ts` through
`sheetsAndDataRefs.ts`, see the source-module table above) had a dedicated
`tests/*.test.ts` file upstream — their Rust ports carry newly written
`#[cfg(test)]` coverage instead of a 1:1 test-file port, since there was no
TS test file to port from.

## Summary

- **32 of 32** TS source files under `packages/domain/src/civil/**` (34
  counting `common/index.ts` and `common/result.ts` separately) accounted
  for: **32 ported** (30 fully 1:1, `common/result.ts` redesigned onto
  native `Result`, `terrainModel.ts` adapted at the crate boundary,
  `common/index.ts`/`index.ts` as module wiring, `scriptsAnd3DObjects.ts`
  partially adapted per `GAPS.md` #6), **0 not-yet-ported**. This closes all
  ten files that were `not-yet-ported` in the previous round
  (`siteAndParcels.ts`, `viewFramesAndMatchLines.ts`,
  `sampleLinesAndSections.ts`, `featureLinesAndGrading.ts`,
  `gisAnd3DVisualization.ts`, `labelsAndUDP.ts`, `scriptsAnd3DObjects.ts`,
  `parcelTables.ts`, `layoutTemplates.ts`, `sheetsAndDataRefs.ts`) — all ten
  were blocked only on the `Point2D`/`LineSegment` cross-crate dependency
  documented (now resolved) in `GAPS.md` #1, not on `thoth-planning` or
  `thoth-drawing` as originally suspected; re-reading each file's full body
  confirmed none of them actually touch those domains.
- All 5 upstream test files in scope have Rust coverage; 3 are 1:1, 2 are
  partial (each partiality is a small, clearly-scoped subset that belongs to
  another domain). The ten newly closed files had no upstream test file to
  port 1:1 from; their Rust ports carry newly written unit test coverage
  instead (REQ-numbered where the source's own doc comments cite a REQ).
- **198** `#[test]` functions, all passing (up from 102 last round); `cargo
  fmt -p thoth-civil -- --check` and `cargo clippy -p thoth-civil
  --all-targets -- -D warnings` both clean. `cargo check --workspace`
  confirms `thoth-spatial -> thoth-civil -> thoth-survey -> thoth-planning ->
  thoth-drawing` still builds in order with no cycle; a single unrelated
  failure downstream in `thoth-governance` (a concurrent sibling agent's
  in-flight `thoth-planning::Site` field addition) is outside this crate's
  dependency graph and outside this task's scope.
