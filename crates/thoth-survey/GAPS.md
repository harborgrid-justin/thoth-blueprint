# Gaps against `thoth-spatial`

`thoth-spatial` is frozen for this migration pass, so nothing below was
worked around by editing it — each gap is either ported locally into this
crate or accepted as a documented, narrow behavioral divergence.

## 1. `spatial/curve.ts` — bulge-encoded circular arcs (ported locally)

`packages/domain/src/spatial/curve.ts` (`Arc`, `BoundaryEdge`,
`bulgeToArc`, `boundaryEdges`, `boundaryArea`, `boundaryPerimeter`,
`densifyArc`, `arcAreaTerm`, `edgeBulge`, `edgeMidpoint`,
`bulgeThroughCursor`, `hasArcs`, `densifyBoundary`, `sampleAlong`) is **not**
re-exported from `thoth-spatial`'s `geometry`/`types` modules — only the
plain-vertex `EdgeArcs` map type and straight-edge geometry ops made it into
the frozen crate.

`thoth-survey` genuinely needs this: `survey.ts`'s `polygonCourses`,
`surveyArea`, `surveyReport`, and the `metesAndBoundsHelpers` all depend on
arc-aware boundary math (a plat's curved courses are load-bearing, not
optional). Per the migration brief, this was ported **locally** rather than
touching `thoth-spatial`:

- Source: `crates/thoth-survey/src/curve.rs`
- Consumers: `crates/thoth-survey/src/survey.rs`,
  `crates/thoth-survey/src/helpers/metes_and_bounds.rs`

The port preserves every semantic from the TS original — the `tan(Δ/4)`
bulge convention, sweep-sign resolution via the mid-arc point, the
`Math.sign`-vs-`f64::signum` zero-handling distinction (see `js_sign` in
`curve.rs`, needed because `f64::signum(0.0) == 1.0` but `Math.sign(0) ==
0`, and the center-side/sweep-direction formulas rely on genuine zero at
`t == 1` / degenerate steps), and all degenerate-input edge cases (zero
bulge, zero-length chord, non-finite bulge).

If/when `thoth-spatial` is unfrozen and gains arc support, `curve.rs` here
should be deleted and replaced with `use thoth_spatial::curve::*;` — no
other file in this crate would need to change beyond that import swap.

## 2. `spatial/spatial.ts`'s raw unit-conversion free functions (trivial, inlined)

`areaToSquareMeters`/`squareMetersTo` are plain 2-line arithmetic helpers in
the TS `spatial.ts` that were not carried into `thoth-spatial::units`
(which instead exposes the higher-level `format_length`/`format_area`).
`survey.rs` reimplements the two arithmetic lines directly (`area_to_square_meters`,
`square_meters_to`) rather than requesting a `thoth-spatial` change for
something this small; `thoth_spatial::AreaUnit::sqm_per_unit()` and
`Unit::meters_per_unit()` — which do exist in the frozen crate — are reused
underneath.

## 3. Cross-crate helper dependencies (not a `thoth-spatial` gap — see `STATUS.md`)

Ten of the fourteen `survey/helpers/*.ts` files depend on the `civil/*`
domain (`Assembly`, `ResolvedAlignment`, `GradingPad`, `PipeDesignRules`,
`VerticalProfile`, `corridor`/`profile`/`superElevation`/`planproduction`
functions), the full planning element hierarchy (`spatial/types::{Site,
Parcel, Lot, Building, Easement, RightOfWay, PlanNote}`, plus
`spatial/primitives::isSpatialElement`), or `drawing/planproduction`. None
of `thoth-civil`, `thoth-planning`, or `thoth-drawing` are dependencies of
`thoth-survey` (by design — those are the concurrently developed sibling
crates). This is not a `thoth-spatial` gap; it is out-of-scope cross-crate
wiring left for a later integration pass. See `STATUS.md` for the exact
file list and status.

## 4. `parts/registry.ts`'s live parts catalog (accepted divergence)

`descriptionKeys.ts`'s `DEFAULT_DESCRIPTION_KEYS` prefers
`globalPartsDb.getDescriptionKeys()` (from `packages/domain/src/parts/registry.ts`)
and only falls back to a hardcoded three-entry list when that catalog is
empty. The parts catalog is a different domain package, not a dependency of
this crate. `crate::description_keys::default_description_keys()` always
returns the hardcoded fallback — exactly the TS behavior whenever no
catalog has been loaded, which is also the only behavior observable without
`packages/domain/src/parts` wired in.

## 5. `advancedLinework.ts`'s `ParcelObject` (local stand-in type)

`createRightOfWayParcel` returns a `civil/types/siteAndParcels.ts::ParcelObject`
in the original. That type (and its `ParcelStyle`/`SiteContainer` siblings)
belongs to the civil/parcel-layout domain, not survey, and isn't a
dependency of this crate. `crate::advanced_linework::RowParcel`/`RowParcelStyle`
define the narrow subset of fields the function actually populates, with a
rustdoc pointer to swap in the real `thoth_civil`/`thoth_planning` type once
cross-crate wiring lands.

## 6. Wildcard matching (`points.ts`'s `PointGroupManager.matchWildcard`)

The TS original builds a `RegExp` from the pattern
(`pattern.replace(/\*/g, ".*").replace(/\?/g, ".")`, case-insensitive) and
tests the full string against it. `crate::points`'s `glob_match_case_insensitive`
reimplements this with the classic two-pointer wildcard-matching algorithm
instead of pulling in a `regex` dependency — exactly equivalent for every
pattern actually used in this codebase (literal characters plus `*`/`?`),
but would diverge from the TS behavior for a pattern containing a genuine
regex metacharacter (e.g. `.` or `+`), which the original would interpret
specially and this port treats literally. No shipped description-key or
point-group pattern relies on that; documented here and at the call site.

## 7. `common/result.ts` (no port — `std::result::Result` supersedes it)

The TS `Result<T, E>`/`ok`/`err`/`SurveyDomainError` wrapper exists because
TypeScript has no native tagged-union result type suitable for this use.
Rust's `std::result::Result<T, E>` plus `crate::error::SurveyError`
(`thiserror`-derived) is the direct, idiomatic replacement — there is
nothing to port beyond that; see `STATUS.md`.
