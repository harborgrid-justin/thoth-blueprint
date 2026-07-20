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
- No planning geometry here â€” that's `@thoth/domain`.

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

