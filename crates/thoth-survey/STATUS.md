# `thoth-survey` port status

Every file under `packages/domain/src/survey/**`, mapped to its Rust port
location and status. Status values:

- **ported+tested** — full behavioral port, with `#[test]`s covering every
  corresponding TS test case plus additional edge cases.
- **ported+partial-tests** — ported, but a known, documented divergence or
  narrower scope than the TS original (see the note).
- **not-yet-ported** — out of scope for this pass; reason given. See
  `GAPS.md` for the full explanation of *why* (cross-crate dependencies on
  `thoth-civil`/`thoth-planning`/`thoth-drawing`, none of which this crate
  depends on).

## Core modules

| TS source | Rust location | Status | Notes |
|---|---|---|---|
| `common/bearing.ts` | `src/bearing.rs` | ported+tested | Byte-for-byte bearing text formatting (`N45°30′15″E`, `Due North`, …). |
| `common/result.ts` | `src/error.rs` | ported+tested (superseded) | No 1:1 port — Rust's `std::result::Result<T, E>` + `SurveyError` (`thiserror`) is the idiomatic replacement. See `GAPS.md` #7. |
| `common/index.ts` | `src/lib.rs` (module wiring) | ported | Barrel re-export; no dedicated Rust file needed. |
| `survey.ts` | `src/survey.rs` | ported+tested | Courses, closure (coordinate + recorded), interior angles, DMD area, legal description, bearing parsing, Compass/Transit traverse adjustment. |
| `types/survey.ts` | `src/survey.rs` (co-located) | ported | `QuadrantBearing`/`Dms` live in `bearing.rs`; the rest co-located with the functions that produce them. |
| `plss.ts` | `src/plss.rs` | ported+tested | Section frames, aliquot rectangles/acreage, PLSS text formatting, serpentine section numbering. |
| `types/plss.ts` | `src/plss.rs` (co-located) | ported | |
| `monument.ts` | `src/monument.rs` | ported+tested | Monument type legend + labeling. |
| `types/monument.ts` | `src/monument.rs` (co-located) | ported | |
| `controls.ts` | `src/controls.rs` | ported+tested | Control-line and civil-symbol legends. |
| `types/controls.ts` | `src/controls.rs` (co-located) | ported | |
| `descriptionKeys.ts` | `src/description_keys.rs` | ported+partial-tests | `DEFAULT_DESCRIPTION_KEYS` always returns the hardcoded fallback list (the parts catalog it prefers isn't a dependency of this crate — see `GAPS.md` #4). Wildcard matching, key lookup, and description formatting are fully ported. |
| `types/descriptionKeys.ts` | `src/description_keys.rs` (co-located) | ported | |
| `points.ts` | `src/points.rs` | ported+tested | ASCII point-file parsing (all 5 formats), import preview, `PointGroupManager` (manual numbers, ranges, wildcards, query rules, effective styles). |
| `types/points.ts` | *(not ported as its own shape)* | ported+partial-tests | This file's `CogoPoint`/`PointGroupConfig` are a second, divergent shape never actually imported by `points.ts` — `points.ts` defines and uses its own inline interfaces. This port follows the real, exercised shape (`points.ts`'s own), documented at the top of `points.rs`. |
| `transparentCommands.ts` | `src/transparent_commands.rs` | ported+tested | Point-range linework, quadrant-bearing/azimuth/deflection point placement, line join/extend, polyline grip edits, the full `BD`/`ZD`/`AD`/`DD`/`PN`/`PNAME`/`PO`/`ZE`/`C` transparent-command executor. |
| `types/transparentCommands.ts` | `src/transparent_commands.rs` (co-located) | ported | |
| `advancedLinework.ts` | `src/advanced_linework.rs` | ported+partial-tests | All REQ-109…REQ-117 functions ported. `createRightOfWayParcel`'s return type (`ParcelObject`) is a local stand-in (`RowParcel`) for the real `thoth-civil`/`thoth-planning` type — see `GAPS.md` #5. |
| `types/advancedLinework.ts` | `src/advanced_linework.rs` (co-located) | ported | |
| `index.ts` | `src/lib.rs` (module wiring) | ported | |
| `types/index.ts` | `src/lib.rs` (module wiring) | ported | |

## Workspace gap (ported locally, not from `thoth-spatial`)

| TS source | Rust location | Status | Notes |
|---|---|---|---|
| `../spatial/curve.ts` | `src/curve.rs` | ported+tested | Not part of frozen `thoth-spatial`; ported locally since `survey.rs` and `metes_and_bounds.rs` genuinely need arc-aware boundary math. See `GAPS.md` #1. |

