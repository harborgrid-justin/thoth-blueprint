# thoth-hydrology — implementation status

Maps each of the 13 items in `docs/COMPETITIVE_GAP_ANALYSIS.md`'s Theme 1
("Stormwater hydrology & hydraulics") to the module/function that implements
it. All formulas cite their source in the implementing module's doc comment;
see those doc comments for full citations, valid ranges, and worked
examples.

| # | Item | Module / key functions | Status |
|---|------|-------------------------|--------|
| 1 | Rational Method peak flow | `rational::{peak_flow, composite_runoff_coefficient, LandCover, ShermanIdf}` | **implemented+tested** |
| 2 | Time of concentration (TR-55 3-segment) | `time_of_concentration::{sheet_flow_time, shallow_concentrated_flow_time, channel_flow_time, time_of_concentration}` | **implemented+tested** |
| 3 | SCS/NRCS TR-55 curve-number runoff + dimensionless unit hydrograph | `curve_number::{UrbanLandUse, runoff_depth, unit_hydrograph}` | **implemented+tested** |
| 4 | TR-20-style hydrograph convolution/routing | `hydrograph::{incremental_excess_rainfall, convolve, design_storm_hydrograph}`, `rainfall::{RainfallDistribution, nrcs_type_ii}` | **implemented+tested** |
| 5 | Detention/retention pond routing (Puls) | `pond_routing::{StageStorageDischarge, route_reservoir}` | **implemented+tested** |
| 6 | Orifice/weir outlet hydraulics | `outlet_hydraulics::{orifice_discharge, rectangular_weir_discharge, contracted_rectangular_weir_discharge, broad_crested_weir_discharge, v_notch_weir_discharge, OutletComponent, rating_curve}` | **implemented+tested** |
| 7 | Culvert hydraulic design (inlet/outlet control) | `culvert::{critical_depth_circular, inlet_control_headwater, outlet_control_headwater, compute_headwater}` | **implemented+tested** |
| 8 | Storm-sewer HGL/EGL profile | `hgl::compute_hgl_profile` (composes over `thoth_civil::pipedesign::PipeNetwork`) | **implemented+tested** |
| 9 | Watershed/catchment delineation (D8) | `watershed::{flow_direction, flow_accumulation, delineate_watershed}` (builds on `thoth_civil::terrain::ElevationGrid`) | **implemented+tested** |
| 10 | Water-quality volume (WQv) / first flush | `water_quality::{volumetric_runoff_coefficient, water_quality_volume}` | **implemented+tested** |
| 11 | LID/BMP sizing (bioretention, permeable pavement, swale) | `lid::{bioretention_surface_area, permeable_pavement_area, swale_water_quality_length}` | **implemented+tested** |
| 12 | Runoff-reduction crediting | `credit::{RunoffReductionCredit, apply_credit_to_composite_cn, apply_credit_to_composite_c}` | **implemented+tested** |
| 13 | FEMA floodplain/floodway overlay + encroachment check | `floodplain::{FloodplainOverlay, check_floodway_encroachment, compensatory_storage_displaced}` | **implemented+partial-tests** |

Items 1-8 (the mandated core rainfall-runoff-to-pipe-hydraulics chain) are
all `implemented+tested` against hand-verified or independently-sourced
reference values (see "Verification" below). Items 9-13 are also
implemented and tested, though several carry the simplifying assumptions
called out per-item below — read them before using this crate for a
regulatory submittal.

## Test count and coverage

- **109 unit tests** (`cargo test -p thoth-hydrology`), all passing.
- **26 doctests**, all passing (every public function with a numeric
  example has a doctest that actually runs the numbers, not just prose).
- `cargo fmt -p thoth-hydrology -- --check`: clean.
- `cargo clippy -p thoth-hydrology --all-targets -- -D warnings`: clean, no
  `unsafe` anywhere in the crate.

## Design decision: HGL/EGL composes over `thoth_civil::pipedesign`, doesn't extend it

Per the assignment's explicit instruction to read `pipedesign.rs` and decide
whether to extend its types or compose a new one: **this crate composes**.
`thoth_civil::pipedesign::PipeNetwork`/`PipeNode`/`PipeSegment` already model
pipe network geometry and `validate_pipe_network`/`PipeCheckViolation`
already validate that geometry (cover, slope, diameter) against design
rules — a purely geometric concern with no notion of a flow rate. HGL/EGL
computation is a genuinely different concern: it needs a **flow rate per
pipe**, which only this hydrology crate can produce (via items 1-4), so it
could never have lived in `thoth_civil` without that crate depending
*back* on hydrology (an inversion the workspace's dependency graph
forbids — `thoth-hydrology` depends on `thoth-civil`, not the reverse).
`hgl::compute_hgl_profile` therefore takes a `&PipeNetwork` plus a
caller-supplied `flows_cfs` map and walks the existing type's own
`nodes`/`pipes` fields — no parallel node/edge representation was
introduced.

## Honest simplifying assumptions, by item

- **Item 2 (time of concentration)**: sheet flow is capped at the TR-55
  100 ft maximum (returns an error above that, not a silently-wrong
  extrapolation); a rejected sheet-flow length longer than that should be
  split into sheet + shallow-concentrated segments by the caller, matching
  TR-55 practice.
- **Item 3 (curve number)**: the CN lookup table
  (`curve_number::UrbanLandUse`) is a representative subset of TR-55 Table
  2-2a (common urban land uses), not the complete table, and does not
  include Table 2-2b's agricultural/pasture CNs (out of scope for a
  site/community planning tool). Composite CN is a simple area-weighted
  average; TR-55 itself recommends switching to separate sub-basin
  hydrographs (rather than one blended CN) when sub-area CNs diverge by
  more than about 5 points — this crate does not enforce that threshold
  automatically.
