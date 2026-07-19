# @thoth/service-projects

Project lifecycle & persistence for Thoth Blueprint.

> **Status: scaffold.** Not implemented. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
> and [`docs/ROADMAP.md`](../../docs/ROADMAP.md) (Phase 2).

## Responsibilities

- Create / open / save projects (a project contains a `Site` and its plans).
- Server-side persistence of `@thoth/domain` state.
- **Versioning** and **checkpoints** — named snapshots with restore, carried
  forward from the archived app but now server-side and shareable.
- Audit trail of changes for governance and public review.

## Boundaries

- Stores and versions domain state; it does not compute planning rules (that's
  `@thoth/domain`) and does not own identity (that's `@thoth/service-auth`).
