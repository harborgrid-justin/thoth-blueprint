# Gaps against `thoth-spatial`

None found. Every primitive this crate needed from the shared spatial
foundation — `Point`, `Polygon`, `Bounds`, `Unit`, `SpatialContext`,
`AreaUnit`, and the pure geometry ops (`add`, `subtract`, `scale`,
`normalize`, `distance`, `bounds_center`, …) — was already present in
`crates/thoth-spatial` and used as-is.

# Gaps against `thoth-planning`/`thoth-survey`/`thoth-civil`

## Original migration pass (superseded below where noted)

`thoth-drawing` originally depended only on `thoth-spatial` (then gained
`thoth-civil` for `viewshed` in the gap-analysis round). A meaningful slice
of `packages/domain/src/drawing/**` — the parts that compose a full sheet
from a live site model — reaches into types owned by `thoth-planning`
(`Site`, `BuildingModel`, `RegionPlugin`), `thoth-civil` (`ResolvedAlignment`,
`CrossSection`, terrain sampling), and `thoth-survey` (`CoordinateBasis`,
survey reports, PLSS section framing). Those were handled two ways,
documented function-by-function in `STATUS.md`:

1. **Small, plain-data shapes duplicated locally**, with a rustdoc note
   pointing at the TS type they mirror: `dimension::CoordinateBasis`,
   `qto::CrossSection`/`CrossSectionPoint`, `parts::registry::WallType`, and
   `labeling`'s private `format_station`. **Still true** — these are small
   enough, and self-contained enough, that they were left as-is rather than
   swapped for a cross-crate import in this pass; nothing about them was
   blocking anything else, so touching them wasn't worth the churn. A future
   pass could delete them in favor of the real types now that the
   dependency exists.
2. **Functions that fundamentally needed the live `Site`/`BuildingModel`
   graph** were left not-yet-ported. **This round closed most of these** —
   see below for exactly which, and exactly what's still blocked and why.

## This round: `thoth-planning`/`thoth-survey` added as dependencies

Per the task's mandated dependency order
(`thoth-spatial -> thoth-civil -> thoth-survey -> thoth-planning ->
thoth-drawing`), this crate added `thoth-planning` and `thoth-survey` to
`Cargo.toml`. Before writing any code against them, their real public APIs
were read directly (`thoth-planning/src/elements.rs`'s `Site`/`PlanElement`/
element hierarchy, `thoth-planning/src/regions.rs`'s `RegionPlugin`,
`thoth-survey/src/{survey,bearing,plss,monument,curve}.rs`) rather than
guessed from the TS originals — this surfaced two important facts the task
brief didn't anticipate, both worth calling out explicitly:

1. **`thoth_planning::Site` already carries real `monuments: Option<Vec<
   thoth_survey::monument::SurveyMonument>>` and `plss: Option<PlssFrame>`
   fields** as of this round (added by the concurrent agent working on
   `thoth-planning` itself, which also gained `thoth-survey` as a
   dependency). This is *better* than the task brief's framing — several
   functions this crate's own `STATUS.md`/module rustdocs previously
   expected to need `site.monuments`/`site.plss` as adapted parameters
   (following the "take exactly the missing field" pattern) instead read
   them **directly off `Site`**, with no adaptation needed:
   `builders::site_bounds`, `builders::draw_framework`,
   `builders::draw_site_plan`, `default_set::ensure_drawing_set`'s
   survey-control test.
