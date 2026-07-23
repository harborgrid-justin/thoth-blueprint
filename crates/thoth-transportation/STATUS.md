# `thoth-transportation` — implementation status

Transportation/traffic-engineering capability for Thoth Blueprint, closing
Theme 2 (items 14–25) of `docs/COMPETITIVE_GAP_ANALYSIS.md`. This crate is
new; there is no TypeScript original to port, so every module is first-party
Rust tested against AASHTO/MUTCD/ITE textbook worked examples and published
design tables/closed-form results (not just internal self-consistency).

**Verification**: `cargo fmt -p thoth-transportation -- --check` clean,
`cargo clippy -p thoth-transportation --all-targets -- -D warnings` clean,
`cargo test -p thoth-transportation` — **87/87 tests passing**.

## Priority tier (items 14–19, must-complete)

| # | Item | Module / key functions | Status | Notes |
|---|---|---|---|---|
| 14 | AASHTO stopping-sight-distance check (horizontal & vertical) | `sight_distance`: `stopping_sight_distance`, `horizontal_sight_line_offset`, `check_horizontal_sight_distance`, `check_vertical_sight_distance` | **implemented+tested** | SSD formula validated against published Green Book Table 3-1 values (30/60 mph) within rounding tolerance. Horizontal HSO validated against hand-derived chord geometry for both the `S<=L` and `S>L` branches. Vertical check delegates to `vertical_curve_design` for the K/length math (no duplication). |
| 15 | AASHTO crest/sag vertical-curve minimum-length design | `vertical_curve_design`: `crest_curve_min_length`, `sag_curve_min_length` | **implemented+tested** | First-principles SSD-based `L`/`K` computation (not a rounded table lookup), validated against published Green Book Table 3-34/3-36 K-values (50 mph) within a few percent. **Documented nuance**: for grade breaks below the `S<=L`/`S>L` transition, the rigorous geometric formula can legitimately return `0.0` (no curve length needed for sight distance alone) — this differs from AASHTO's widely published `A`-independent K-value table, which applies the `S<=L` formula unconditionally as a practical convention and instead relies on a separate minimum-practical-curve-length rule (commonly `L >= 3V`) for very gentle grade breaks. This crate does not implement that `3V` practical-minimum overlay; see "Known simplifications" below. |
| 16 | Superelevation design-speed policy compliance | `design_speed_policy` (shared AASHTO side-friction table, `minimum_radius`, `required_superelevation`) + `superelevation_policy`: `check_superelevation_policy` | **implemented+tested** | Extends (does not duplicate) `thoth_civil::superelevation`'s runoff/runout computation: consumes its resolved `SuperelevationCurve` and the paired `AlignmentCurve`, checks applied `e` vs. AASHTO-required `e`, vs. policy `e_max`, and radius adequacy. Side-friction table is a widely reproduced `e_max=6%` AASHTO table (see module doc caveat on edition-to-edition variation). |
| 17 | Minimum horizontal-curve-radius policy check | `design_speed_policy`: `minimum_radius` + `horizontal_curve_policy`: `check_minimum_curve_radius` | **implemented+tested** | Uses the physics-based `R_min = V²/(15(e+f))` relationship (not `thoth_civil`'s frozen 6-bucket table), honoring station-keyed design-speed zones. |
| 18 | Intersection turning-radius templates (WB-40/WB-50/SU-30) | `design_vehicle` (AASHTO vehicle chain data, `steady_state_offtracking_radii`) + `turning_template`: `compute_turning_template`, `generate_turning_template_geometry` | **implemented+tested** | Static, steady-state (closed-form) off-tracking template — radius + offset geometry as scoped, deliberately **not** a swept-path simulation (that's item 19). Validated against the exact Pythagorean off-tracking closed form. Vehicle sub-dimensions (wheelbase/overhang breakdowns) are documented as representative/approximate — see "Known simplifications". |
| 19 | Vehicle swept-path analysis (AutoTURN-style) | `swept_path`: `simulate_swept_path` | **implemented+tested** | Discrete tractrix-pursuit simulation over a generalized rigid-link chain (handles both single-unit vehicles and articulated combinations via the same recursive method). **Validated against a published/derivable ground truth**: for a constant-radius circular path, the simulation is checked to converge to the exact closed-form steady-state off-tracking radius (`R_trailing = sqrt(R² − L²)`, chained for multi-link vehicles) — the same relationship AASHTO/FHWA/AutoTURN turning templates use as their steady-state reference case. A convergence test also confirms finer step size (denser path sampling) reduces error, consistent with the documented first-order convergence behavior. The swept envelope polygon is a **stated simplification**: it tracks only the front unit's front corners and the final unit's rear corners at one shared body width, assumes a single consistent turn direction along the whole path, and does not model intermediate-unit corners or per-unit width differences — not a full AutoTURN-equivalent envelope. |

## Secondary tier (items 20–25)

| # | Item | Module / key functions | Status | Notes |
|---|---|---|---|---|
| 20 | ITE trip-generation estimate | `trip_generation`: `estimate_trip_generation` | **implemented+partial-tests** | Average-rate method only (no fitted log-log regression equations); covers 7 representative ITE land-use categories, not the full ITE code list. Rates are representative published averages, not a substitute for a licensed ITE Trip Generation database in a final traffic impact study. |
| 21 | Cul-de-sac / hammerhead turnaround geometry generator | `turnaround`: `generate_turnaround` | **implemented+tested** | Both circular bulb and T-shaped hammerhead geometry generation from a terminus + inbound bearing. Dimensions (radius, stem/top lengths) are caller-supplied, not hardcoded to any jurisdiction's standard — explicitly left to the caller per the module doc, since municipal standards vary widely. |
| 22 | Roundabout geometry design | `roundabout`: `inscribed_circle_diameter_range`, `fastest_path_speed_check` | **implemented+partial-tests** | ICD sizing keyed to approach count and design-vehicle class (NCHRP 672 Exhibit 3-4 order-of-magnitude ranges). **Explicitly simplified fastest-path check**, as flagged in the task mandate: a single circular-arc approximation of the circulating path with a fixed-point speed solve against one absolute speed threshold — not NCHRP 672's full three-arc (entry/circulating/exit) fastest-path construction with inter-arc speed-differential checks. |
| 23 | Pavement structural design | `pavement`: `flexible_pavement_structural_number`, `solve_base_course_thickness`, `rigid_pavement_slab_thickness` | **implemented+tested** | Full AASHTO 1993 flexible (structural number) and rigid (slab thickness) design equations, solved by bisection (both are transcendental in the design unknown). Includes a from-scratch inverse-normal-CDF rational approximation for the reliability deviate `Z_R`. Tested for plausible-range outputs and correct monotonicity in traffic/reliability, not against a specific published nomograph worked example transcribed digit-for-digit. |
| 24 | ADA accessible-route compliance check | `ada_route`: `check_running_slope`, `check_cross_slope`, `check_landing_spacing` | **implemented+tested** | Running slope, cross slope, and ramp rise-before-landing checks against 2010 ADA Standards / PROWAG thresholds. **Does not** check landing *width* against the widest ramp run, handrail/edge-protection presence, or surface texture — scalar slope/spacing checks only. |
| 25 | Traffic-signal warrant analysis | `signal_warrant`: `warrant1_condition_a`, `warrant1_condition_b`, `warrant1_combination` | **implemented+partial-tests; one sub-item explicitly not implemented** | MUTCD Warrant 1 (8-Hour Vehicular Volume) — Condition A, Condition B, and the 80%-factor Combination check — is fully implemented against Table 4C-1/4C-2 thresholds. **MUTCD Warrant 3 (Peak Hour Volume) is intentionally not implemented**: it is a graphical standard (a curve in MUTCD Figure 4C-3), not a numeric table, and this crate does not reproduce a hand-transcribed curve it cannot verify against the primary source. Flagged here rather than silently omitted. |

## Known simplifications (honesty summary)

- **Item 15**: no `L >= 3·design speed` practical-minimum-curve-length overlay; the geometrically exact sight-distance minimum can be `0` for gentle grade breaks, by design (see item 15's row above).
- **Item 16/17**: AASHTO side-friction-factor table is one commonly reproduced `e_max=6%` table (module doc on `design_speed_policy` names the caveat); a jurisdiction with a different adopted `e_max` or Green Book edition should supply its own table before using this beyond planning-level screening.
- **Item 18/19**: AASHTO design-vehicle wheelbase/overhang sub-dimensions (`design_vehicle::DesignVehicle::{su30,wb40,wb50}`) are representative/approximate figures consistent with Green Book Exhibits 2-1/2-2, explicitly caveated in that module's doc comment; the published **minimum turning radii** (24/42/40/45 ft) are the more reliably stable, widely reproduced figures and are the ones the error-boundary checks (`CurveTighterThanVehicleMinimum`) key on.
- **Item 19**: swept envelope is a single-turn-direction, single-body-width simplification (see item 19's row above); this is the one item explicitly flagged in the task mandate as the most numerically delicate, and its core tractrix engine (not just the envelope simplification) is the part validated against a closed-form published result.
- **Item 22**: fastest-path check is a simplified single-arc circulating-speed screen, not NCHRP 672's full multi-arc fastest-path construction (explicitly flagged, matching the task mandate's own example).
- **Item 25**: MUTCD Warrant 3 (Peak Hour) is not implemented at all (not partially — omitted), for the reason stated above.

## Error handling

All fallible computations return `Result<T, TransportationError>` via a single
`thiserror`-defined enum in `error.rs` — design speed outside a tabulated
range, non-positive/negative geometric or traffic inputs, a curve tighter
than the AASHTO/vehicle minimum radius, a swept-path simulation given a path
tighter than the design vehicle can follow, and iterative-solver
non-convergence are all distinct, matchable variants. No `panic!`/`unwrap()`
on caller-supplied input anywhere in non-test code.