## Helpers (`helpers/*.ts`)

| TS source | Rust location | Status | Notes |
|---|---|---|---|
| `helpers/metesAndBoundsHelpers.ts` | `src/helpers/metes_and_bounds.rs` | ported+tested | Self-contained (only needs `curve::boundary_area` + `bearing::bearing_to_azimuth`). |
| `helpers/platDrawingHelpers.ts` | `src/helpers/plat_drawing.rs` | ported+tested | Self-contained (only needs `thoth_spatial::geometry`). |
| `helpers/platReportHelpers.ts` | `src/helpers/plat_report.rs` | ported+tested | Self-contained (only needs `crate::survey::SurveyReport`). |
| `helpers/subdivisionHelpers.ts` | `src/helpers/subdivision.rs` | ported+tested | Self-contained (only needs `thoth_spatial::distance`). |
| `helpers/alignmentReportHelpers.ts` | — | not-yet-ported | Needs `civil/alignment::ResolvedAlignment` (`thoth-civil`, not a dependency). |
| `helpers/assemblyBuilderHelpers.ts` | — | not-yet-ported | Needs `civil/assembly::{Assembly, Subassembly}` (`thoth-civil`). |
| `helpers/buildPlatFromScratch.ts` | — | not-yet-ported | Needs the full planning element hierarchy (`spatial/types::{Site, Parcel, Lot, Building, Easement, RightOfWay, PlanNote, Layer}`), owned by `thoth-planning`. |
| `helpers/corridorHelpers.ts` | — | not-yet-ported | Needs `civil/assembly::Assembly` + `civil/corridor::{buildCorridorSections, extractCorridorFeatureLines}` (`thoth-civil`). |
| `helpers/gradingHelpers.ts` | — | not-yet-ported | Needs `civil/grading::{GradingPad, solveBalancedElevation}` (`thoth-civil`). |
| `helpers/pipeHelpers.ts` | — | not-yet-ported | Needs `civil/pipeDesign::{validatePipeNetwork, PipeDesignRules}` (`thoth-civil`). |
| `helpers/planProductionHelpers.ts` | — | not-yet-ported | Needs `civil/alignment::resolveAlignment` (`thoth-civil`) + `drawing/planproduction::{createSheetSetFromFrames, generateViewFrames}` (`thoth-drawing`). |
| `helpers/platSheetHelpers.ts` | — | not-yet-ported | Needs `spatial/primitives::isSpatialElement` (not in frozen `thoth-spatial`) and `spatial/types::Site` (`thoth-planning`). |
| `helpers/profileHelpers.ts` | — | not-yet-ported | Needs `civil/profile::{sampleCrossSection, VerticalProfile, VerticalPVI}` (`thoth-civil`). |
| `helpers/superelevationHelpers.ts` | — | not-yet-ported | Needs `civil/superElevation::calculateSuperelevationRunoff` (`thoth-civil`). |

**Helper coverage: 4/14 ported+tested, 10/14 not-yet-ported** (all ten for
the same reason: a real, undischargeable dependency on `thoth-civil`,
`thoth-planning`, and/or `thoth-drawing`, none of which are dependencies of
`thoth-survey`). See `GAPS.md` #3 for the full accounting.

## Tests

| TS source | Rust location | Status | Notes |
|---|---|---|---|
| `tests/survey.test.ts` | `src/survey.rs` `#[cfg(test)] mod tests` | ported+tested | Every `it(...)` case ported 1:1, plus added: quadrant-boundary-crossing cases, a zero-length-course signed-zero `atan2` case, a degenerate (<3-vertex) `interior_angles` case, and an empty-traverse `adjust_traverse` case. |
| `tests/plss.test.ts` | `src/plss.rs` `#[cfg(test)] mod tests` | ported+tested | Every `it(...)` case ported 1:1, plus added: explicit section-0/section-37 out-of-range cases (both via `section_col_row` returning `None` and the new `validate_section` `Result`), and validated-`TownshipRange` rejection cases. |

Additional `#[test]` coverage beyond the two `.test.ts` files exists in
every other module (`bearing.rs`, `curve.rs`, `monument.rs`, `controls.rs`,
`description_keys.rs`, `points.rs`, `transparent_commands.rs`,
`advanced_linework.rs`, `fmt_utils.rs`, `lib.rs`, and all four ported
helpers) — the TS source has no corresponding `.test.ts` files for those
modules, so this crate adds first-party coverage for all of them.

**Total: 97 `#[test]` functions, all passing.** `cargo fmt -p thoth-survey
-- --check` and `cargo clippy -p thoth-survey --all-targets -- -D warnings`
are both clean.
