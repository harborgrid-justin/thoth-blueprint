# @thoth/service-collaboration

Real-time collaboration for Thoth Blueprint.

> **Status: scaffold.** Not implemented. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
> and [`docs/ROADMAP.md`](../../docs/ROADMAP.md) (Phase 4).

## Responsibilities

- Real-time multi-user editing of a plan with a conflict-resolution strategy
  (CRDT or OT — to be decided here).
- **Presence** — who is viewing/editing, and where.
- **Review threads** — comments anchored to plan elements, for team review and
  public engagement.

## Boundaries

- Coordinates concurrent edits to domain state; persistence and versioning belong
  to `@thoth/service-projects`, identity/permissions to `@thoth/service-auth`.
