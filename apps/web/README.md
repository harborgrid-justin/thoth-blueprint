# @thoth/web — planning workspace

The browser client for Thoth Blueprint: a fast, collaborative canvas for **site &
community planning**.

> **Status: scaffold.** Not implemented yet. This README captures intent; see
> [`docs/ROADMAP.md`](../../docs/ROADMAP.md) (Phase 2) for sequencing.

## Scope

- **Canvas** — precise drawing/editing of parcels, lots, zones, and land uses with
  snapping, measurement, and constraints (CAD-grade, web-native).
- **Layers & styling** — manage layer order/visibility; style by land use.
- **Metrics** — live coverage, density, and land-use breakdown, computed from
  [`@thoth/domain`](../../packages/domain).
- **Collaboration & review** — real-time presence and comment threads (via
  `services/collaboration`).

## Boundaries

- Renders and edits `@thoth/domain` objects; **does not** duplicate planning rules
  or geometry math — those come from the domain model.
- **Cloud-first:** projects are server-backed (via `services/`), not IndexedDB.
  This reverses the archived app's offline-first model.

## Building on prior art

The archived app under [`../../artifact/src`](../../artifact/src) is a strong
reference for canvas interaction (React Flow), state orchestration (Zustand), and
shadcn/Radix UI. Reuse the *patterns*, re-implemented cloud-first. Never import
from `artifact/`.
