# Theme 4 gap-closing pass: subdivision-design-automation status

This tracks the 13 items assigned in this round (`docs/COMPETITIVE_GAP_ANALYSIS.md`
Theme 4, items 38-50) against the modules added to `crates/thoth-planning/src/`
in this pass. It is a separate, new tracking document from `STATUS.md` (which
documents the original TS→Rust migration pass) and `GAPS.md` (which documents
cross-crate primitive gaps from that same pass).

**Every pre-existing test still passes.** `cargo test -p thoth-planning`: 119
tests total (58 pre-existing + 61 new), 0 failures. `cargo fmt -p thoth-planning
-- --check` and `cargo clippy -p thoth-planning --all-targets -- -D warnings`
are both clean. No existing file's public API, signature, or behavior was
changed — every addition is either a new module or new `pub` items appended to
an existing file (none were needed; all 13 items landed as new modules).

No new crate dependencies were added. Items 40 and 50 explicitly offered a
"depend on a sibling crate" option; both instead took the self-contained /
caller-supplied alternative the task brief allowed, for reasons documented
below and in each module's doc comment. `Cargo.toml` is unchanged.

## Status table

| # | Capability | Module | Key functions | Status |
|---|---|---|---|---|
| 38 | Automated lot-yield optimization | `lot_yield.rs` | `optimize_lot_yield`, `LotYieldConstraints` | **implemented+tested** (heuristic, see limitations) |
| 39 | Automated road-network layout generator | `road_network.rs` | `generate_road_network` | **implemented+partial-tests** (see limitations — no cul-de-sac generation) |
| 40 | Grading-optimization solver | `grading_optimizer.rs` | `optimize_grading_balance`, `site_earthwork_summary`, `estimate_existing_elevation` | **implemented+tested** (self-contained; does not depend on `thoth-civil::grading` — see below) |
| 41 | Automated building-envelope fit-check | `envelope_fit.rs` | `check_building_envelope_fit`, `polygon_intersection_area` | **implemented+tested** |
| 42 | 3D utility conflict/clash detection | `utility_clash.rs` | `detect_pipe_pipe_clashes`, `detect_pipe_structure_clashes` | **implemented+tested** (straight-segment scope, see limitations) |
| 43 | Automated ROW dedication / easement-polygon generation | `dedication.rs` | `generate_row_dedication`, `generate_easement_polygon`, `buffer_centerline` | **implemented+tested** |
| 44 | Subdivision phasing / build-out sequencing | `phasing.rs` | `plan_phasing` | **implemented+tested** (heuristic, see limitations) |
| 45 | Impact-fee calculation | `impact_fees.rs` | `assess_impact_fees`, `assess_site_impact_fees` | **implemented+tested** |
| 46 | Open-space/park-dedication requirement calculator | `open_space.rs` | `compute_required_open_space`, `check_open_space_dedication` | **implemented+tested** |
| 47 | Tree-preservation/canopy-retention compliance | `canopy.rs` | `audit_canopy_preservation` | **implemented+tested** |
| 48 | Zoning variance/waiver tracking | `variance.rs` | `validate_variance`, `suppress_findings_with_variances` | **implemented+tested** |
| 49 | Geotechnical screening (infinite-slope FS) | `geotech.rs` | `infinite_slope_factor_of_safety`, `slope_stability_class` | **implemented+tested** |
| 50 | Unified certified-plat composer | `plat.rs` | `compose_certified_plat`, `build_curve_table` | **implemented+tested** (document model over a caller-supplied legal description — see below) |

61 new `#[test]` functions across the 13 modules (test counts per module are
visible in each file; every module has at least 4).

## Notes on the "must-complete" priority items

- **41 (envelope fit-check)** composes `rules::buildable_envelope`,
  `Zone::max_far`/`Zone::max_coverage`, and easement overlap in one pass, as
  asked. The one new geometry primitive it needed — a convex-polygon
  intersection (Sutherland-Hodgman clip, cited in the module doc) — didn't
  exist anywhere in the workspace; without it, an easement's *encroachment
  area* (not just yes/no overlap) couldn't be quantified. Exact for convex
  easements (the overwhelming majority of drawn utility/access corridors);
  a non-convex easement still triggers the overlap finding but its area may
  be mis-measured — documented in `polygon_intersection_area`'s doc comment.
- **43 (ROW/easement generation)** adds one new geometry primitive too — a
  mitered polyline buffer (`buffer_centerline`), since nothing in
  `thoth-spatial` or this crate could turn a centerline + width into a
  corridor polygon. Miter length is clamped (documented `MAX_MITER_FACTOR`)
  to avoid spikes on sharp turns; very sharp/switchback centerlines are not
  otherwise validated for self-intersection.
- **45-47 (fees/dedication/canopy)** are pure formula-over-parameterized-schedule
  modules, each citing its structural convention (impact-fee per-DU/per-sq-ft
  structure, "greater-of ratio, floored" dedication structure, percentage-
  removal-with-mitigation-ratio canopy structure) without hardcoding any one
  jurisdiction's numbers, per the brief.
