# Non-Functional Requirements (`NFR`)

Non-functional requirements state **how well** the system must behave. They are
cross-cutting: each names the requirements or architecture modules it constrains
(rule [`R5`](../00-overview/standards-and-conventions.md#traceability-model)).
Categories follow **ISO/IEC 25010**; external criteria (WCAG 2.2, OWASP ASVS) are
named where a requirement claims conformance.

Conventions, priorities, and verification codes in
[standards & conventions](../00-overview/standards-and-conventions.md). Quantitative
thresholds below are **initial targets** to be confirmed against real workloads;
they are stated so the requirement is verifiable rather than aspirational.

## Performance efficiency — `NFR-PERF`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-PERF-001` | The canvas shall sustain interactive pan/zoom at ≥ 30 fps for a plan of at least 5,000 elements on a mainstream laptop. | S | P2 | `FE-CANVAS`, `FE-NAV` | A |
| `NFR-PERF-002` | Live metrics (coverage, density, allocation, FAR) shall update within 200 ms of an edit for a typical plan. | S | P2 | `FE-METRIC`, `DOM-METRIC` | A |
| `NFR-PERF-003` | Remote edits from a collaborator shall appear to other participants within 500 ms under normal network conditions. | S | P4 | `BE-COLLAB`, `FE-PRESENCE` | A |
| `NFR-PERF-004` | Opening a typical project shall present an interactive canvas within 3 s. | S | P2 | `FE-PROJECT`, `BE-PROJECT` | A |
| `NFR-PERF-005` | Import of a 50 MB dataset shall complete or report progress without blocking the UI. | S | P3 | `BE-IMPORT`, `FE-IO` | A |

## Scalability & capacity — `NFR-SCALE`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-SCALE-001` | The platform shall support at least 25 concurrent editors on a single plan without loss of consistency. | S | P4 | `BE-COLLAB`, `BE-PROJECT` | A |
| `NFR-SCALE-002` | Services shall scale horizontally so added instances increase capacity without redesign. | S | P4 | `services/*` | I |
| `NFR-SCALE-003` | Project storage shall accommodate plans of at least 100,000 elements. | C | P3 | `BE-PROJECT`, `BE-GEO` | A |

## Security — `NFR-SEC`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-SEC-001` | The platform shall meet OWASP ASVS 4.0 **Level 2** for application and API security. | M | P4 | `BE-*` | I |
| `NFR-SEC-002` | All data in transit shall be encrypted with TLS 1.2+ ; all endpoints shall require authentication except explicitly public share links. | M | P2 | `BE-API`, `BE-AUTH` | T |
| `NFR-SEC-003` | Authorization shall be enforced server-side on every request; the client shall never be the sole access-control boundary. | M | P2 | `BE-ACCESS` | T |
| `NFR-SEC-004` | Secrets and credentials shall not be stored in the repository or client bundle. | M | P2 | `services/*`, `apps/web` | I |
| `NFR-SEC-005` | Sensitive data at rest (credentials, tokens) shall be encrypted or hashed with a modern algorithm. | S | P2 | `BE-AUTH` | I |

## Privacy & data protection — `NFR-PRIV`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-PRIV-001` | The platform shall restrict access to a plan's content to authorized members and explicit share grants. | M | P4 | `BE-ACCESS` | T |
| `NFR-PRIV-002` | Public share links shall expose only the content and permission level explicitly granted (view or comment), never edit or org data. | M | P4 | `BE-ACCESS` | T |
| `NFR-PRIV-003` | The platform shall allow deletion of a user's account and associated personal data. | S | P4 | `BE-AUTH` | D |

## Accessibility — `NFR-A11Y`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-A11Y-001` | The workspace and review UI shall conform to **WCAG 2.2 Level AA**. | S | P2 | `FE-*` | I |
| `NFR-A11Y-002` | All interactive controls (outside of freehand canvas drawing) shall be operable by keyboard. | S | P2 | `FE-*` | D |
| `NFR-A11Y-003` | Land-use and status color coding shall not rely on color alone; a non-color cue (pattern/label) shall accompany it. | S | P2 | `FE-STYLE`, `FE-METRIC` | I |
| `NFR-A11Y-004` | The simplified public review view shall meet AA and be usable without CAD knowledge. | S | P4 | `FE-REVIEW` | D |

## Usability — `NFR-USE`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-USE-001` | A new user shall be able to open a shared plan and add a comment without training or installation. | M | P4 | `FE-REVIEW`, `FE-NAV`; BR-001 | D |
| `NFR-USE-002` | Destructive actions shall be reversible via undo or confirmable before commit. | S | P2 | `FE-CANVAS`, `FE-SELECT` | D |
| `NFR-USE-003` | The workspace shall run in current versions of major evergreen browsers without plugins. | M | P2 | `apps/web`; BR-001 | D |

## Reliability & availability — `NFR-REL`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-REL-001` | Server-persisted edits shall be durable: an acknowledged save shall survive a service restart. | M | P2 | `BE-PROJECT` | T |
| `NFR-REL-002` | Concurrent edits shall converge to a consistent state with no lost updates. | M | P4 | `BE-COLLAB` | T |
| `NFR-REL-003` | A failed import/export shall leave the project unchanged (no partial corruption). | M | P3 | `BE-IMPORT`, `BE-EXPORT` | T |
| `NFR-REL-004` | Checkpoints shall restore a project to exactly its captured state. | M | P2 | `BE-VERSION` | T |
| `NFR-REL-005` | The collaboration service shall recover client state after a transient disconnect without data loss. | S | P4 | `BE-COLLAB`, `FE-PRESENCE` | T |

## Compatibility & correctness — `NFR-COMPAT`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-COMPAT-001` | Geometry round-tripped through a supported format and back shall preserve shape and CRS within a defined tolerance. | M | P3 | `IOP-*`, `BE-GEO` | T |
| `NFR-COMPAT-002` | Area/distance computations shall be performed in a projected CRS; results shall be within a defined tolerance of an authoritative GIS for the same input. | M | P1 | `DOM-METRIC`, `DOM-GEOM`, `BE-GEO` | T |
| `NFR-COMPAT-003` | The domain model shall run unchanged in the browser, in services, and in tooling (no environment-specific dependencies). | M | P1 | `packages/domain`; CON-003 | I |
| `NFR-COMPAT-004` | Imported CRSs shall be resolvable by EPSG code against a standard registry. | S | P3 | `IOP-CRSX`, `BE-GEO` | T |

## Maintainability — `NFR-MAINT`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-MAINT-001` | All code shall be TypeScript in strict mode, avoiding `any` in favor of explicit domain types. | M | P1 | all; CON-009 | I |
| `NFR-MAINT-002` | The domain model shall have unit and property-based tests for geometry, rules, and metrics. | M | P1 | `packages/domain` | T |
| `NFR-MAINT-003` | Each workspace shall build and test independently via its own scripts, with a CI job. | S | P0 | monorepo; CON-006 | I |
| `NFR-MAINT-004` | Documentation shall move with behavior: structural/behavioral changes update the relevant `docs/` file. | S | P0 | `docs/` | I |

## Observability & operability — `NFR-OBS`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-OBS-001` | Services shall emit structured logs and health/readiness signals. | S | P4 | `services/*` | I |
| `NFR-OBS-002` | Errors surfaced to users shall be actionable and correlated to a server-side trace/id. | S | P3 | `FE-IO`, `services/*` | D |

## Portability & self-hosting — `NFR-PORT`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-PORT-001` | The platform shall be self-hostable, with documented setup, without proprietary managed services being mandatory. | S | P4 | `services/*`; BR-010, CON-007 | D |
| `NFR-PORT-002` | Configuration (identity provider, storage, base URLs) shall be externalized, not hard-coded. | S | P4 | `services/*` | I |

## Licensing & compliance — `NFR-LEGAL`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-LEGAL-001` | The product shall be distributed under GPLv3; dependencies shall be license-compatible. | M | P0 | repo; BR-010, CON-007 | I |
| `NFR-LEGAL-002` | Third-party data/basemaps shall be used within their license terms and attributed where required. | S | P3 | `FE-NAV`, `IOP-*` | I |
