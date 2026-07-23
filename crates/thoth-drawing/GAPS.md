# Gaps against `thoth-spatial`

None found. Every primitive this crate needed from the shared spatial
foundation — `Point`, `Polygon`, `Bounds`, `Unit`, `SpatialContext`,
`AreaUnit`, and the pure geometry ops (`add`, `subtract`, `scale`,
`normalize`, `distance`, `bounds_center`, …) — was already present in
`crates/thoth-spatial` and used as-is.

# Gaps against other crates (not `thoth-spatial`)

`thoth-drawing`'s `Cargo.toml` depends only on `thoth-spatial`, per the task
boundary. A meaningful slice of `packages/domain/src/drawing/**` — the parts
that compose a full sheet from a live site model — reach into types owned by
`thoth-planning` (`Site`, `BuildingModel`, `RegionPlugin`), `thoth-civil`
(`ResolvedAlignment`, `CrossSection`, terrain sampling), and `thoth-survey`
(`CoordinateBasis`, survey reports, PLSS section framing). Those are not
"missing from `thoth-spatial`" — they're a different crate's domain
entirely — so per the task instructions they're handled two ways, both
documented function-by-function in `STATUS.md`:

1. **Small, plain-data shapes are duplicated locally** with a rustdoc note
   pointing at the TS type they mirror, so the actual algorithm that uses
   them can still be ported and tested now: `dimension::CoordinateBasis`,
   `qto::CrossSection`/`CrossSectionPoint`, `parts::registry::WallType`,
   and `labeling`'s private `format_station`. These should be deleted in
   favor of a real cross-crate dependency once this crate is wired up to
   `thoth-planning`/`thoth-civil`/`thoth-survey` in the integration pass.
2. **Functions that fundamentally need the live `Site`/`BuildingModel`
   graph** (element boundaries, building walls/rooms/doors, alignments,
   terrain, monuments) are left **not-yet-ported**, with the exact TS
   function name and the types it's missing named in the owning module's
   rustdoc: `defaultSet::ensureDrawingSet`, `platset::collectSiteCurves`,
   `planproduction::generateViewFrames`, `collada::siteToMeshes`,
   `schedule::{doorSchedule,windowSchedule,roomSchedule,finishSchedule}`,
   and most of `builders.ts`'s content builders
   (`drawSitePlan`/`drawFloorPlan`/`buildSheetScene`/etc.) — see `STATUS.md`
   for the full table.

Nothing here required editing `thoth-spatial`, and no workaround was needed
beyond the two patterns above.
