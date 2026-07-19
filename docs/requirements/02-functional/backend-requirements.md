# Functional Requirements — Backend (`BE`)

Requirements for the **cloud services** (`services/*`): identity & access,
project persistence & versioning, geospatial transforms & storage, import/export,
asynchronous jobs, asset storage, real-time collaboration, comments,
notifications, search, audit, webhooks, and the public API. Each area names the
owning service in its heading and maps to that architecture module.

Conventions in [standards & conventions](../00-overview/standards-and-conventions.md).
Every row traces **up** to a [stakeholder requirement](../01-business/stakeholders.md);
the [traceability matrix](../04-traceability/traceability-matrix.md) is generated
from the **Trace** column here.

> Service boundaries are logical; whether they deploy as separate services or a
> modular monolith to start is an implementation decision
> ([ARCHITECTURE](../../ARCHITECTURE.md)). Requirements are written to the logical
> boundary.

## Identity — `BE-AUTH` (`services/auth`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-AUTH-001` | The auth service shall authenticate users via an OIDC/OAuth2 identity provider. | M | P2 | STK-006; DEP-001 | T |
| `BE-AUTH-002` | The auth service shall issue and validate scoped, expiring sessions/tokens for authenticated requests. | M | P2 | STK-006; NFR-SEC-002 | T |
| `BE-AUTH-003` | The auth service shall model organizations and teams that own projects. | M | P2 | STK-006 | T |
| `BE-AUTH-004` | The auth service shall assign roles (at minimum owner, editor, commenter, viewer) to members. | M | P2 | STK-006; BR-009 | T |
| `BE-AUTH-005` | The auth service shall manage organization/team membership: add a member, remove a member, and change a member's role. | M | P2 | STK-006 | T |
| `BE-AUTH-006` | The auth service shall transfer ownership of an organization or project to another eligible member. | S | P4 | STK-006 | T |
| `BE-AUTH-007` | The auth service shall export a user's personal data and account information on request. | S | P4 | STK-006; NFR-PRIV-003 | T |

## Authorization & sharing — `BE-ACCESS` (`services/auth`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-ACCESS-001` | The service shall authorize every action against the actor's role and the target resource. | M | P2 | STK-006; NFR-SEC-003 | T |
| `BE-ACCESS-002` | The service shall support project-level sharing at view, comment, and edit levels. | M | P4 | STK-003, STK-006; BR-007 | T |
| `BE-ACCESS-003` | The service shall support public read-only and comment-only access to a plan via a shareable link. | S | P4 | STK-005; BR-009 | T |
| `BE-ACCESS-004` | Permissions shall follow an inheritance hierarchy (organization → team → project), with explicit grants overriding inherited ones. | S | P4 | STK-006 | T |
| `BE-ACCESS-005` | The service shall support expiring and revoking share links. | S | P4 | STK-006; NFR-SEC-001 | T |
| `BE-ACCESS-006` | The service shall invite a user to a project or organization by email and track the invitation as pending until accepted, declined, or expired. | M | P4 | STK-006; BR-007 | T |

## Projects & persistence — `BE-PROJECT` (`services/projects`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-PROJECT-001` | The projects service shall create, read, update, and delete projects. | M | P2 | STK-006 | T |
| `BE-PROJECT-002` | The service shall persist a project's full plan state (geometry, planning objects, layers, styling) on the server as the source of truth. | M | P2 | STK-001; CON-002 | T |
| `BE-PROJECT-003` | Each project shall be owned by an organization/team and scoped by access control. | M | P2 | STK-006; NFR-PRIV-001 | T |
| `BE-PROJECT-004` | The service shall persist concurrent edits from multiple sessions without loss or corruption. | M | P4 | STK-003; NFR-REL-002 | T |
| `BE-PROJECT-005` | The service shall version the stored plan schema and migrate a persisted project to the current domain-model version on load without data loss. | M | P2 | STK-003; CON-010, NFR-MAINT-001 | T |
| `BE-PROJECT-006` | The service shall duplicate a project server-side, including its plan content, layers, and styling. | S | P4 | STK-004 | T |
| `BE-PROJECT-007` | The service shall instantiate a new project from a template. | C | P4 | STK-002, STK-004 | T |
| `BE-PROJECT-008` | The service shall soft-delete a project with a recovery window and, on request or at retention expiry, permanently purge it and cascade deletion to its layers, checkpoints, comments, assets, and share links. | S | P4 | STK-006; NFR-PRIV-003 | T |

> `BE-PROJECT-004` is phased P4 (multi-user editing); single-user durable
> persistence at P2 is covered by `BE-PROJECT-002` and `NFR-REL-001`.

