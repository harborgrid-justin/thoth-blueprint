# @thoth/service-projects

Project lifecycle & persistence for Thoth Blueprint.

> **Status: scaffold.** Not implemented. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
> and [`docs/ROADMAP.md`](../../docs/ROADMAP.md) (Phase 2).

## Responsibilities

- Create / open / save projects (a project contains a `Site` and its plans).
- Server-side persistence of `@thoth/domain` state.
- **Versioning** and **checkpoints** â€” named snapshots with restore, carried
  forward from the archived app but now server-side and shareable.
- Audit trail of changes for governance and public review.

## Boundaries

- Stores and versions domain state; it does not compute planning rules (that's
  `@thoth/domain`) and does not own identity (that's `@thoth/service-auth`).
- Persists through `@thoth/storage`, never through a database driver directly
  — projects, checkpoints, and review threads are collections in the default
  SQLite-backed adapter. See [`packages/storage/README.md`](../../packages/storage/README.md)
  for the storage layer and how it swaps to an enterprise database later.

---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](file:///f:/AutoCAD%20Competitor/docs/requirements/README.md)
- [Master Requirements Traceability Matrix (RTM)](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/traceability-matrix.md)
- [Requirements Coverage Report](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/unimplemented_requirements.md)
- [Frontend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/frontend-requirements.md)
- [Backend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/backend-requirements.md)
- [Domain Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/domain-requirements.md)
- [Interoperability Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/03-nonfunctional/nonfunctional-requirements.md)