- **49 (geotech)** implements the infinite-slope factor-of-safety equation
  exactly as specified in the task brief (expanded to keep the normal/shear
  stress terms dimensionally correct via an explicit `slip_plane_depth`
  parameter), cited to Duncan, Wright & Brandon, *Soil Strength and Slope
  Stability*, 2nd ed. (Wiley, 2014), §2.4. Test cases include a hand-verified
  dry-slope calculation and a saturated-slope case demonstrating pore
  pressure driving FS below 1.0.

## Notes on the harder items (38-40, 42, 44, 50)

All five were implemented (none left as bare stubs), but each has real,
explicitly documented scope limits:

- **38 (lot yield)**: heuristic bounding-box `rows × columns` grid search,
  not a provable packing optimum. Single-frontage-road-per-row assumption;
  orthogonal grids only; undercounts yield on irregular (non-rectangular)
  parcels (a dedicated test, `undercounts_yield_on_an_irregular_l_shaped_parcel_a_documented_limitation`,
  demonstrates this against an L-shaped parcel). See the module doc for the
  full limitations list.
- **39 (road network)**: generates a real through-street grid sized to a
  target block length and checks it against a block-length standard, but
  **does not generate cul-de-sacs/dead-end stub streets** — the brief's
  "dead-end-length standards" half of this item is only partially addressed
  (the data model and a compliance-check hook exist; the generator itself
  never produces a dead end to check). Also clips to the parcel's bounding
  box, not its true (possibly irregular) boundary. Marked
  **implemented+partial-tests** for this reason — see the module doc's
  "Known limitations" section for the complete list.
- **40 (grading optimizer)**: **took the self-contained option** explicitly
  offered in the brief rather than depending on `thoth-civil::grading`.
  Reasoning: `thoth-civil::grading` models cut/fill over a real triangulated
  terrain surface (the correct tool for a construction-document-grade
  earthwork take-off); this crate has no terrain-surface type at all, only
  `GradeRegion` (a target elevation) and `SpotElevationPoint` (scattered
  survey points) — bridging those into `thoth-civil`'s terrain model would
  be a substantial, separate integration exceeding this item's scope, and
  would still need *this* crate's own flat-pad approximation for regions
  without full terrain coverage. Instead: existing grade is estimated via
  inverse-distance-weighted interpolation over `SpotElevationPoint`
  elements, each `GradeRegion` is treated as a single flat pad, and the
  "optimizer" is a bounded search over one uniform elevation offset applied
  to every pad together, minimizing `|total_cut - total_fill|` — cross-
  checked in tests against the closed-form solution (the objective is
  exactly linear in the offset). This does **not** independently optimize
  each pad's elevation (a true multi-pad balance is a linear/quadratic
  program over every region's elevation jointly, subject to slope-tie-in
  constraints) — a real gap versus a construction-grade grading optimizer,
  stated plainly in the module doc.
- **42 (utility clash)**: took the "minimal local utility-segment-with-depth
  type" option explicitly offered in the brief (`Site.networks`'s
  `InfrastructureNetwork` nodes are 2D-only with no depth, so they can't
  represent a real clash regardless). Pipes are straight segments only (no
  bends, no vertical curves/sag); structures are vertical cylinders. Clash
  detection is a genuine 3D check (horizontal proximity *and* vertical
  overlap must both hold), not a horizontal-only proxy. Scope explicitly
  documented as a screening tool, not a substitute for a full 3D utility
  model.
- **44 (phasing)**: a real greedy sequencing heuristic (nearest-to-
  infrastructure-origin ordering, equal-count phase buckets, adjacency-
  continuity checking with a documented approximate adjacency test — exact
  for grid-subdivided lots sharing vertices, approximate otherwise). Not a
  network-flow/cost-optimized phasing plan.
- **50 (plat composer)**: **took the caller-supplied-description option**
  explicitly offered in the brief rather than depending on `thoth-survey`.
  Reasoning documented in the module doc: a metes-and-bounds description's
  exact wording is a jurisdiction-specific drafting convention that
  `thoth-survey` should own end-to-end, and this module only needed to
  *assemble* a description alongside data this crate already computes
  (`crate::curve`'s bulge-to-arc math for the curve table, `crate::regions`'s
  `MonumentType`/`CertificateSpec` for monuments/certificates) — not
  generate the legal description itself. `legal_description: String` is
  already the right shape if a future pass wants this crate to generate
  rather than accept that text; adding `thoth-survey` as a dependency then
  would need no shape change here.

## Cross-references worth knowing about

- `variance.rs`'s `suppress_findings_with_variances` is designed to run
  *after* `rules::check_compliance` (unchanged) — it doesn't modify the
  existing compliance checker, it reconciles its output against granted
  relief as a separate, explicit step.
- `dedication.rs`'s `generate_row_dedication` produces the same
  `RightOfWay` shape `road_network.rs`'s generator stamps, so a caller can
  run the road-network generator first and re-buffer any one centerline at
  a different width via `dedication.rs` without re-deriving geometry.
- `lot_yield.rs` and `road_network.rs` are both bounding-box/orthogonal-grid
  heuristics; neither one's limitations are hidden behind the other — each
  module doc cross-references the other's companion gap.