## Versioning & checkpoints — `BE-VERSION` (`services/projects`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-VERSION-001` | The service shall track project versions over time to support history. | M | P4 | STK-003; BR-007 | T |
| `BE-VERSION-002` | The service shall create named checkpoints (snapshots) of a project. | M | P2 | STK-003; BR-007 | T |
| `BE-VERSION-003` | The service shall restore a project to a prior checkpoint or version. | M | P2 | STK-003; BR-007 | T |
| `BE-VERSION-004` | The service shall expose queryable version/checkpoint history. | S | P4 | STK-003; BR-007 | T |
| `BE-VERSION-005` | The service shall compute the differences between two versions or checkpoints of a project. | C | P4 | STK-003; BR-007 | T |

## Geospatial — `BE-GEO` (`services/geospatial`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-GEO-001` | The geospatial service shall reproject geometry between coordinate reference systems identified by EPSG code, applying the correct datum transformation. | M | P3 | STK-001; BR-004, DEP-002 | T |
| `BE-GEO-002` | The service shall store and retrieve layers and their geometry. | M | P3 | STK-002; BR-002 | T |
| `BE-GEO-003` | The service shall answer spatial queries (e.g. containment, intersection) used by planning operations. | S | P3 | STK-002; BR-008 | T |
| `BE-GEO-004` | The service shall reproject to an appropriate **projected** CRS before computing any area- or distance-based metric, never computing area/distance in a geographic or area-distorting CRS. | M | P3 | STK-001; BR-004, NFR-COMPAT-002 | T |
| `BE-GEO-005` | The service shall proxy and cache external basemap/tile-provider requests while preserving required provider attribution. | S | P3 | STK-001; NFR-LEGAL-002, DEP-003 | T |

## Import — `BE-IMPORT` (`services/geospatial`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-IMPORT-001` | The service shall ingest the supported formats (see [interoperability](interoperability-requirements.md)) and translate them into domain objects and layers. | M | P3 | STK-001, STK-007; BR-005 | T |
| `BE-IMPORT-002` | The service shall detect the source CRS where declared and require the user to specify it where absent. | M | P3 | STK-001; BR-004 | T |
| `BE-IMPORT-003` | The service shall validate imported data and return actionable errors/warnings without partial corruption. | M | P3 | STK-007; NFR-REL-003 | T |

## Export — `BE-EXPORT` (`services/geospatial`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-EXPORT-001` | The service shall generate the supported export formats from a project's domain objects. | M | P3 | STK-004, STK-007; BR-005 | T |
| `BE-EXPORT-002` | The service shall let the caller export a chosen extent and layer subset. | S | P3 | STK-004; BR-005 | T |
| `BE-EXPORT-003` | The service shall generate a to-scale PDF exhibit with legend, north arrow, and scale bar. | S | P3 | STK-004; BR-005 | D |

## Asynchronous jobs — `BE-JOB` (`services/geospatial`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-JOB-001` | The service shall execute long-running import, export, and exhibit-generation operations as asynchronous jobs with persisted status. | M | P3 | STK-001, STK-007; NFR-PERF-005 | T |
| `BE-JOB-002` | The service shall let an authorized caller poll a job's status and progress. | M | P3 | STK-007; NFR-OBS-002 | T |
| `BE-JOB-003` | The service shall let an authorized caller cancel an in-progress job. | S | P3 | STK-007 | T |
| `BE-JOB-004` | The service shall deliver a completed job's output artifact via an authenticated, expiring download link. | S | P3 | STK-004, STK-007; NFR-SEC-002 | T |

## Asset storage — `BE-STORAGE` (`services/projects`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-STORAGE-001` | The service shall store and retrieve binary assets (uploaded source files, reference images, generated exhibits, comment attachments) associated with a project. | M | P3 | STK-001, STK-004 | T |
| `BE-STORAGE-002` | The service shall authorize asset access under the same access control as the asset's owning project. | M | P3 | STK-006; NFR-PRIV-001 | T |
| `BE-STORAGE-003` | The service shall enforce per-type and per-size upload limits and reject unsupported or oversized uploads. | S | P3 | STK-007; NFR-SEC-006 | T |
| `BE-STORAGE-004` | The service shall delete an asset's stored bytes when its owning project or attachment is deleted. | S | P4 | STK-006; NFR-PRIV-003 | T |

