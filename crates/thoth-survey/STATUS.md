# `thoth-survey` port status

Every file under `packages/domain/src/survey/**`, mapped to its Rust port
location and status. Status values:

- **ported+tested** — full behavioral port, with `#[test]`s covering every
  corresponding TS test case plus additional edge cases.
- **ported+partial-tests** — ported, but a known, documented divergence or
  narrower scope than the TS original (see the note).
- **not-yet-ported** — out of scope for this pass; reason given. See
  `GAPS.md` for the full explanation of *why*.

> **Update (cross-crate integration pass):** this crate now depends on
> `thoth-civil` (added to `Cargo.toml`; safe and non-cyclic per this round's
> dependency order `thoth-spatial → thoth-civil → thoth-survey →
> thoth-planning → thoth-drawing`). That unlocked 7 of the 10 helpers
> previously blocked on `thoth-civil` types. The remaining 3 need
> `thoth-planning`/`thoth-drawing`, both of which sit *later* in the
> dependency chain and are now extended to depend on `thoth-survey` — so
> depending back on either from here would be circular. See `GAPS.md` #3 for
> the full accounting. Test count: 97 → **135** (all passing).

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
| `helpers/alignmentReportHelpers.ts` | `src/helpers/alignment_report.rs` | ported+tested | Needs `civil::alignment::ResolvedAlignment` — unlocked this pass by adding `thoth-civil`. |
| `helpers/assemblyBuilderHelpers.ts` | `src/helpers/assembly_builder.rs` | ported+tested | Needs `civil::assembly::{Assembly, Subassembly}` — unlocked this pass. |
| `helpers/buildPlatFromScratch.ts` | — | not-yet-ported | Needs the full planning element hierarchy (`spatial/types::{Site, Parcel, Lot, Building, Easement, RightOfWay, PlanNote, Layer}`), owned by `thoth-planning`. `thoth-planning` sits *after* `thoth-survey` in this round's dependency chain (`thoth-civil → thoth-survey → thoth-planning → thoth-drawing`) and is itself being extended to depend on `thoth-survey` this round, so `thoth-survey` depending back on it would be circular. See `GAPS.md` #3. |
| `helpers/corridorHelpers.ts` | `src/helpers/corridor.rs` | ported+tested | Needs `civil::assembly::Assembly` + `civil::corridor::{build_corridor_sections, extract_corridor_feature_lines}` — unlocked this pass. The TS `newElements[]` canvas-element shape is ported as a local `CorridorFeatureElement` stand-in (the real planning element type isn't a dependency; see `GAPS.md` #5). |
| `helpers/gradingHelpers.ts` | `src/helpers/grading.rs` | ported+tested | Needs `civil::grading::{GradingPad, solve_balanced_elevation}` — unlocked this pass. `saveGradingPadElevation`'s untyped `site.elements[]` patch target is ported as a local `SiteElement` stand-in (id/kind/properties bag); see `GAPS.md` #5. |
| `helpers/pipeHelpers.ts` | `src/helpers/pipe.rs` | ported+tested | Needs `civil::pipedesign::{validate_pipe_network, PipeDesignRules}` — unlocked this pass. |
| `helpers/planProductionHelpers.ts` | — | not-yet-ported | Needs `civil::alignment::resolve_alignment` (available via `thoth-civil`, now a dependency) **and** `drawing::planproduction::{createSheetSetFromFrames, generateViewFrames}` (`thoth-drawing`). `thoth-drawing` sits *after* `thoth-survey` in this round's dependency chain and is itself being extended to depend on `thoth-survey`, so this stays blocked — not by a missing capability, but by this round's dependency ordering. See `GAPS.md` #3. |
| `helpers/platSheetHelpers.ts` | — | not-yet-ported | Needs `spatial/primitives::isSpatialElement` (not in frozen `thoth-spatial`) and `spatial/types::Site` (`thoth-planning`). Same circular-dependency reasoning as `buildPlatFromScratch.ts` above. |
| `helpers/profileHelpers.ts` | `src/helpers/profile.rs` | ported+tested | Needs `civil::profile::{sample_cross_section, VerticalProfile, VerticalPvi}` — unlocked this pass. `updateProfilePvi`'s dynamic `field: keyof VerticalPVI` access is ported as a typed `PviField` enum; see the module doc for the one documented out-of-range-index divergence. |
| `helpers/superelevationHelpers.ts` | `src/helpers/superelevation.rs` | ported+tested | Needs `civil::superelevation::calculate_superelevation_runoff` — unlocked this pass. |

**Helper coverage: 11/14 ported+tested, 3/14 not-yet-ported.** The three
that remain (`buildPlatFromScratch.ts`, `platSheetHelpers.ts`,
`planProductionHelpers.ts`) are blocked on `thoth-planning`'s `Site`
and/or `thoth-drawing`'s `planproduction` module — both of which are later
in this round's dependency chain and are themselves being extended to
depend on `thoth-survey`, so depending back on either here would be a
circular crate dependency. This is a dependency-ordering constraint, not a
missing capability — see `GAPS.md` #3 for the full accounting and what a
future crate-boundary restructuring (or extracting shared types into
`thoth-spatial`) would need to do to close them.

## Tests

| TS source | Rust location | Status | Notes |
|---|---|---|---|
| `tests/survey.test.ts` | `src/survey.rs` `#[cfg(test)] mod tests` | ported+tested | Every `it(...)` case ported 1:1, plus added: quadrant-boundary-crossing cases, a zero-length-course signed-zero `atan2` case, a degenerate (<3-vertex) `interior_angles` case, and an empty-traverse `adjust_traverse` case. |
| `tests/plss.test.ts` | `src/plss.rs` `#[cfg(test)] mod tests` | ported+tested | Every `it(...)` case ported 1:1, plus added: explicit section-0/section-37 out-of-range cases (both via `section_col_row` returning `None` and the new `validate_section` `Result`), and validated-`TownshipRange` rejection cases. |

Additional `#[test]` coverage beyond the two `.test.ts` files exists in
every other module (`bearing.rs`, `curve.rs`, `monument.rs`, `controls.rs`,
`description_keys.rs`, `points.rs`, `transparent_commands.rs`,
`advanced_linework.rs`, `fmt_utils.rs`, `lib.rs`, and all eleven ported
helpers) — the TS source has no corresponding `.test.ts` files for those
modules (nor for any of the seven `helpers/*.ts` files that have no
dedicated `.test.ts`), so this crate adds first-party coverage for all of
them, including edge cases the TS source never exercised in a test (e.g.
out-of-range PVI indices in `helpers/profile.rs`, a `NaN` assembly-width
parameter in `helpers/assembly_builder.rs`, absent-alignment/absent-profile/
absent-terrain short-circuits across `helpers/corridor.rs`,
`helpers/grading.rs`, `helpers/pipe.rs`, and `helpers/superelevation.rs`).

**Total: 135 `#[test]` functions, all passing** (97 pre-existing + 38 new
across the seven newly-ported helpers). `cargo fmt -p thoth-survey --
--check` and `cargo clippy -p thoth-survey --all-targets -- -D warnings`
are both clean. `cargo check --workspace` was also run to confirm this
crate's new `thoth-civil` dependency edge doesn't introduce a cycle; at the
time of this pass it surfaced unrelated, transient failures in
concurrently-edited sibling crates (`thoth-civil`, `thoth-planning`,
`thoth-governance`) that are outside this crate's scope and not caused by
this change — `thoth-survey` and `thoth-civil` each check cleanly in
isolation (`cargo check -p thoth-survey`, `cargo check -p thoth-civil`).
See `docs/RUST_MIGRATION.md`'s "moving target" caveat; re-run
`cargo check --workspace` fresh rather than trusting this snapshot.
