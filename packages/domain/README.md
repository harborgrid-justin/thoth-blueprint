# @thoth/domain

The **framework-agnostic planning domain model** for Thoth Blueprint — the shared
language of the built environment used by the client (`apps/`), the backend
(`services/`), and tooling.

> **Status: scaffold.** This package currently defines the intended shape of the
> model with documented placeholder types. It is the [roadmap](../../docs/ROADMAP.md)'s
> Phase 1 and the gating dependency for most other work. Fill it in first.

## Hard boundaries

This package must stay **pure**:

- ❌ No React / no DOM.
- ❌ No server framework.
- ❌ No database driver or storage.
- ✅ Pure TypeScript domain types and rules that run anywhere (client, service, test).

Presentation belongs in `apps/`, transport/storage in `services/`.

## What lives here

- **Spatial foundation** — coordinate reference systems, units, scale, geometry,
  layers.
- **Planning primitives** — `Site`, `Parcel`, `Lot`, `Zone`, `LandUse`,
  `RightOfWay`, `Setback`, `ZoningEnvelope`, `InfrastructureNetwork`.
- **Rules & metrics** — subdivision, setback/envelope computation, coverage,
  density, land-use allocation, compliance checks.

See [`docs/GLOSSARY.md`](../../docs/GLOSSARY.md) for definitions; types here mirror
that vocabulary exactly.

## Invariants

1. Every geometry carries a CRS, units, and scale — no unitless shapes.
2. Rules are pure functions with tests.
3. Named, documented tolerance constants — no magic numbers in geometric compares.

## Reference

The archived app (`../../artifact/src/lib`) is a useful pattern reference for
import/export and data modeling, but **do not import from it** — re-implement
cloud-first here.
