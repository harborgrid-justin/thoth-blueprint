# Competitive gap-analysis status — Theme 5 (drawing production & specialty analysis)

This tracks the 10 items assigned to this crate in
`docs/COMPETITIVE_GAP_ANALYSIS.md`'s Theme 5 ("Drawing production &
specialty analysis"). It is a separate document from `STATUS.md`, which
covers the prior TS→Rust migration pass — everything below is **new
capability**, not a port of an existing TS module.

Legend: **implemented+tested** (full behavior, first-party unit tests
including at least one closed-form/known-reference-value check where one
exists) · **implemented+partial-tests** (behavior implemented, tests cover
the common/error paths but not every edge case) · **not-yet-implemented**.

| # | Item | Module | Status | Notes |
|---|---|---|---|---|
| 51 | Automated construction-staking sheet generation | `src/staking.rs` | **implemented+tested** | `StakingPoint` is a local, self-contained type (station/offset/cut-fill/description/northing/easting) — see the module rustdoc for why, and the "pending integration" note below. Produces a `ScheduleTable` stake-out table and plotted plan-view `SheetPrimitive`s (marker + station/offset + cut/fill label), both validating every point's numeric fields are finite first. |
| 52 | Automated submittal-package / plan-set index generation | `src/submittal.rs` | **implemented+tested** | Adds no new sheet-ordering logic: composes existing `sheet::sort_sheets`/`format_sheet_number`/`discipline_name` with the new `stamp` module for coverage flags, and renders through `schedule::ScheduleTable`. Reports sheet number, title, discipline, current revision (delta/date/description), and stamp coverage (optional). |
| 53 | Professional-stamp/seal metadata workflow | `src/stamp.rs` | **implemented+tested** | Pure data model + validation (no cryptographic signing): `ProfessionalStamp` (signer, license #, discipline, date, optional credential/jurisdiction) and `StampAssignment` (sheet -> stamp). `validate_submittal_stamps` checks, in canonical NCS order, that every sheet has an assignment, every assigned stamp's own fields are well-formed, and the stamp's discipline matches the sheet's. |
| 54 | Bond-estimate generator | `src/bond.rs` | **implemented+tested** | Direct extension of `qto.rs`, as directed: sums a `ScheduleTable`'s quantities against a `qto::PayItem` unit-cost list into a `BondEstimate` (line items, subtotal, contingency, total surety amount). Reuses `qto::evaluate_pay_item_cost` verbatim for every line's pricing (including an optional per-row custom cost formula) rather than writing a second cost-evaluation engine — see the module rustdoc for how the length/area/count variable dispatch is reused without duplicating it. |
| 55 | Photometric/lighting point-by-point illuminance-grid calculation | `src/photometric.rs` | **implemented+tested** | Standard IES point-by-point method: inverse-square law + Lambert's cosine law, `E = I*cos(theta)/d^2`. Tested against two closed-form reference values (directly-below-source, and a 45-degree offset) computed independently of the implementation. Documented simplification: isotropic point source (no photometric distribution/IES-web angular variation), flat unobstructed calculation plane. |
| 56 | Pavement-marking and signage plan symbol placement | `src/signage.rs` | **implemented+tested** | Rule-based (not an optimization): broken-line (MUTCD 10 ft/30 ft standard) and solid-line pavement markings, plus STOP (R1-1) and speed-limit-repeater (R2-1) sign placement at configurable station intervals, offset to the right of travel per US convention. Station/heading interpolation (`point_at_station`) works over a plain polyline centerline, so it needs no `thoth-civil` alignment dependency. |
| 57 | Sun/shadow study | `src/sun.rs` | **implemented+tested** | NOAA "General Solar Position Calculations" formulas (a published low-order truncation of Meeus's solar-position series) for topocentric elevation/azimuth, then a flat-ground shadow projection (`shadow_length = height / tan(elevation)`, displaced along the anti-solar azimuth). Own `SolarError` type, per the task's explicit invitation to give a genuinely distinct concern its own error type. Tested against the independently verifiable summer/winter-solstice declination (~+-23.44 deg) and an exact closed-form shadow-length case; see the module rustdoc for the full list of documented simplifications (no refraction, no Delta-T, no topocentric parallax, flat-extrusion shadow only). |
| 58 | Viewshed analysis | `src/viewshed.rs` | **implemented+tested** | Depends directly on `thoth-civil`'s `ElevationGrid` (added to `Cargo.toml`, via the workspace dependency alias already declared in the root `Cargo.toml` — no root-manifest edit needed) rather than duplicating a local grid type, since `thoth-civil` is complete/stable and a full validated grid type isn't the kind of "small, plain-data shape" this crate otherwise mirrors locally. Flat-earth line-of-sight sampling (no earth-curvature/refraction correction — documented). Tested on a flat grid (fully visible) and a grid with a blocking ridge (near cell visible, far cell occluded). |
| 59 | Simplified traffic-noise contour prediction | `src/noise.rs` | **implemented+tested** | FHWA-TNM-style reference-energy-mean-emission-level (REMEL) approach: per-vehicle-class reference level + speed correction + volume energy-scaling, combined across streams by logarithmic (energy) summation, attenuated with "hard site" line-source spreading (3 dB/doubling). `noise_contour_distance` solves the same relationship in closed form for a threshold dBA. The module rustdoc enumerates, explicitly, everything the real FHWA TNM software models that this does not (ground effects/barriers, per-class speed regressions, pavement/grade adjustments, non-free-flow traffic). Reference emission levels are documented as representative approximations, not the certified TNM 2.5 tables. Tested against the closed-form 3 dB-per-doubling relationships (both distance and volume) and a contour/level round-trip. |
| 60 | Plan-revision redline diff | `src/redline.rs` | **implemented+tested** | Structured geometry/attribute diff (added/removed/moved/resized/other-geometry-change/attribute-change) over a local, generic `DiffableElement` shape (id + kind label + vertex list + string attribute map), since this crate doesn't depend on `thoth-planning`'s `PlanElement` hierarchy. Classifies a same-vertex-count uniform translation as `Moved`, an area change beyond tolerance as `Resized`, anything else geometric as `GeometryChanged`, and reports attribute changes independently (an element can carry both a `Moved` and one or more `AttributeChanged` entries). Not a pixel/image diff. |

## `StakingPoint`'s pending integration with `thoth-interop`

Per the task's explicit instruction, item 51's `StakingPoint` type in
`src/staking.rs` is local and self-contained
(`{ station, offset, cut_fill, description, northing, easting }`) rather than
imported from `thoth-interop`, which is developing the point-list
*computation* in parallel and whose output type is not yet visible to this
crate. Once both crates are stable, `thoth-drawing` should take a dependency
on `thoth-interop`'s equivalent type and this local mirror should be deleted
— exactly the same "duplicate now, unify later" pattern already documented
in `GAPS.md` for `qto::CrossSection`/`dimension::CoordinateBasis`.

## New `DrawingError` variants

`src/error.rs` gained one block of new variants (grouped under a
"gap-analysis Theme 5 additions" comment, all additive — no existing variant
changed) covering: staking-point validation, stamp validation/coverage, bond
estimate pay-item/quantity/contingency errors, photometric/viewshed grid
dimension and physical-input errors, signage centerline/parameter errors,
and traffic-noise input errors. Solar-position/shadow computation (item 57)
gets its own `SolarError` type in `src/sun.rs` instead, per the task's note
that a genuinely distinct concern may warrant one.

## Dependency change

`Cargo.toml` gained one new dependency, `thoth-civil` (for `viewshed.rs`),
via the workspace dependency alias that the root `Cargo.toml` already
declares — no change to the root workspace manifest was needed. No other
crate boundary in the original task instructions was touched.

## Test count

67 new tests across the 10 modules above (207 total in the crate, up from
the 140 pre-existing ones — all 140 still pass unmodified). `cargo fmt -p
thoth-drawing` and `cargo clippy -p thoth-drawing --all-targets -- -D
warnings` are both clean.
