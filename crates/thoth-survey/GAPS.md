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

> **Update (cross-crate integration pass):** this crate now depends on
> `thoth-civil` (added to `Cargo.toml`). Per this migration round's fixed,
> non-cyclic dependency order —
>
> ```text
> thoth-spatial → thoth-civil → thoth-survey → thoth-planning → thoth-drawing
> ```
>
> — `thoth-civil` sits *earlier* than `thoth-survey` in the chain, so
> depending on it is safe. `thoth-planning` and `thoth-drawing` sit *later*
> and are themselves being extended this same round to depend on
> `thoth-survey` (for `Site`'s PLSS/monument fields, and for survey-derived
> sheet content, respectively) — so `thoth-survey` depending back on either
> would create a cycle and break the whole workspace's build. This unlocked
> 7 of the 10 previously-blocked helpers; the remaining 3 are described
> below, now with the *specific* reason each one stays blocked.

Originally, all fourteen `survey/helpers/*.ts` files needed either
self-contained survey/spatial math (4 files, ported from the start — see
`STATUS.md`) or a real dependency on the `civil/*` domain (`Assembly`,
`ResolvedAlignment`, `GradingPad`, `PipeDesignRules`, `VerticalProfile`,
`corridor`/`profile`/`superElevation` functions — 7 files, unlocked this
pass), the full planning element hierarchy (`spatial/types::{Site, Parcel,
Lot, Building, Easement, RightOfWay, PlanNote}`, plus
`spatial/primitives::isSpatialElement` — 2 files), or `drawing/planproduction`
(1 file, alongside a `thoth-civil` need already covered by the new
dependency). The three still blocked, and why depending on their crate
would be circular *this round*:

- `helpers/buildPlatFromScratch.ts` — needs the full planning element
  hierarchy owned by `thoth-planning`.
- `helpers/platSheetHelpers.ts` — needs `spatial/types::Site`, also owned by
  `thoth-planning` (plus `spatial/primitives::isSpatialElement`, itself not
  in frozen `thoth-spatial` either).
- `helpers/planProductionHelpers.ts` — needs `thoth-drawing`'s
  `planproduction` module (its `civil::resolve_alignment` half is now
  satisfied by the new `thoth-civil` dependency).

This is not a missing-capability gap — it is a dependency-ordering
constraint specific to this round's parallel-agent plan, which exists
precisely to keep `thoth-planning`'s and `thoth-drawing`'s own concurrent
work from creating a build-breaking cycle. A future pass willing to
restructure crate boundaries (e.g. extracting `Site`'s PLSS/monument-facing
shape, or the planning element hierarchy's `isSpatialElement`, into
`thoth-spatial` as a shared leaf type) could close all three without
`thoth-survey` ever depending on `thoth-planning`/`thoth-drawing` directly.
See `STATUS.md` for the exact file-by-file status table.

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

## 5b. `corridorHelpers.ts`/`gradingHelpers.ts`'s untyped canvas-element shapes (local stand-in types)

Two of the helpers unlocked this pass touch the same kind of gap as #5
above, on the *planning* side rather than the *civil* side:

- `helpers/corridorHelpers.ts`'s `extrudeCorridor` builds `newElements[]`
  entries shaped like `{ id, kind: "corridor", layerId, name, boundary,
  properties: { code, points3D } }` — a generic spatial/canvas element. The
  full element type (`spatial/types::Element` and friends) belongs to
  `thoth-planning`, not a dependency of this crate. `crate::helpers::corridor::CorridorFeatureElement`
  defines the narrow, exact subset of fields this function actually
  populates, field-named to match the real shape for an easy future swap.
- `helpers/gradingHelpers.ts`'s `saveGradingPadElevation` reads/patches an
  untyped `site.elements[]` entry (only ever touching `id`, `kind`, and a
  `properties` bag — the function is generic over element kind, using
  `kind === "parcel"` as a lookup key rather than any parcel-specific
  field). `crate::helpers::grading::SiteElement` mirrors exactly that
  narrow slice, using `serde_json::Map<String, Value>` for `properties`
  since the TS original treats it as an open bag (`{ ...properties, elevation,
  cutSlope, fillSlope }`), not a fixed shape.

Both are the same pattern as `RowParcel` in #5: a local, honestly-scoped
stand-in for a real cross-crate type, not a redesign of the TS behavior.

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
