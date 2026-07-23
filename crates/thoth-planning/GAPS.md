# Gaps against `thoth-spatial` and sibling crates

This crate must not edit `crates/thoth-spatial` (frozen) or any sibling crate.
Where the TS source this crate ports depends on functionality that properly
belongs in one of those crates but isn't there (or isn't wired as a
dependency), this file documents exactly what's missing and how this crate
worked around it locally. None of these are permanent design decisions — they
are what a later integration pass should reconcile once the sibling crates
grow the missing pieces.

## 1. Arc-aware boundary area/perimeter (`spatial/curve.ts`)

**Missing from `thoth-spatial`:** `packages/domain/src/spatial/curve.ts` —
`bulgeToArc`, `arcAreaTerm`, `boundaryEdges`, `boundaryArea`,
`boundaryPerimeter`, `densifyArc`, `densifyBoundary` — the DXF/LandXML
"bulge" circular-arc geometry that lets a boundary ring mix straight and
curved edges. `thoth-spatial`'s `geometry.rs` only has straight-edge
`area`/`perimeter`; `types.rs` carries the `EdgeArcs` leaf type but no math
over it.

**Why it matters here:** `metrics.ts` and `renovation.ts` both compute areas
via `boundaryArea(el.boundary, el.arcs)`, not the plain shoelace `area` — a
parcel or land-use area with a curved frontage would be measured wrong
without it.

**Workaround:** `crates/thoth-planning/src/curve.rs` reimplements the
`bulge_to_arc` / `boundary_area` / `boundary_perimeter` subset those two
callers need, scoped to this crate. `densifyArc`/`densifyBoundary`
(tessellation for rendering) are not ported — they're a display concern, out
of this crate's rules/metrics mandate. **Recommendation:** hoist
`curve.rs` up into `thoth-spatial` verbatim in a later pass; it has no
dependency beyond `thoth_spatial::geometry` primitives and conceptually
belongs there, matching the TS module boundary.

## 2. PLSS `sectionFrame` (`survey/plss.ts`)

**Missing:** `packages/domain/src/survey/plss.ts`'s `sectionFrame` and
`SectionFrame` type belong to `thoth-survey`, which isn't a dependency of
this crate (and doesn't exist yet as a populated crate).

**Why it matters here:** `landlot.ts`'s `landLotFrame` — the Georgia Land Lot
System's NW-corner/side-length framing — calls it directly.

**Workaround:** `crates/thoth-planning/src/landlot.rs` has a private
`section_frame` copy (it's a pure function of a point + side length, no
further dependencies). **Recommendation:** once `thoth-survey` ports
`plss.ts`, delete the local copy and depend on the shared one.

## 3. Civil/survey types the erosion audit and `Site` need

**Missing:** `ControlLine`/`CivilSymbol` (`packages/domain/src/survey/controls.ts`)
and `InfrastructureNetwork` (`packages/domain/src/civil/network.ts`) belong to
`thoth-survey`/`thoth-civil`, neither of which is a dependency here.

**Why it matters here:** `erosion.ts`'s `auditErosionCompliance` reads
`site.controlLines`, `site.civilSymbols`, and `site.networks` directly, and
`Site` itself carries those fields.

**Workaround:** `crates/thoth-planning/src/civil_stub.rs` defines minimal
local stand-ins (`ControlLine`, `CivilSymbol`, `InfrastructureNetwork`,
`NetworkNode`, `NetworkEdge`) carrying only the fields the erosion audit
reads. They're deliberately permissive — a `properties: BTreeMap<String,
Value>` bag for ad hoc numeric/boolean fields (`gradient`, `slopeLength`,
`reinforced`, `drainageArea`, …) — because the TS originals access those same
fields through untyped `(x as any).field` casts; the real `ControlLine`/
`CivilSymbol` interfaces don't declare them either. This is a faithful port
of that looseness, not an invented abstraction. **Recommendation:** once
`thoth-civil`/`thoth-survey` port their real typed versions, retire
`civil_stub.rs` and change `Site`'s three fields to reference them (a
dependency + type-swap, no logic change — `audit_erosion_compliance` reads
the same field names either way).

## 4. `Site`'s remaining cross-crate fields

**Missing:** the TS `Site` interface also carries `networks`, `alignments`,
`monuments`, `plss`, `drawingSets`, `sheetViewports`, `dimensions`,
`cadLayers`, `buildingModels`, and `annotations` — typed by `thoth-civil`,
`thoth-survey`, and `thoth-drawing`.

**Why it matters here:** none of the rules/metrics/subdivision/compliance
logic this crate owns reads those fields (they're consumed by sheet
production and interop, out of this crate's mandate), so they're simply
omitted from the `Site` struct in `elements.rs` rather than stubbed. `alignments`
and `monuments` are omitted even though `regions.test.ts`'s "consolidated
curve table" case exercises `alignments` — that test wasn't ported (see
`STATUS.md`) because `collectSiteCurves` lives in `thoth-drawing`.
**Recommendation:** add these fields to `Site` once the owning crates exist
and are wired as dependencies; no other part of this crate needs to change.

## 5. `MonumentType` / `SheetSizeId` / `Orientation` (`regions.ts`)

**Missing:** `packages/domain/src/survey/types/monument.ts`'s `MonumentType`
and `packages/domain/src/drawing/types/sheetsize.ts`'s `SheetSizeId`/
`Orientation` belong to `thoth-survey`/`thoth-drawing`.

**Workaround:** `regions.rs` defines local `MonumentType` and `Orientation`
enums with the same variants, and keeps `SheetSizeId` as a plain `String`
(the sheet-size catalog — ARCH D, ANSI, ISO A0–A4, … — is `thoth-drawing`'s
to own, not worth re-deriving here for one string field). **Recommendation:**
swap in the shared types once available; the three registered region
plug-ins (`us-plss-default`, `us-ga-newton`, `us-va-prince-william`) only use
the variants already mirrored here, so no data changes.

## 6. Ad hoc element fields the erosion audit's TS original reads via `as any`

Several TS erosion-audit checks read fields that don't exist on **any**
typed TS interface (`(g as any).slope`, `(d as any).protected`) — the TS
source itself only ever sees the untyped fallback default because nothing in
the codebase sets those fields on a real `GradeRegion`/element literal either.
This port's `GradeRegion` (and every other spatial element) therefore has no
equivalent field, and the corresponding checks in `erosion.rs` are commented
to note they always evaluate against the TS fallback constant (e.g. MS-7's
slope always reads as `0.1`, REQ-ESC-005's ditch slope always reads as
`0.08`) — this is not a shortcut this port introduced; it is where the TS
source already stood.
