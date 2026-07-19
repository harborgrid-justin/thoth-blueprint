# Functional Requirements — Backend (`BE`)

Requirements for the **cloud services** (`services/*`): identity & access,
project persistence & versioning, geospatial transforms & storage, import/export,
real-time collaboration, comments, audit, and the public API. Each row names the
owning service in its area heading and maps to that architecture module.

Conventions in [standards & conventions](../00-overview/standards-and-conventions.md).
Every row traces **up** to a [stakeholder requirement](../01-business/stakeholders.md);
full cross-references in the
[traceability matrix](../04-traceability/traceability-matrix.md).

> Service boundaries are logical; whether they deploy as separate services or a
> modular monolith to start is an implementation decision
> ([ARCHITECTURE](../../ARCHITECTURE.md)). Requirements are written to the logical
> boundary.

## Identity — `BE-AUTH` (`services/auth`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-AUTH-001` | The auth service shall authenticate users via an OIDC/OAuth2 identity provider. | M | P2 | STK-006 | T |
| `BE-AUTH-002` | The auth service shall issue and validate scoped, expiring sessions/tokens for authenticated requests. | M | P2 | STK-006; NFR-SEC | T |
| `BE-AUTH-003` | The auth service shall model organizations and teams that own projects. | M | P2 | STK-006 | T |
| `BE-AUTH-004` | The auth service shall assign roles (at minimum owner, editor, commenter, viewer) to members. | M | P2 | STK-006; BR-009 | T |

## Authorization & sharing — `BE-ACCESS` (`services/auth`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-ACCESS-001` | The service shall authorize every action against the actor's role and the target resource. | M | P2 | STK-006; NFR-SEC | T |
| `BE-ACCESS-002` | The service shall support project-level sharing at view, comment, and edit levels. | M | P4 | STK-003, STK-006; BR-007 | T |
| `BE-ACCESS-003` | The service shall support public read-only and comment-only access to a plan via a shareable link. | S | P4 | STK-005; BR-009 | T |
| `BE-ACCESS-004` | Permissions shall follow an inheritance hierarchy (organization → team → project), with explicit grants overriding inherited ones. | S | P4 | STK-006 | T |
| `BE-ACCESS-005` | The service shall support expiring and revoking share links. | S | P4 | STK-006; NFR-SEC | T |

## Projects & persistence — `BE-PROJECT` (`services/projects`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-PROJECT-001` | The projects service shall create, read, update, and delete projects. | M | P2 | STK-006 | T |
| `BE-PROJECT-002` | The service shall persist a project's full plan state (geometry, planning objects, layers, styling) on the server as the source of truth. | M | P2 | STK-001; CON-002 | T |
| `BE-PROJECT-003` | Each project shall be owned by an organization/team and scoped by access control. | M | P2 | STK-006 | T |
| `BE-PROJECT-004` | The service shall persist concurrent edits without loss or corruption. | M | P2 | STK-003; NFR-REL | T |

## Versioning & checkpoints — `BE-VERSION` (`services/projects`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-VERSION-001` | The service shall track project versions over time to support history. | M | P4 | STK-003; BR-007 | T |
| `BE-VERSION-002` | The service shall create named checkpoints (snapshots) of a project. | M | P2 | STK-003; BR-007 | T |
| `BE-VERSION-003` | The service shall restore a project to a prior checkpoint or version. | M | P2 | STK-003 | T |
| `BE-VERSION-004` | The service shall expose queryable version/checkpoint history. | S | P4 | STK-003 | T |

## Geospatial — `BE-GEO` (`services/geospatial`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-GEO-001` | The geospatial service shall reproject geometry between coordinate reference systems identified by EPSG code, applying the correct datum transformation. | M | P3 | STK-001; BR-004 | T |
| `BE-GEO-002` | The service shall store and retrieve layers and their geometry. | M | P3 | STK-002 | T |
| `BE-GEO-003` | The service shall answer spatial queries (e.g. containment, intersection) used by planning operations. | S | P3 | STK-002 | T |
| `BE-GEO-004` | The service shall reproject to an appropriate **projected** CRS before computing any area- or distance-based metric, never computing area/distance in a geographic or area-distorting CRS. | M | P3 | STK-001; BR-004, NFR-COMPAT | T |

## Import — `BE-IMPORT` (`services/geospatial`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-IMPORT-001` | The service shall ingest the supported formats (see [interoperability](interoperability-requirements.md)) and translate them into domain objects and layers. | M | P3 | STK-001, STK-007; BR-005 | T |
| `BE-IMPORT-002` | The service shall detect the source CRS where declared and require the user to specify it where absent. | M | P3 | STK-001; BR-004 | T |
| `BE-IMPORT-003` | The service shall validate imported data and return actionable errors/warnings without partial corruption. | M | P3 | STK-007; NFR-REL | T |

## Export — `BE-EXPORT` (`services/geospatial`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-EXPORT-001` | The service shall generate the supported export formats from a project's domain objects. | M | P3 | STK-004, STK-007; BR-005 | T |
| `BE-EXPORT-002` | The service shall let the caller export a chosen extent and layer subset. | S | P3 | STK-004 | T |
| `BE-EXPORT-003` | The service shall generate a to-scale PDF exhibit with legend, north arrow, and scale bar. | S | P3 | STK-004; BR-005 | D |

## Collaboration — `BE-COLLAB` (`services/collaboration`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-COLLAB-001` | The collaboration service shall propagate edits to all participants of a plan in near-real-time. | M | P4 | STK-003; BR-003 | T |
| `BE-COLLAB-002` | The service shall resolve concurrent edits to a converged, consistent state using a defined strategy (CRDT or OT — decided in the service). | M | P4 | STK-003; NFR-REL | T |
| `BE-COLLAB-003` | The service shall broadcast presence (who is viewing/editing) and cursor/selection state. | M | P4 | STK-003 | T |
| `BE-COLLAB-004` | The service shall support presence-aware locking of an element being actively edited. | C | P4 | STK-003 | T |

## Comments & review — `BE-COMMENT` (`services/collaboration`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-COMMENT-001` | The service shall store comments anchored to a plan element or location. | M | P4 | STK-003; BR-003 | T |
| `BE-COMMENT-002` | The service shall model threads with replies and a resolved/open state. | M | P4 | STK-003 | T |
| `BE-COMMENT-003` | The service shall notify mentioned users and thread participants of new activity. | S | P4 | STK-003 | T |

## Audit & governance — `BE-AUDIT` (`services/projects`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-AUDIT-001` | The service shall record an audit event (actor, action, target, timestamp) for changes to a project. | S | P4 | STK-003, STK-006; BR-007 | T |
| `BE-AUDIT-002` | The service shall expose a queryable audit trail for a project. | S | P4 | STK-006 | T |
| `BE-AUDIT-003` | The audit trail shall be append-only / tamper-evident. | C | P4 | STK-003; NFR-SEC | A |

## Public API — `BE-API` (all services)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-API-001` | The platform shall expose a documented API covering projects, plan content, and import/export. | S | P3 | STK-007; BR-010 | I |
| `BE-API-002` | Every API endpoint shall enforce authentication and authorization. | M | P3 | STK-007; NFR-SEC | T |
| `BE-API-003` | API contracts shall be versioned so integrations do not break on change. | S | P3 | STK-007; NFR-MAINT | I |
| `BE-API-004` | The API shall support automated import and export for integrators. | S | P3 | STK-007; BR-005 | T |