2. **`thoth_planning::Site` still has no `land_lot` field** (the Georgia
   Land Lot System frame — `site.landLot` in TS) even though it now has a
   real `plss` field, and **no `alignments`/`buildingModels`/`drawingSets`/
   `annotations` fields either.** These four are genuine, still-open gaps in
   `thoth-planning`'s own `Site` port (see that crate's `elements.rs` module
   rustdoc, which explicitly scopes `Site` down to the fields its own
   rules/metrics/subdivision engine and erosion audit read) — not a
   `thoth-drawing` problem, but this crate's functions that need them adapt
   around it with an explicit parameter (`builders::SitePlanContext`'s
   `land_lot_nw_corner`/`alignments`, `default_set::ensure_drawing_set`'s
   `has_land_lot`/`has_building_model`, `builders::build_index_sheet`'s
   `match_lines`, `platset::collect_site_curves`'s `alignments`), following
   the same "take exactly the missing fields" pattern `builders.rs` already
   used pre-round for `Site`/`RegionPlugin` fields this crate never carried.

**Closed this round** (see `STATUS.md` for full per-function detail):

- `defaultSet::ensureDrawingSet` -> `default_set::ensure_drawing_set` (new
  file `src/default_set.rs`).
- `collada::siteToMeshes` -> `collada::site_to_meshes`, plus a local
  `site_extent` helper (the `Site`-walking half of the TS `siteExtent` that
  `thoth-civil::terrain_model`'s own module rustdoc explicitly leaves to a
  caller with `thoth-planning` in scope — see that module's doc comment for
  why `thoth-civil` itself stops at `extent_of_points`/a plain point list).
- `platset::collectSiteCurves` -> `platset::collect_site_curves`.
- `builders::siteBounds`/`drawFramework`/`drawSitePlan`/`buildIndexSheet` ->
  `builders::site_bounds`/`draw_framework`/`draw_site_plan`/
  `build_index_sheet`, plus a new local `element_color` (and its
  `MATERIAL_HATCH`-key helpers) mirroring `thoth-planning`'s **own**
  not-yet-ported `planning/elementMeta.ts` — see the next section for why
  this one small table is duplicated rather than imported.

## Still not-yet-ported, and why (dependency-order vs. sibling-crate gap)

**Genuinely blocked on `thoth-planning` not yet having a `BuildingModel`
type** (confirmed by reading `thoth-planning/STATUS.md` directly, which
lists `types/building.ts`'s `Level`/`WallType`/`Wall`/`Door`/`Window`/`Room`/
`BuildingModel` as `not-yet-ported` there — this is not a dependency-order
problem this round's `Cargo.toml` change can fix, since the type simply
doesn't exist yet in the crate this one now depends on):

- `schedule::{doorSchedule,windowSchedule,roomSchedule,finishSchedule}`.
- `builders::buildingBounds`, `builders::drawFloorPlan`,
  `builders::schedulesFor` (its curve-schedule half is achievable today via
  `collect_site_curves` + `schedule::curve_schedule`, but the function as a
  whole exists primarily to assemble the building-model schedules, so it's
  left undone rather than half-ported), `builders::buildBuildingViews`.
- The top-level composer `builders::buildSheetScene`/
  `builders::buildSheetPrimitives` — it dispatches to the building-model
  builders above for architectural/elevation/section sheet types; every
  *other* building block it would need (`draw_site_plan`, `build_index_sheet`,
  `draw_dimensions`, `draw_grid_bubbles`, `draw_marks`, `viewport_title`,
  `build_frame`, `build_title_block`, `build_revision_block`,
  `draw_schedule_table`) is now ported and ready for whoever picks this up
  once `BuildingModel` lands.

**`thoth_planning::Site` missing the Georgia Land Lot System frame /
`alignments`/`annotations` fields** (see above) — handled via explicit
parameters (`SitePlanContext`, `has_land_lot`, `match_lines`), not left
not-yet-ported, since the actual algorithms don't need the field to *be on
Site specifically*, only to be supplied somehow.

**`elementColor`'s presentation-metadata table duplicated locally**
(`builders::element_fill_color`/`element_kind_hatch_key`/
`land_use_hatch_key`) rather than imported: `thoth-planning`'s own
`planning/elementMeta.ts` is listed `not-yet-ported` in *that crate's own*
`STATUS.md` (`orderedVisibleElements`/`elementMeta`/`elementColor` all have
no Rust counterpart there). This is the same "small, plain-data shape
duplicated locally, unify later" pattern from the original migration pass —
once `thoth-planning` ports `elementMeta.ts`, delete this local mirror and
call the real `element_color` instead. `thoth_planning::land_use::
land_use_color` (the land-use-category half of the TS `elementColor`) *is*
already ported, and is used directly rather than duplicated.

**Out of this round's assigned scope, but not actually blocked**:
`planproduction::generateViewFrames` needs `thoth-civil::ResolvedAlignment`/
`pointAtStation`, both of which have been available since last round's
`viewshed` dependency addition. This function wasn't named in this round's
task brief, so it was left untouched rather than ported opportunistically —
a clean pickup for a future pass.

Nothing in this round required editing `thoth-spatial`, `thoth-civil`, or
`thoth-survey`, and no dependency beyond `thoth-planning`/`thoth-survey` was
added or needed.
