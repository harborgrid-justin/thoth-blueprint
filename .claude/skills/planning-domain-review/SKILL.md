---
name: planning-domain-review
description: >-
  Use when writing or reviewing code that models the built environment in Thoth
  Blueprint — planning primitives, geometry, units, and rules. Enforces the
  platform's domain vocabulary and spatial-correctness invariants so the model
  stays consistent, cloud-first, and framework-agnostic. Trigger before adding
  types/functions to packages/domain, or when reviewing spatial/planning logic
  anywhere in the repo.
---

# Planning domain review

Thoth Blueprint models the built environment. This skill keeps that model correct
and consistent. Apply it when adding or reviewing planning/spatial code.

## Vocabulary (must match `docs/GLOSSARY.md`)

Use these exact terms for types, functions, and UI:

- **Spatial:** Coordinate Reference System (CRS), Units, Scale, Geometry, Layer.
- **Primitives:** `Site`, `Parcel`, `Lot`, `Zone`, `LandUse`, `RightOfWay`,
  `Setback`, `ZoningEnvelope`, `InfrastructureNetwork`.
- **Operations/metrics:** `subdivision`, `coverage`, `density`,
  `landUseAllocation`, `complianceCheck`.
- **Collaboration:** `Project`, `Checkpoint`, `Version`, `ReviewThread`, `Presence`,
  `Audit Trail`.

Do not introduce synonyms ("plot" for parcel, "district" for zone) — pick the
glossary term or propose a glossary update in the same change.

## Invariants to check

1. **Every geometry has a CRS, units, and scale.** No unitless coordinates, no
   implied projection. Reject "just a rectangle" shapes.
2. **Domain stays framework-agnostic.** In `packages/domain`, no React, no server
   framework, no database driver, no DOM. Presentation and persistence live
   elsewhere.
3. **Rules are pure and testable.** Setbacks, coverage, density, subdivision, and
   compliance are pure functions over domain objects, with tests (unit and,
   where sensible, property-based).
4. **Cloud-first, not offline-first.** Don't assume a single local user or
   IndexedDB as the source of truth — that was the archived app's model.
5. **No leakage from `artifact/`.** Reference its patterns, but never import from
   it.
6. **Named tolerances.** Geometric comparisons use named, documented tolerance
   constants — never bare magic numbers.

## Review output

When reviewing, report findings as: the invariant or vocabulary rule violated, the
location, and the concrete fix. When writing, satisfy all invariants up front and
add or update tests for any new rule.