- **Item 4 (hydrograph convolution)**: implemented for the standard **NRCS
  Type II 24-hour storm distribution only**, not arbitrary user-supplied
  hyetographs (though the underlying `rainfall::RainfallDistribution` type
  and `hydrograph::incremental_excess_rainfall`/`convolve` functions accept
  *any* cumulative-fraction-vs-time distribution, so a Type I/IA/III or
  site-specific distribution can be substituted by the caller — only the
  bundled table is Type II). Assumes a **single, homogeneous sub-basin**
  (one CN, one Tc) per `design_storm_hydrograph` call; a composite
  watershed with multiple sub-basins must be modeled as separate calls
  whose resulting hydrographs the caller adds (or routes through
  `pond_routing`) — no automatic multi-sub-basin assembly is provided.
- **Item 7 (culvert hydraulics)**: **circular concrete pipe only**, with the
  three entrance types HDS-5 Table 9 tabulates for its "Chart 1" (square
  edge w/ headwall, groove end w/ headwall, groove end projecting) — box
  culverts, CMP, pipe-arch, and other shapes/materials use different
  tabulated constants not included here. The transition zone between
  unsubmerged (`Q/A√D ≤ 3.5`) and submerged (`Q/A√D ≥ 4.0`) inlet control is
  **linearly interpolated**, a documented simplification of HDS-5's tangent-
  curve construction. Outlet control uses HDS-5's "partial-full
  approximation" method (valid when the barrel flows full for part of its
  length or headwater ≥ 0.75D), not a full backwater profile.
- **Item 8 (HGL/EGL)**: assumes **full-pipe (pressurized) flow** for every
  pipe (not a partial-flow/normal-depth free-surface trace), a
  **single-outfall, tree-shaped (dendritic) network** (a network with a
  loop has the first-computed path's HGL kept at the reconverging node
  rather than reconciled against the second path), and a single uniform
  junction minor-loss coefficient rather than per-structure-geometry loss
  coefficients.
- **Item 9 (watershed delineation)**: D8 (single-flow-direction) only, no
  D-infinity/multiple-flow-direction option. **No depression filling** — a
  local pit is a legitimate sink, so a noisy/unfilled DEM will fragment the
  drainage network; production pipelines typically fill/breach depressions
  as a preprocessing step, which this module does not do. Flat areas
  resolve as sinks rather than using a flow-across-flats algorithm.
- **Item 11 (LID/BMP sizing)**: bioretention sizing assumes steady
  saturated (Darcy) flow through the media at full design ponding depth for
  the whole drawdown period (the standard hand-calculation simplification,
  not an unsteady infiltration model). Permeable pavement assumes a
  single-layer aggregate reservoir with one effective porosity, not a
  multi-layer bedding/base/subbase system. Swale sizing checks capacity and
  water-quality residence time only, not erosion/permissible-velocity
  limits.
- **Item 12 (runoff-reduction crediting)**: models credit as area
  reclassification (a chunk of impervious area becomes pervious), not a
  direct multiplier on a final CN/peak flow — a design choice for physical
  interpretability, not a limitation, but it does mean a credit is
  expressed in square feet of disconnected impervious area rather than as
  an abstract "percent CN reduction" input.
- **Item 13 (floodplain/floodway)**: a **single BFE surface** per site
  (one `ElevationGrid`), not multiple overlapping flood sources. Floodway
  encroachment is checked as "does any vertex of the proposed footprint
  fall inside the floodway boundary" — a vertex-only point-in-polygon test,
  not a full polygon-polygon intersection, so a footprint edge that crosses
  the floodway boundary without any vertex landing inside it would be
  missed (documented in `floodplain`'s module docs as a first-pass screen,
  not a final regulatory determination). Compensatory-storage volume is
  computed by per-node sampling (each grid node standing in for one
  `cell_size²` tile), not a polygon-clipped cell integral — adequate for
  planning-level screening, not a final submittal quantity.

## Verification approach

Since this is new capability with no TypeScript original to port from, each
module's tests check against:

- **Textbook hand calculations** (Rational Method, TR-55 sheet/shallow/
  channel flow, TR-55 CN runoff depth) — worked by hand/independently in
  Python during development and embedded as `assert_relative_eq!` checks
  and doctests.
- **Directly-sourced published tables**: the NRCS Type II 24-hour rainfall
  distribution (`rainfall::NRCS_TYPE_II_*`) is transcribed from the
  Washington State DOT *Highway Runoff Manual* (M 31-16.04, April 2014)
  Appendix 4C, Table 4C-4, and cross-checked against NEH-630 Chapter 4's
  independently published embedded-duration ratios (e.g. the 6-hr/24-hr
  ratio of 0.707 implies a cumulative fraction of 0.1465 at hour 9,
  matching the table's published 0.147). The HDS-5 inlet-control
  coefficients (`culvert::ConcreteEntranceType::coefficients`) are
  transcribed directly from FHWA HDS-5 Appendix A, Table 9 ("Circular
  Concrete", Chart 1).
- **Self-consistency checks** where a published number wasn't available:
  e.g. `hydrograph`'s convolution is checked for volume conservation
  (incremental excess rainfall pulses sum to exactly the CN method's total
  runoff depth), and `culvert::critical_depth_circular`'s bisection result
  is checked against the Froude-number-one condition it was solved from.
