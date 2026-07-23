# `thoth-drawing` port status

Phase 6 (`docs/ROADMAP.md`): CAD sheet composition and production. This crate
ports `packages/domain/src/drawing/**` and `packages/domain/src/parts/**` to
Rust, depending only on `thoth-spatial`.

Legend: **ported+tested** (full behavior, has unit tests) · **ported+partial-tests**
(most/some functions ported and tested; the rest documented as not-yet-ported
in the same file's module rustdoc) · **not-yet-ported** (needs a type owned by
a crate this one does not depend on — `thoth-planning` `Site`/`BuildingModel`/
`RegionPlugin`, `thoth-civil` `ResolvedAlignment`/`CrossSection`/terrain, or
`thoth-survey` `CoordinateBasis`/survey reports).

## `packages/domain/src/drawing/**`

| TS source | Rust port | Status | Notes |
|---|---|---|---|
| `annotation.ts` | `src/annotation.rs` | ported+tested | Text styles, keynotes, grid bubbles, revision cloud bumps, room/opening tags — fully self-contained. |
| `builders.ts` | `src/builders.rs` | ported+partial-tests | See below. |
| `collada.ts` | `src/collada.rs` | ported+partial-tests | `meshFormatFromName`, `prism`, `writeCollada` ported + all 3 TS tests ported 1:1. `siteToMeshes` **not-yet-ported** (needs `thoth-civil::terrainModel`/`elevationAt` and `thoth-planning::Site`). |
| `common/format.ts` | `src/common/format.rs` | ported+tested | Plus `format_thousands_fixed`, needed by `dimension::format_spot_coordinate`. |
| `common/index.ts` | `src/common/mod.rs` | ported+tested | Barrel re-export; no logic. |
| `common/units.ts` | `src/common/units.rs` | ported+tested | `paper_per_model` now returns `Result` (see `DrawingError::InvalidScale`). |
| `common/vector.ts` | `src/common/vector.rs` | ported+tested | |
| `defaultSet.ts` | — | not-yet-ported | `ensureDrawingSet` needs `thoth-planning::Site` and a `RegionPlugin` abstraction end to end; nothing in it is self-contained. |
| `dimension.ts` | `src/dimension.rs` | ported+tested | All 6 dimension kinds, all styles, `stackDimensionChains`, `formatSlope`, `formatSpotCoordinate`. `CoordinateBasis` is a small duplicated mirror of `thoth-survey`'s type (see module rustdoc). All 6 TS tests ported 1:1, plus edge cases (zero-length, zero-radius, degenerate angular). |
| `drafting.ts` | `src/drafting.rs` | ported+tested | Line weights/types, drawing scales, NCS disciplines/layers, plot styles. `DisciplineCode` is closed and `parse_sheet_number` validates against it — a deliberate hardening over the TS original's unchecked cast (documented on `DisciplineCode`). |
| `hatch.ts` | `src/hatch.rs` | ported+tested | Reads the ANSI31 entry from the parts catalog exactly as the TS does. |
| `index.ts` | `src/lib.rs` | ported | Module re-export barrel; Rust's module system replaces the need for a literal file. |
| `labeling.ts` | `src/labeling.rs` | ported+tested | `resolveLabelStyle`, `formatQuadrantBearing`, `compileLabelTemplate` (hand-rolled template + arithmetic substitution, no `eval`-equivalent). `formatStation` duplicated from `thoth-civil::common::units` (documented). |
| `planproduction.ts` | `src/planproduction.rs` | ported+partial-tests | `ViewFrame`/`PlanMatchLine`/`ViewFrameGroup` types + `createSheetSetFromFrames` ported (date is now an explicit parameter, not an impure `Date.now()` read — documented). `generateViewFrames` **not-yet-ported** (needs `thoth-civil::ResolvedAlignment`/`pointAtStation`). |
| `platset.ts` | `src/platset.rs` | ported+partial-tests | `SiteCurve` type ported. `collectSiteCurves` **not-yet-ported** (needs `thoth-planning::Site`, `thoth-survey::surveyReport`/`formatBearing`, `thoth-civil::resolveAlignment`). |
| `qto.ts` | `src/qto.rs` | ported+tested | Cut/fill section areas, average-end-area volumes, mass haul, pay-item cost formulas (hand-rolled recursive-descent arithmetic evaluator, no `eval`-equivalent), CSV import. `CrossSection`/`CrossSectionPoint` are a duplicated mirror of `thoth-civil`'s types (documented). |
| `scene.ts` | `src/scene.rs` | ported+tested | The render-agnostic `SheetPrimitive` IR, `hatchLines` (vector hatch clipping), `arrowHead`, `dimTick`, `northArrow`. `hatchLines` now returns `Result` for a degenerate polygon or non-positive spacing instead of the TS original's empty-return/infinite-loop (documented, deliberate hardening). |
| `schedule.ts` | `src/schedule.rs` | ported+partial-tests | `ScheduleTable`/`ScheduleColumn`/`ScheduleRow` types + `curveSchedule` ported and tested, plus a new opt-in `ScheduleTable::validate()` for the "missing schedule column" error case. `doorSchedule`/`windowSchedule`/`roomSchedule`/`finishSchedule` **not-yet-ported** (need `thoth-planning::BuildingModel`). |
| `sheet.ts` | `src/sheet.rs` | ported+tested | `Sheet`/`DrawingSet`/NCS numbering. `parse_sheet_number` returns `Result` (see `drafting.ts` row above for the discipline-validation hardening). |
| `sheetsize.ts` | `src/sheetsize.rs` | ported+tested | ANSI/ARCH/ISO sheet sizes + the parts-catalog extension entry, preserving its `series: "ANSI"` (uppercase) bypass quirk. |
| `sheetview.ts` | `src/sheetview.rs` | ported+tested | Viewport transforms (hand-rolled 2D affine, replacing `gl-matrix`), `fitScale`, `sectionGaze`. |
| `tests/collada.test.ts` | `src/collada.rs` (`#[cfg(test)]`) | ported 1:1 | All 3 cases, plus format/prism edge cases. |
| `tests/dimension.test.ts` | `src/dimension.rs` (`#[cfg(test)]`) | ported 1:1 | All 6 cases, plus zero-length/zero-radius/degenerate-angle edge cases. |
| `types/*.ts` (11 files) | merged into the corresponding `.rs` module above | ported | Idiomatic Rust keeps a feature's types beside its functions rather than in a separate `types/` tree; every exported type has a home. |

