# `thoth-drawing` port status

Phase 6 (`docs/ROADMAP.md`): CAD sheet composition and production. This crate
ports `packages/domain/src/drawing/**` and `packages/domain/src/parts/**` to
Rust.

**Dependency update (integration-debt-closing pass):** this crate now
depends on `thoth-planning` and `thoth-survey` in addition to `thoth-spatial`
and `thoth-civil` (added last round for `viewshed`), per the workspace's
mandated dependency order `thoth-spatial -> thoth-civil -> thoth-survey ->
thoth-planning -> thoth-drawing`. This unblocked most of what the previous
pass had documented as `not-yet-ported` for lacking a sibling-crate type —
see the per-file notes below and `GAPS.md` for exactly what's still blocked
and why.

Legend: **ported+tested** (full behavior, has unit tests) · **ported+partial-tests**
(most/some functions ported and tested; the rest documented as not-yet-ported
in the same file's module rustdoc) · **not-yet-ported** (needs a type this
crate genuinely cannot get yet — see the specific note on each such row for
whether that's still a dependency-order issue or, now, a sibling crate
(`thoth-planning`) simply not having ported the needed type itself, e.g.
`BuildingModel`).

## `packages/domain/src/drawing/**`

| TS source | Rust port | Status | Notes |
|---|---|---|---|
| `annotation.ts` | `src/annotation.rs` | ported+tested | Text styles, keynotes, grid bubbles, revision cloud bumps, room/opening tags — fully self-contained. |
| `builders.ts` | `src/builders.rs` | ported+partial-tests | See below. |
| `collada.ts` | `src/collada.rs` | ported+tested | `meshFormatFromName`, `prism`, `writeCollada` ported + all 3 TS tests ported 1:1. `siteToMeshes` is now **ported+tested** too: uses `thoth-civil::build_terrain_model`/`elevation_at` (already a dependency since last round) and `thoth-planning::{Site, PlanElement}` (new this round) — see the module rustdoc for the local `site_extent` helper (the `Site`-walking half of the TS `siteExtent`/`buildTerrainModel` that `thoth-civil` intentionally leaves to a caller with `thoth-planning` in scope). |
| `common/format.ts` | `src/common/format.rs` | ported+tested | Plus `format_thousands_fixed`, needed by `dimension::format_spot_coordinate`. |
| `common/index.ts` | `src/common/mod.rs` | ported+tested | Barrel re-export; no logic. |
| `common/units.ts` | `src/common/units.rs` | ported+tested | `paper_per_model` now returns `Result` (see `DrawingError::InvalidScale`). |
| `common/vector.ts` | `src/common/vector.rs` | ported+tested | |
| `defaultSet.ts` | `src/default_set.rs` | ported+tested | `ensureDrawingSet` is now ported as `ensure_drawing_set(site, plugin, existing_drawing_set, has_land_lot, has_building_model, year)` — see the module rustdoc for why `existing_drawing_set`/`has_land_lot`/`has_building_model`/`year` are explicit parameters instead of `site.drawingSets`/`site.landLot`/`site.buildingModels`/`Date.now()` (the latter two are genuinely missing from `thoth_planning::Site`; `site.monuments`/`site.plss` *are* now real `Site` fields and are read directly). |
| `dimension.ts` | `src/dimension.rs` | ported+tested | All 6 dimension kinds, all styles, `stackDimensionChains`, `formatSlope`, `formatSpotCoordinate`. `CoordinateBasis` is a small duplicated mirror of `thoth-survey`'s type (see module rustdoc). All 6 TS tests ported 1:1, plus edge cases (zero-length, zero-radius, degenerate angular). |
| `drafting.ts` | `src/drafting.rs` | ported+tested | Line weights/types, drawing scales, NCS disciplines/layers, plot styles. `DisciplineCode` is closed and `parse_sheet_number` validates against it — a deliberate hardening over the TS original's unchecked cast (documented on `DisciplineCode`). |
| `hatch.ts` | `src/hatch.rs` | ported+tested | Reads the ANSI31 entry from the parts catalog exactly as the TS does. |
| `index.ts` | `src/lib.rs` | ported | Module re-export barrel; Rust's module system replaces the need for a literal file. |
| `labeling.ts` | `src/labeling.rs` | ported+tested | `resolveLabelStyle`, `formatQuadrantBearing`, `compileLabelTemplate` (hand-rolled template + arithmetic substitution, no `eval`-equivalent). `formatStation` duplicated from `thoth-civil::common::units` (documented). |
| `planproduction.ts` | `src/planproduction.rs` | ported+partial-tests | `ViewFrame`/`PlanMatchLine`/`ViewFrameGroup` types + `createSheetSetFromFrames` ported (date is now an explicit parameter, not an impure `Date.now()` read — documented). `generateViewFrames` **not-yet-ported** (needs `thoth-civil::ResolvedAlignment`/`pointAtStation` — both now available in principle, but this function was outside this round's assigned scope; a good next pickup). |
| `platset.ts` | `src/platset.rs` | ported+tested | `SiteCurve` type ported. `collectSiteCurves` is now **ported+tested** as `collect_site_curves(site, alignments)`: uses `thoth-planning::{Site, PlanElement}`, `thoth-survey::survey::survey_report`, `thoth-survey::bearing::{azimuth_to_bearing, format_bearing}`, and `thoth-civil::alignment::resolve_alignment` — `alignments` is an explicit parameter because `site.alignments` isn't yet a `thoth_planning::Site` field (see the module rustdoc). |
| `qto.ts` | `src/qto.rs` | ported+tested | Cut/fill section areas, average-end-area volumes, mass haul, pay-item cost formulas (hand-rolled recursive-descent arithmetic evaluator, no `eval`-equivalent), CSV import. `CrossSection`/`CrossSectionPoint` are a duplicated mirror of `thoth-civil`'s types (documented). |
| `scene.ts` | `src/scene.rs` | ported+tested | The render-agnostic `SheetPrimitive` IR, `hatchLines` (vector hatch clipping), `arrowHead`, `dimTick`, `northArrow`. `hatchLines` now returns `Result` for a degenerate polygon or non-positive spacing instead of the TS original's empty-return/infinite-loop (documented, deliberate hardening). |
| `schedule.ts` | `src/schedule.rs` | ported+partial-tests | `ScheduleTable`/`ScheduleColumn`/`ScheduleRow` types + `curveSchedule` ported and tested, plus a new opt-in `ScheduleTable::validate()` for the "missing schedule column" error case. `doorSchedule`/`windowSchedule`/`roomSchedule`/`finishSchedule` remain **not-yet-ported** — genuinely blocked on `thoth-planning::BuildingModel`, which `thoth-planning`'s own `STATUS.md` confirms is not yet ported (its interior-model types — `Level`/`Wall`/`Door`/`Window`/`Room`/`BuildingModel` — are listed `not-yet-ported` there too). This is no longer a dependency-order problem; it's a sibling crate genuinely missing the type. |
| `sheet.ts` | `src/sheet.rs` | ported+tested | `Sheet`/`DrawingSet`/NCS numbering. `parse_sheet_number` returns `Result` (see `drafting.ts` row above for the discipline-validation hardening). |
| `sheetsize.ts` | `src/sheetsize.rs` | ported+tested | ANSI/ARCH/ISO sheet sizes + the parts-catalog extension entry, preserving its `series: "ANSI"` (uppercase) bypass quirk. |
| `sheetview.ts` | `src/sheetview.rs` | ported+tested | Viewport transforms (hand-rolled 2D affine, replacing `gl-matrix`), `fitScale`, `sectionGaze`. |
| `tests/collada.test.ts` | `src/collada.rs` (`#[cfg(test)]`) | ported 1:1 | All 3 cases, plus format/prism edge cases, plus original coverage for `site_to_meshes`/`site_extent` (no TS test file exists for those). |
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

Newly ported this round (`thoth-planning`/`thoth-survey` now dependencies):

- `siteBounds` -> `site_bounds(site)` — `site.monuments` is a real `Site` field,
  read directly.
- `drawFramework` -> `draw_framework(site, ctx, project)` — `site.plss` is read
  directly; `ctx.land_lot_nw_corner` stands in for `site.landLot?.nwCorner`
  (the Georgia Land Lot System frame, which `thoth_planning::Site` genuinely
  doesn't carry — see `GAPS.md`), via `thoth_survey::plss::section_frame`.
- `drawSitePlan` -> `draw_site_plan(site, ctx, project)` — the full element
  fill/hatch/label pass, alignment centerline/offsets/station ticks (via
  `thoth-civil::alignment`), and monument glyphs; `ctx.alignments` stands in
  for `site.alignments` (also not yet a `Site` field). The TS `_areaUnit`
  parameter (already unused in the original, per its own leading underscore)
  is dropped rather than carried forward as dead code. `elementColor`/its
  `MATERIAL_HATCH`-key helpers are a local mirror of `thoth-planning`'s
  not-yet-ported `planning/elementMeta.ts` (see the module rustdoc and
  `GAPS.md`'s "duplicate now, unify later" pattern).
- `buildIndexSheet` -> `build_index_sheet(set, site, ctx, layout, match_lines)`
  — the sheet-index table + fitted key-map thumbnail; `match_lines` stands in
  for `site.annotations?.matchLines` (not yet a `Site` field).
- `SitePlanContext<'a>` — new type bundling exactly the two genuinely-missing
  `Site` inputs (`land_lot_nw_corner`, `alignments`) these four functions
  need, the same "take exactly the missing fields" adaptation as
  `SheetMarks`.

Still **not-yet-ported**, and now for a different reason than last round —
genuinely blocked on `thoth-planning::BuildingModel`, which that crate's own
`STATUS.md` confirms doesn't exist yet (not a dependency-order issue this
crate can resolve on its own): `buildingBounds`, `drawFloorPlan`,
`schedulesFor`'s door/window/room/finish schedules (its curve-schedule half
is achievable today via `collect_site_curves` + `curve_schedule`, but the
function as a whole is primarily about the building-model schedules),
`buildBuildingViews`, and the top-level composer `buildSheetScene`/
`buildSheetPrimitives` (which dispatches to those same building-model
builders for its architectural/elevation/section-sheet branches — porting a
version that only handles the index/schedule/default-site-plan branches
would misrepresent which sheet types are actually supported, so it stays
undone as a whole; every building block it would need —
`draw_site_plan`/`build_index_sheet`/`draw_dimensions`/`draw_grid_bubbles`/
`draw_marks`/`viewport_title`/`build_frame`/`build_title_block`/
`build_revision_block`/`draw_schedule_table` — is now ported and available
for whoever picks this up once `BuildingModel` lands).

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
7. **`ensure_drawing_set`/`create_sheet_set_from_frames` take an explicit
   `date`/`year: &str`** instead of an impure `Date.now()`/`new Date()` read.
8. **`draw_site_plan` propagates `DrawingError` from `hatch_lines`** (a
   malformed hatch pattern or a densified boundary with fewer than 3
   vertices) instead of the TS original's silent-drop/hang — see item 2.

None of these change a single currently-observable output for well-formed
input — they only replace "silently wrong" or "hangs forever" behavior on
malformed input with an explicit, typed error.

## Integration-debt-closing pass (this round)

Added `thoth-planning` and `thoth-survey` as dependencies (see `Cargo.toml`),
per the workspace's mandated dependency order. This closed:

- `defaultSet::ensureDrawingSet` (`src/default_set.rs`, new file)
- `collada::siteToMeshes` (`src/collada.rs`)
- `platset::collectSiteCurves` (`src/platset.rs`)
- `builders::siteBounds`/`drawFramework`/`drawSitePlan`/`buildIndexSheet`
  (`src/builders.rs`)

**Genuinely still blocked** — not a dependency-order issue, but
`thoth-planning` itself not yet having ported a `BuildingModel`/interior-model
type (confirmed against that crate's own `STATUS.md`, which lists
`Level`/`Wall`/`Door`/`Window`/`Room`/`BuildingModel` as `not-yet-ported`):
`schedule::{doorSchedule,windowSchedule,roomSchedule,finishSchedule}`,
`builders::{buildingBounds,drawFloorPlan,schedulesFor,buildBuildingViews}`,
and the top-level composer `builders::{buildSheetScene,buildSheetPrimitives}`.

**Out of this round's assigned scope** (not blocked — `thoth-civil` has
carried `ResolvedAlignment`/`pointAtStation` since last round already):
`planproduction::generateViewFrames`. Left as a documented pickup for a
future pass rather than ported opportunistically, since it wasn't part of
this round's task brief.

**Test count:** 241 `#[test]` functions, up from 207 pre-existing (34 new:
13 in `default_set.rs` (new file), 4 in `collada.rs`, 4 in `platset.rs`, 13 in
`builders.rs`), all passing. `cargo fmt -p thoth-drawing -- --check` and
`cargo clippy -p thoth-drawing --all-targets --no-deps -- -D warnings` are
both clean; a plain (non-`--no-deps`) `cargo clippy -p thoth-drawing` run
transitively fails inside `thoth-planning::src/stairs.rs` (an
`unnecessary_unwrap` lint) — that file belongs to a different, concurrently
in-flight agent's pass over `thoth-planning` and is outside this crate's
scope to fix; `--no-deps` confirms this crate's own code is lint-clean.
