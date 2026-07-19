# @thoth/service-auth

Identity & access for Thoth Blueprint.

> **Status: scaffold.** Not implemented. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
> and [`docs/ROADMAP.md`](../../docs/ROADMAP.md) (Phase 2).

## Responsibilities

- Authentication (sign-in/sign-up, sessions/tokens).
- Organizations and teams that own projects.
- Roles and permissions (view / comment / edit) enforced across services.

## Boundaries

- Owns identity and authorization; other services ask it "who is this and may they
  do X", they don't re-implement access control.
- No planning geometry here — that's `@thoth/domain`.
