# Port status: `crates/thoth-planning`

Honest, file-by-file mapping of this crate's TS mandate
(`packages/domain/src/planning/**` and `packages/domain/src/smart/**`) to its
Rust port. Statuses:

- **ported+tested** — behavior-complete port with tests covering the TS
  original's test cases (or, where no TS test file exists, original tests
  covering the same ground).
- **ported+partial-tests** — the core function/type is ported, but either
  some sub-behavior is intentionally out of scope (documented inline and in
  `GAPS.md`) or not every TS test case has a Rust counterpart.
- **not-yet-ported** — no Rust code exists for this file yet.

Per the task brief, the core rules/metrics/subdivision/setback engine and the
full element type hierarchy (`Site` + every concrete element) are complete
and are the highest-priority items — see the table below for exactly which
those are.

## `packages/domain/src/planning/`

| TS source | Rust port | Status |
| --- | --- | --- |
| `building.ts` | — | **not-yet-ported**. Pure-geometry helpers (`wallDirection`, `wallPolygon`, `openingJambs`, `doorSwing`, `roomArea`, `levelContents`, `findWall`) are portable without new dependencies; the catalog-backed helpers (`WALL_TYPES`, `resolveWallType`, `createWallFromPart`, `createDoorFromPart`, `createWindowFromPart`, `getBuildingDoorsFromCatalog`, `getBuildingWindowsFromCatalog`) depend on `globalPartsDb` (`packages/domain/src/parts`), which is outside this crate's rules/metrics/subdivision mandate. |
| `common/index.ts` | `src/common.rs` | **ported+tested** (barrel re-export; folded into the one function it re-exports). |
| `common/math.ts` | `src/common.rs::clamp01` | **ported+tested**. |
| `curtainwall.ts` | — | **not-yet-ported**. The `CurtainWall`/`CurtainWallGrid` *element* is ported in `src/elements.rs` (a must-have per the task brief); the panel/mullion grid-layout *algorithm* (`CurtainWallGeometryResults` computation) is not. |
| `doorwindow.ts` | — | **not-yet-ported**. `DoorElement`/`WindowElement` structs are ported (`src/elements.rs`); the swing-path/glazing-polygon geometry algorithms are not. |
| `elementFactory.ts` | — | **not-yet-ported**. |
| `elementMeta.ts` | — | **not-yet-ported**. |
| `erosion.ts` | `src/erosion.rs` | **ported+partial-tests**. `auditErosionCompliance` (the compliance-rule half, explicitly in this crate's "erosion control" mandate) is fully ported and tested 1:1 against `tests/erosion.test.ts`'s compliance scenario. `ErosionSimulator` (a randomized particle/hydrology simulation over an `ElevationGrid` from `thoth-civil`) is **not ported** — see `GAPS.md` §3 and the module docs in `erosion.rs`: it depends on a cross-crate terrain type and is a simulation, not a planning rule. |
| `geoid/adapter.ts` | — | **not-yet-ported**. |
| `geoid/compliance.ts` | — | **not-yet-ported**. |
| `geoid/index.ts` | — | **not-yet-ported**. |
| `geoid/presets.ts` | — | **not-yet-ported**. |
| `geoid/registry.ts` | — | **not-yet-ported**. |
| `geoid/types.ts` | — | **not-yet-ported**. |
| `geoid/utils.ts` | — | **not-yet-ported**. |
| `geoid/data/**/*.json` | — | **not-yet-ported** (not embedded as static data). |
| `landlot.ts` | `src/landlot.rs` | **ported+tested**. Uses a local `section_frame` copy in place of `thoth-survey`'s `sectionFrame` — see `GAPS.md` §2. |
| `landuse.ts` | `src/land_use.rs` | **ported+tested**. Uses the hardcoded fallback label/color for `residential` rather than looking them up in `globalPartsDb` first — see the module doc comment; this is what the TS falls back to whenever the catalog has no override. |
| `metrics.ts` | `src/metrics.rs` | **ported+tested**, 1:1 against `tests/metrics.test.ts` plus an added empty-site edge case. |
| `regions.ts` | `src/regions.rs` | **ported+partial-tests**. The plug-in registry (`ALL_CAPABILITIES`, `resolve_capabilities`, all three region plug-ins, `get_region_plugin`/`list_region_plugins`) is fully ported and tested against `tests/regions.test.ts`'s "region plug-ins" and "Georgia Land Lot System" describe blocks. That test file's third block ("consolidated curve table", `collectSiteCurves`) is **not ported** — it belongs to `thoth-drawing`'s `drawing/platset.ts`, out of scope here. |
| `renovation.ts` | `src/renovation.rs` | **ported+tested**, 1:1 against `tests/renovation.test.ts`. |
| `roof.ts` | — | **not-yet-ported**. `RoofElement`/`Dormer` structs are ported (`src/elements.rs`); the pitch/ridge/hip/valley/rafter geometry algorithm is not. |
| `rules.ts` | `src/rules.rs` | **ported+tested**. No dedicated TS test file exists for `rules.ts`; tests here are original coverage of `buildable_envelope`/`buildable_area`/`subdivide_grid`/`check_compliance`. |
| `sampleData.ts` | — | **not-yet-ported**. |
| `search.ts` | — | **not-yet-ported**. |
| `stairs.ts` | — | **not-yet-ported**. `Stair` struct is ported (`src/elements.rs`); the riser/tread/stringer geometry algorithm is not. |
| `subdivision.ts` | `src/subdivision.rs` | **ported+tested**, 1:1 against `tests/subdivision.test.ts` and `tests/subdivision_error_boundaries.test.ts`, plus the full 100-scenario coverage of `tests/subdivision_100_collision.test.ts` (as two looping `#[test]`s rather than 100 discrete ones — see the doc comment in `subdivision.rs`). `tests/subdivision_100_plat.test.ts` was not individually cross-checked case-by-case (time-boxed) but exercises the same `subdivideSlideLine`/`splitPolygonByLine` functions already under test. |
| `vertex.ts` | — | **not-yet-ported**. Small (paste-offset, arc-reindexing-after-insert/delete, clone-and-offset-an-element) but depends on `isPointElement`/`isSpatialElement` predicates that map cleanly onto `PlanElement::is_spatial`/`base()` here — a good first pickup for a follow-on pass. |
| `presets/knightsbridgeLot11Plat.ts` | — | **not-yet-ported**. |
| `presets/princeWilliamHousePlat.ts` | — | **not-yet-ported**. |
| `presets/knightsbridgeLot11Plat.test.ts` | — | **not-yet-ported** (no source ported). |
| `presets/knightsbridgeInteractiveWorkflow.test.ts` | — | **not-yet-ported** (no source ported). |
| `types/building.ts` | — | **not-yet-ported** (the footprint `Building` *element* itself is ported — see `spatial/types/index.ts` row below; `Level`/`WallType`/`Wall`/`Door`/`Window`/`Room`/`BuildingModel` interior-model types are not). |
| `types/curtainwall.ts` | — | **not-yet-ported** (`CurtainWallGeometryResults` and its panel/mullion result types; the `CurtainWall` element + grid config type are ported). |
| `types/doorwindow.ts` | — | **not-yet-ported** (`DoorGeometryResults`/`WindowGeometryResults`/`UnitScheduleItem`/`UnitSchedule`). |
| `types/erosion.ts` | `src/erosion.rs` | **ported+tested** (`ErosionParticle`, `BarrierStats`, `SimulationFrame`). |
| `types/index.ts` | — | N/A — barrel re-export; covered by its constituent files above. |
| `types/landlot.ts` | `src/landlot.rs` | **ported+tested** (`LandLotRef`). |
| `types/landuse.ts` | `src/land_use.rs` | **ported+tested** (`LandUseCategory`, `LandUseDefinition`). |
| `types/metrics.ts` | `src/metrics.rs` | **ported+tested** (`LandUseAllocation`, `SiteMetrics`, `CommunityMetrics`). |
| `types/regions.ts` | `src/regions.rs` | **ported+partial-tests** — see the `regions.ts` row. |
| `types/renovation.ts` | `src/renovation.rs` | **ported+tested** (`RenovationTakeoff`). |
| `types/roof.ts` | — | **not-yet-ported** (`RoofGeometryResults`; the `RoofElement` element type is ported). |
| `types/rules.ts` | `src/rules.rs` | **ported+tested** (`SubdivisionOptions`). |
| `types/stairs.ts` | — | **not-yet-ported** (`StairGeometryResults`; the `Stair` element type is ported). |
| `types/subdivision.ts` | `src/subdivision.rs` | **ported+tested** (`SlideLineOptions`, `SwingLineOptions`). |
| `tests/curtainwall.test.ts` | — | **not-yet-ported** (source not ported). |
| `tests/doorwindow.test.ts` | — | **not-yet-ported** (source not ported). |
| `tests/erosion.test.ts` | `src/erosion.rs` | **ported+partial-tests** — the compliance-audit case is a 1:1 port; the `ErosionSimulator` case is not (see the `erosion.ts` row). |
| `tests/metrics.test.ts` | `src/metrics.rs` | **ported+tested**, 1:1. |
| `tests/regions.test.ts` | `src/regions.rs` + `src/landlot.rs` | **ported+partial-tests** — see the `regions.ts` row. |
| `tests/renovation.test.ts` | `src/renovation.rs` | **ported+tested**, 1:1. |
| `tests/roof.test.ts` | — | **not-yet-ported** (source not ported). |
| `tests/stairs.test.ts` | — | **not-yet-ported** (source not ported). |
| `tests/subdivision.test.ts` | `src/subdivision.rs` | **ported+tested**, 1:1. |
| `tests/subdivision_100_collision.test.ts` | `src/subdivision.rs` | **ported+tested** — see the `subdivision.ts` row. |
| `tests/subdivision_100_plat.test.ts` | `src/subdivision.rs` | **ported+partial-tests** — not individually cross-checked case-by-case; overlapping function coverage only (see the `subdivision.ts` row). |
| `tests/subdivision_error_boundaries.test.ts` | `src/subdivision.rs` | **ported+tested**, 1:1. |

## `packages/domain/src/spatial/types/index.ts` (element hierarchy — highest priority)

Not in the file list above (it lives under `spatial/`, not `planning/`), but
this is the **highest-priority deliverable** the task brief calls out, and it
is fully ported:

| TS interface | Rust port | Status |
| --- | --- | --- |
| `Region`, `Parcel`, `Block`, `Lot`, `Zone`, `LandUse`, `Building`, `RightOfWay`, `Easement`, `OpenSpace`, `WaterBody`, `PlantingArea`, `GradeRegion`, `Stair`, `CurtainWall`(+`CurtainWallGrid`), `DoorElement`, `WindowElement`, `RoofElement`(+`Dormer`) | `src/elements.rs` | **ported+tested** — every field, every nested enum (`StairType`, `DivisionMode`, `InfillMaterial`, `CornerStyle`, `FireRating`, `SafetyGlazing`, `FrameProfile`, `DoorOperation`, `HardwareTrim`, `WindowType`, `RoofType`, `ShingleMaterial`, `DormerType`, `RegionType`, `EasementPurpose`, `WaterType`, `PlantingType`, `GradeMethod`). |
| `PlanNote`, `Tree`, `SpotElevationPoint` | `src/elements.rs` | **ported+tested**. |
| `PlanElement` (the tagged union) | `src/elements.rs::PlanElement` | **ported+tested** — custom `Serialize`/`Deserialize` dispatching on the `"kind"` field (see the doc comment: serde's derive can't express an internally-tagged enum whose content also flattens a struct carrying that same tag field). |
| `Site` | `src/elements.rs::Site` | **ported+partial-tests** — carries every field this crate's own logic reads (`spatial`, `layers`, `elements`, `jurisdiction_id`, `geoid`, plus the erosion audit's `control_lines`/`civil_symbols`/`networks`); omits the cross-crate fields (`networks`'s siblings `alignments`, `monuments`, `plss`, `drawingSets`, `sheetViewports`, `dimensions`, `cadLayers`, `buildingModels`, `annotations`) pending `thoth-civil`/`thoth-survey`/`thoth-drawing` — see `GAPS.md` §4. |

## `packages/domain/src/smart/`

**Entirely not-yet-ported.** `engine.ts`, `index.ts`, `smartErosion.ts`,
`smartGeometry.ts`, `smartGrading.ts`, `smartHydraulics.ts`,
`smartPlanProduction.ts`, `smartStructural.ts`, `smartSubdivision.ts`,
`types.ts` — none of these have a Rust counterpart in this pass. This was a
deliberate time-boxing choice: the task brief's highest-priority items are
the core rules/metrics/subdivision/setback engine and the element hierarchy,
both of which are complete; the "smart" automation layer (roughly 2,000 lines
of TS across 9 files) is real, substantial follow-on work for a future pass,
not something to port shallowly just to claim coverage.

## Summary

**Fully ported + tested, no known gaps beyond what's documented in `GAPS.md`:**
the element type hierarchy (`Site` + all 21 element kinds), `rules.rs`
(buildable envelopes, grid subdivision, zoning compliance), `subdivision.rs`
(slide-line/swing-line/merge + every documented error case),
`metrics.rs` (coverage/FAR/density/land-use allocation/community metrics),
`land_use.rs`, `landlot.rs`, `renovation.rs`, and the erosion **compliance
audit** in `erosion.rs`.

**Not yet ported:** the `Stair`/`CurtainWall`/`Door`/`Window`/`Roof`
*geometry algorithms* (their element *types* are ported), the building
interior model, GEOID/PLSS compliance data and logic, element
factory/metadata/search helpers, sample data and presets, and the entire
`smart/` automation layer.

**Test count:** 58 `#[test]` functions, all passing.
**Quality gates:** `cargo fmt -p thoth-planning -- --check`,
`cargo clippy -p thoth-planning --all-targets -- -D warnings`, and
`cargo test -p thoth-planning` are all clean as of this pass.