## Collaboration — `BE-COLLAB` (`services/collaboration`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-COLLAB-001` | The collaboration service shall propagate edits to all participants of a plan in near-real-time. | M | P4 | STK-003; BR-003 | T |
| `BE-COLLAB-002` | The service shall resolve concurrent edits to a converged, consistent state using a defined strategy (CRDT or OT — decided in the service). | M | P4 | STK-003; NFR-REL-002 | T |
| `BE-COLLAB-003` | The service shall broadcast presence (who is viewing/editing) and cursor/selection state. | M | P4 | STK-003; BR-003 | T |
| `BE-COLLAB-004` | The service shall support presence-aware locking of an element being actively edited. | C | P4 | STK-003; BR-003 | T |
| `BE-COLLAB-005` | The service shall manage editing-session lifecycle (join, heartbeat, leave) and reap presence and locks held by disconnected clients. | S | P4 | STK-003; NFR-REL-005 | T |
| `BE-COLLAB-006` | The service shall reconcile edits made by a client while disconnected upon reconnection, converging without lost updates. | C | P5 | STK-003; CON-002, NFR-REL-005 | T |

## Comments & review — `BE-COMMENT` (`services/collaboration`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-COMMENT-001` | The service shall store comments anchored to a plan element or location. | M | P4 | STK-003; BR-003 | T |
| `BE-COMMENT-002` | The service shall model threads with replies and a resolved/open state. | M | P4 | STK-003; BR-003 | T |
| `BE-COMMENT-003` | The service shall raise notification events for mentioned users and thread participants. | S | P4 | STK-003; BR-003 | T |
| `BE-COMMENT-004` | The service shall support file and image attachments on comments. | C | P4 | STK-003 | T |

## Notifications — `BE-NOTIFY` (`services/collaboration`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-NOTIFY-001` | The service shall deliver user notifications via in-app and email channels. | S | P4 | STK-003, STK-006; BR-003 | T |
| `BE-NOTIFY-002` | The service shall notify a user of events relevant to them (invitation received, mention, review request, job completion). | S | P4 | STK-003, STK-006 | T |
| `BE-NOTIFY-003` | The service shall let a user configure which notification types they receive and on which channel, including unsubscribe. | C | P4 | STK-006; NFR-PRIV-004 | T |

## Search & listing — `BE-SEARCH` (`services/projects`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-SEARCH-001` | The service shall list the caller's accessible projects with pagination. | M | P2 | STK-006 | T |
| `BE-SEARCH-002` | The service shall filter and sort project listings by attributes (name, owner/team, last-modified). | S | P2 | STK-006 | T |
| `BE-SEARCH-003` | The service shall search projects by name and metadata text. | C | P4 | STK-006 | T |

## Audit & governance — `BE-AUDIT` (`services/projects`)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-AUDIT-001` | The service shall record an audit event (actor, action, target, timestamp) for changes to a project. | M | P4 | STK-003, STK-006; BR-007 | T |
| `BE-AUDIT-002` | The service shall expose a queryable audit trail for a project. | S | P4 | STK-006; BR-007 | T |
| `BE-AUDIT-003` | The audit trail shall be append-only / tamper-evident. | C | P4 | STK-003; NFR-SEC-001 | A |
| `BE-AUDIT-004` | The service shall record security-relevant events — authentication, role/permission changes, and share grants/revocations. | S | P4 | STK-006; NFR-SEC-001 | T |

## Webhooks — `BE-WEBHOOK` (all services)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-WEBHOOK-001` | The platform shall let an integrator register webhook subscriptions for project and plan events. | C | P5 | STK-007; BR-010 | T |
| `BE-WEBHOOK-002` | The platform shall deliver webhook payloads as signed, verifiable requests and retry on delivery failure. | C | P5 | STK-007; NFR-SEC-001 | T |

## Public API — `BE-API` (all services)

| ID | Requirement | Pri | Phase | Trace | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `BE-API-001` | The platform shall expose a documented API covering projects, plan content, and import/export. | S | P3 | STK-007; BR-010 | I |
| `BE-API-002` | Every API endpoint shall enforce authentication and authorization. | M | P3 | STK-007; NFR-SEC-003 | T |
| `BE-API-003` | API contracts shall be versioned so integrations do not break on change. | S | P3 | STK-007; NFR-MAINT-005 | I |
| `BE-API-004` | The API shall support automated import and export for integrators. | S | P3 | STK-007; BR-005 | T |
| `BE-API-005` | The API shall return an idempotent result for a write retried with the same client-supplied idempotency key. | S | P3 | STK-007; NFR-REL-001 | T |
| `BE-API-006` | The API shall paginate every collection endpoint with a stable, documented paging contract. | S | P3 | STK-007; NFR-MAINT-001 | I |
| `BE-API-007` | The API shall return errors in a consistent, documented structure carrying a machine-readable code and a correlation id. | S | P3 | STK-007; NFR-OBS-002 | I |
| `BE-API-008` | The API shall support optimistic concurrency (resource version / ETag) so a stale write is rejected rather than silently overwriting. | S | P3 | STK-007; NFR-REL-002 | T |