### `builders.ts` detail

Ported (with one signature adaptation, documented in `builders.rs`'s module
rustdoc — functions that only ever read a couple of fields off the TS `Site`/
`RegionPlugin` now take exactly those fields):

- `sheetLayout`, `Projector`/`fitProjector`, `buildFrame`, `buildRevisionBlock`,
  `viewportTitle`, `drawScheduleTable` — verbatim.
- `buildTitleBlock` — takes `firm_lines_override: Option<&[String]>` instead of
  a `RegionPlugin` (only `plugin.titleBlock.firmLines` was ever read).
- `drawDimensions` — takes `&[Dimension]` + `&SpatialContext` instead of `Site`.
- `drawGridBubbles` — takes `&[GridLine]` instead of `Site`.
- `drawMarks` — takes a `SheetMarks<'_>` bundle of the 4 mark slices instead of `Site`.

Not-yet-ported (need `thoth-planning::Site`/`BuildingModel` and
`thoth-civil::resolveAlignment`/`offsetAlignmentPath`/`fullStations`,
`thoth-survey::sectionFrame`): `siteBounds`, `buildingBounds`, `drawFramework`,
`drawSitePlan`, `drawFloorPlan`, `schedulesFor`, `buildIndexSheet`,
`buildBuildingViews`, and the top-level composer `buildSheetScene`/
`buildSheetPrimitives`.

## `packages/domain/src/parts/**`

| TS source | Rust port | Status | Notes |
|---|---|---|---|
| `data/*.json` (7 files) | `src/parts/data/*.json` (copied verbatim) | ported+tested | Embedded via `include_str!` + `serde_json`, not flattened into Rust literals — the data stays data. |
| `data/index.ts` | `src/parts/data.rs` | ported+tested | `initial_parts_catalog()`; tests assert the exact per-file counts (50 parts total) and global id uniqueness. |
| `index.ts` | `src/parts/mod.rs` | ported | Barrel re-export. |
| `registry.ts` | `src/parts/registry.rs` | ported+tested | `GlobalPartsDatabase` — every method ported (`register_part`/`update_part` now return `Result` instead of throwing), plus `global_parts_db()`, a cached singleton accessor replacing the TS module-level `export const globalPartsDb`. |
| `types.ts` | `src/parts/types.rs` | ported+tested | `PartCategory` kept as a closed enum for the *typed filter* API; `PartSpecification.category`/`.unit` are open `String`s because the catalog JSON itself contains values (`"drawing"`, `"survey"`, `"in"`) outside the TS union — the TS loader already bypasses its own type via `as unknown as PartSpecification[]`, so this port models the actual runtime shape (documented in the module rustdoc). |

## Deliberate, documented deviations from the TS original

Every one of these is called out in the relevant module's rustdoc; listed
here for a single at-a-glance summary:

1. **`parse_sheet_number` validates the discipline letter** against the 21 NCS
   codes and returns `Result`, instead of the TS original's unchecked
   `as DisciplineCode` cast that would silently accept `"K-101"`.
2. **`hatch_lines` rejects a non-positive/non-finite `spacing`** with
   `DrawingError::MalformedHatchPattern` instead of looping forever (the TS
   `for (x = minX; x <= maxX; x += spacing)` never terminates for
   `spacing <= 0`), and rejects a <3-vertex polygon with
   `DrawingError::DegeneratePolygon` instead of silently returning `[]`.
3. **`paper_per_model` returns `Result`**, guarding against a non-finite/
   non-positive resolved ratio (currently unreachable through the registered
   scale/unit tables, but guarded rather than trusted).
4. **`ScheduleTable::validate()`** is a new, opt-in check that a missing
   column is an explicit error rather than a silently blank cell.
5. **`create_sheet_set_from_frames` takes `date: &str`** instead of calling
   `new Date().toLocaleDateString()` internally, keeping the function pure.
6. **Registry methods return `Result`** (`register_part`/`update_part`)
   instead of throwing a bare `Error`.

None of these change a single currently-observable output for well-formed
input — they only replace "silently wrong" or "hangs forever" behavior on
malformed input with an explicit, typed error.
