# Non-Functional Requirements (`NFR`)

Non-functional requirements state **how well** the system must behave. They are
cross-cutting: each names the requirements or architecture modules it constrains
(rule [`R5`](../00-overview/standards-and-conventions.md#traceability-model)).
Categories follow **ISO/IEC 25010**; external criteria (WCAG 2.2, OWASP ASVS,
NIST 800-63B) are named where a requirement claims conformance.

Quantitative thresholds below are validated against the **named benchmark
datasets** in [`NFR-BENCH`](#benchmarks--validation--nfr-bench) â€” the mechanism by
which the targets are confirmed against real workloads rather than asserted.
Numeric tolerances referenced below are defined in the
[standards tolerances table](../00-overview/standards-and-conventions.md#tolerances).

## Performance efficiency â€” `NFR-PERF`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-PERF-001` | The canvas shall sustain interactive pan/zoom at â‰¥ 30 fps for a plan of `BENCH-LARGE` size on the reference hardware profile (`NFR-BENCH-005`). | S | P2 | FE-CANVAS, FE-NAV | A |
| `NFR-PERF-002` | Live metrics (coverage, density, allocation, FAR) shall update within 200 ms of an edit for the `BENCH-TYPICAL` plan. | S | P2 | FE-METRIC, DOM-METRIC | A |
| `NFR-PERF-003` | Remote edits from a collaborator shall appear to other participants within 500 ms under the reference network profile (`NFR-BENCH-005`). | S | P4 | BE-COLLAB, FE-PRESENCE | A |
| `NFR-PERF-004` | Opening the `BENCH-TYPICAL` project shall present an interactive canvas within 3 s. | S | P2 | FE-PROJECT, BE-PROJECT | A |
| `NFR-PERF-005` | Import of a 50 MB dataset shall complete or report progress without blocking the UI. | S | P3 | BE-IMPORT, BE-JOB, FE-IO | A |
| `NFR-PERF-006` | Opening a `BENCH-SHEETS-TYPICAL` sheet-set shall present the sheet-set browser and first-sheet preview within 3 s on the reference hardware profile. | S | P6 | FE-SHEETSET, FE-SHEET, BE-SHEET | A |
| `NFR-PERF-007` | Switching between sheets in a `BENCH-SHEETS-TYPICAL` set shall render the next sheet within 500 ms. | S | P6 | FE-SHEET, BE-SHEET | A |
| `NFR-PERF-008` | Batch-plotting a `BENCH-SHEETS-TYPICAL` set to multi-sheet PDF shall complete within 60 s, or report progress without blocking the UI, on the reference hardware profile. | S | P6 | BE-PLOT, BE-JOB, IOP-PDFSHEET | A |

## Scalability & capacity â€” `NFR-SCALE`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-SCALE-001` | The platform shall support the `BENCH-COLLAB` load (25 concurrent editors on `BENCH-LARGE`) without loss of consistency. | S | P4 | BE-COLLAB, BE-PROJECT | A |
| `NFR-SCALE-002` | Services shall scale horizontally so added instances increase capacity without redesign. | S | P4 | services/* | I |
| `NFR-SCALE-003` | Project storage shall accommodate plans of `BENCH-STRESS` size (â‰ˆ 100,000 elements). | C | P3 | BE-PROJECT, BE-GEO | A |
| `NFR-SCALE-004` | The platform shall bound per-organization resource use (storage, project count) by a configurable quota. | S | P4 | BE-PROJECT, BE-STORAGE | T |
| `NFR-SCALE-005` | The platform shall handle a `BENCH-SHEETS-LARGE` sheet-set (â‰ˆ 600 sheets across all disciplines) in a single project without loss of interactivity in the sheet-set browser. | S | P6 | FE-SHEETSET, BE-SHEET | A |

## Security â€” `NFR-SEC`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-SEC-001` | The platform shall meet OWASP ASVS 4.0 **Level 2** for application and API security. | M | P4 | BE-* | I |
| `NFR-SEC-002` | All data in transit shall be encrypted with TLS 1.2+. | M | P2 | BE-API, BE-AUTH | T |
| `NFR-SEC-003` | Authorization shall be enforced server-side on every request; the client shall never be the sole access-control boundary. | M | P2 | BE-ACCESS | T |
| `NFR-SEC-004` | Secrets and credentials shall not be stored in the repository or client bundle. | M | P2 | services/*, apps/web | I |
| `NFR-SEC-005` | Sensitive data at rest (credentials, tokens) shall be encrypted or hashed with a modern algorithm. | S | P2 | BE-AUTH | I |
| `NFR-SEC-006` | Public and authenticated API endpoints shall enforce per-identity rate limiting and abuse throttling (HTTP 429 on exceed). | S | P4 | BE-API, BE-ACCESS, BE-STORAGE | T |
| `NFR-SEC-007` | Authenticated sessions shall expire after a bounded, configurable idle period and support explicit server-side revocation/logout. | S | P2 | BE-AUTH | T |
| `NFR-SEC-008` | Credential policy shall follow NIST 800-63B guidance (or delegate entirely to the configured OIDC identity provider). | S | P4 | BE-AUTH | I |
| `NFR-SEC-009` | Dependencies shall be scanned for known vulnerabilities (SCA) in CI, and a build shall fail on unresolved high/critical advisories in production dependencies. | S | P1 | monorepo, services/*, apps/web | I |
| `NFR-SEC-010` | Each release shall publish a Software Bill of Materials (SBOM). | C | P4 | repo | I |
| `NFR-SEC-011` | Every endpoint shall require authentication except explicitly public share links. | M | P2 | BE-API, BE-ACCESS | T |

## Privacy & data protection â€” `NFR-PRIV`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-PRIV-001` | The platform shall restrict access to a plan's content to authorized members and explicit share grants. | M | P4 | BE-ACCESS | T |
| `NFR-PRIV-002` | Public share links shall expose only the content and permission level explicitly granted (view or comment), never edit or org data. | M | P4 | BE-ACCESS | T |
| `NFR-PRIV-003` | The platform shall allow deletion of a user's account and associated personal data. | S | P4 | BE-AUTH | D |
| `NFR-PRIV-004` | Product telemetry/analytics shall be limited to non-content operational data, disclosed to users, and shall honor opt-out; plan geometry and comment text shall never be sent to third-party analytics. | S | P4 | apps/web, services/* | D |
| `NFR-PRIV-005` | The platform shall support constraining a project's data storage and processing to a configurable geographic region (data residency). | C | P4 | BE-PROJECT, services/* | I |

## Accessibility â€” `NFR-A11Y`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-A11Y-001` | The workspace and review UI shall conform to **WCAG 2.2 Level AA**. | S | P2 | FE-* | I |
| `NFR-A11Y-002` | All interactive controls (outside of freehand canvas drawing) shall be operable by keyboard. | S | P2 | FE-* | D |
| `NFR-A11Y-003` | Land-use and status color coding shall not rely on color alone; a non-color cue (pattern/label) shall accompany it. | S | P2 | FE-STYLE, FE-METRIC | I |
| `NFR-A11Y-004` | The simplified public review view shall meet AA and be usable without CAD knowledge. | S | P4 | FE-REVIEW | D |

## Usability â€” `NFR-USE`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-USE-001` | A new user shall be able to open a shared plan and add a comment without training or installation. | M | P4 | FE-REVIEW, FE-NAV | D |
| `NFR-USE-002` | Destructive actions shall be reversible via undo or confirmable before commit. | S | P2 | FE-CANVAS, FE-SELECT | D |
| `NFR-USE-003` | The workspace shall run in current versions of major evergreen browsers without plugins. | M | P2 | apps/web | D |
| `NFR-USE-004` | The workspace shall provide in-app help and tooltips for its primary tools and panels. | C | P2 | FE-HELP | D |

## Reliability & availability â€” `NFR-REL`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-REL-001` | Server-persisted edits shall be durable: an acknowledged save shall survive a service restart. | M | P2 | BE-PROJECT | T |
| `NFR-REL-002` | Concurrent edits shall converge to a consistent state with no lost updates. | M | P4 | BE-COLLAB | T |
| `NFR-REL-003` | A failed import/export shall leave the project unchanged (no partial corruption). | M | P3 | BE-IMPORT, BE-EXPORT | T |
| `NFR-REL-004` | Checkpoints shall restore a project to exactly its captured state. | M | P2 | BE-VERSION | T |
| `NFR-REL-005` | The collaboration service shall recover client state after a transient disconnect without data loss. | S | P4 | BE-COLLAB, FE-PRESENCE | T |
| `NFR-REL-006` | Under load beyond capacity the platform shall degrade gracefully (queue/throttle, preserve committed data, inform the user) rather than losing edits. | S | P4 | BE-COLLAB, BE-API | A |

## Availability, backup & disaster recovery â€” `NFR-AVAIL`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-AVAIL-001` | The hosted platform shall meet a monthly availability target of â‰¥ 99.9% for the core edit/collaborate API, measured over a rolling 30-day window. | S | P4 | services/*, BE-API | A |
| `NFR-AVAIL-002` | Persisted project data shall be backed up with an RPO â‰¤ 1 hour and an RTO â‰¤ 4 hours for a service-level failure. | M | P4 | BE-PROJECT, BE-VERSION | D |
| `NFR-AVAIL-003` | The platform shall have a documented, periodically exercised disaster-recovery procedure restoring service from backups in a separate failure domain. | S | P4 | services/* | D |

## Compatibility & correctness â€” `NFR-COMPAT`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-COMPAT-001` | Geometry round-tripped through a supported format and back shall preserve shape and CRS within the interoperability tolerance. | M | P3 | IOP-*, BE-GEO | T |
| `NFR-COMPAT-002` | Area/distance computations shall be performed in a projected CRS; results shall be within the metric tolerance of an authoritative GIS for the same input. | M | P1 | DOM-METRIC, DOM-GEOM, BE-GEO | T |
| `NFR-COMPAT-003` | The domain model shall run unchanged in the browser, in services, and in tooling (no environment-specific dependencies). | M | P1 | packages/domain | I |
| `NFR-COMPAT-004` | Imported CRSs shall be resolvable by EPSG code against a standard registry. | S | P3 | IOP-CRSX, BE-GEO | T |
| `NFR-COMPAT-005` | The platform shall declare and test against a documented support matrix of browser versions (current + one prior of each major evergreen engine) and minimum input classes (desktop pointer; tablet touch). | S | P2 | apps/web | T |

## Internationalization & localization â€” `NFR-I18N`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-I18N-001` | All user-facing strings shall be externalized for localization, so the UI can be translated without code changes. | C | P4 | FE-* | I |
| `NFR-I18N-002` | The UI shall render numbers, dates, and measurement units per the user's locale and unit preference, without altering stored canonical values. | S | P2 | FE-METRIC, FE-MEASURE, FE-PREFS, DOM-UNIT | D |

## Content safety â€” `NFR-MOD`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-MOD-001` | Publicly submitted comments shall pass server-side input sanitization (no active/script content) and support spam/abuse mitigation (rate limiting, reporting/hide) before display to other users. | S | P4 | BE-COMMENT, FE-REVIEW | T |

## Maintainability â€” `NFR-MAINT`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-MAINT-001` | All code shall be TypeScript in strict mode, avoiding `any` in favor of explicit domain types. | M | P1 | all | I |
| `NFR-MAINT-002` | The domain model shall have unit and property-based tests for geometry, rules, and metrics. | M | P1 | packages/domain | T |
| `NFR-MAINT-003` | Each workspace shall build and test independently via its own scripts, with a CI job. | S | P0 | monorepo | I |
| `NFR-MAINT-004` | Documentation shall move with behavior: structural/behavioral changes update the relevant `docs/` file. | S | P0 | docs/ | I |
| `NFR-MAINT-005` | The public API shall be versioned and follow a documented deprecation policy giving â‰¥ 6 months notice and an overlap window before a breaking change removes a version. | S | P4 | BE-API | I |
| `NFR-MAINT-006` | Every Must-priority functional requirement shall have at least one traced `TC-â€¦` test case before its target phase ships. | S | P1 | all functional | I |

## Observability & operability â€” `NFR-OBS`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-OBS-001` | Services shall emit structured logs and health/readiness signals. | S | P4 | services/* | I |
| `NFR-OBS-002` | Errors surfaced to users shall be actionable and correlated to a server-side trace/id. | S | P3 | FE-IO, services/* | D |

## Portability & self-hosting â€” `NFR-PORT`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-PORT-001` | The platform shall be self-hostable, with documented setup, without proprietary managed services being mandatory. | S | P4 | services/* | D |
| `NFR-PORT-002` | Configuration (identity provider, storage, base URLs) shall be externalized, not hard-coded. | S | P4 | services/* | I |
| `NFR-PORT-003` | Capabilities shall be controllable by feature flags to support staged rollout and self-host configuration. | C | P4 | services/*, apps/web | I |

## Licensing & compliance â€” `NFR-LEGAL`

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-LEGAL-001` | The product shall be distributed under GPLv3; dependencies shall be license-compatible. | M | P0 | repo | I |
| `NFR-LEGAL-002` | Third-party data/basemaps shall be used within their license terms and attributed where required. | S | P3 | FE-NAV, IOP-*, BE-GEO | I |

## Plot fidelity â€” `NFR-PLOT`

Correctness of the printed/exported sheet output for Phase-6 CAD sheets. These
constraints keep a "true-scale" claim honest and a permit-review-ready plot
free of surprises across viewers and print devices.

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-PLOT-001` | A distance measured between two points on a true-scale plot (PDF at 100 % zoom on a calibrated viewer, or physical print) shall be within the plot scale tolerance of the intended distance. | M | P6 | BE-SHEET-005, IOP-PDFSHEET-006, FE-PLOT-004 | A |
| `NFR-PLOT-002` | Annotative text, dimensions, and symbols shall render at the pinned plotted sizes in the tolerances table (body 2.5 mm, headings 3.5 mm, arrowheads 2.5 mm) regardless of viewport scale, with fonts embedded in the plot output. | M | P6 | DOM-ANNO-002, DOM-DIM-004, BE-PLOT-004, IOP-PDFSHEET-005 | T |
| `NFR-PLOT-003` | Line weights applied by the plot-style table shall render on paper at the nominal ISO widths (Â±0.05 mm) on the reference plot device. | S | P6 | DOM-PLOTSTYLE-002, BE-SHEET-005 | A |
| `NFR-PLOT-004` | Line types (dashed / hidden / centre / phantom) shall preserve their dash-pattern proportions across viewport scale via annotative linetype scaling. | S | P6 | DOM-PLOTSTYLE-003 | T |
| `NFR-PLOT-005` | The composed on-screen plot preview shall match the produced PDF within one pixel per plotted millimetre at 100 % zoom. | S | P6 | FE-PLOT-004, BE-SHEET-002 | T |
| `NFR-PLOT-006` | Colour rendering shall follow the plot-style table exactly; monochrome and greyscale modes shall not introduce hue shifts or lineweight distortion. | S | P6 | DOM-PLOTSTYLE-001, BE-PLOT-001 | T |

## Standards conformance â€” `NFR-STD`

Named external standards the Phase-6 sheet-production capability shall be
verifiably conformant with. These make `CON-011` testable rather than
aspirational.

| ID | Requirement | Pri | Phase | Constrains | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-STD-001` | Sheet sizes and title-block placement shall conform to ANSI/ASME Y14.1 (Arch Aâ€“E1, ANSI Aâ€“E) and ISO 5457 (A0â€“A4). | M | P6 | DOM-SHEET-007, FE-SHEET-003 | I |
| `NFR-STD-002` | Title-block data fields shall conform to ISO 7200. | M | P6 | DOM-TITLEBLOCK-002, FE-TITLE-002 | I |
| `NFR-STD-003` | Layer names emitted by the system shall be validatable against the US National CAD Standard v6 / AIA Layer Guidelines or ISO 13567, per the project's active layer standard. | M | P6 | DOM-LAYERSTD-001, DOM-LAYERSTD-004, IOP-LAYERMAP-003 | T |
| `NFR-STD-004` | Sheet numbering shall follow the `<Discipline><Sheet-type><Sequence>` scheme with NCS-conformant discipline designators and sheet-type digits by default. | M | P6 | DOM-DISCIPLINE-001, DOM-NUMBERING-001 | T |
| `NFR-STD-005` | Dimensioning, line conventions, and lettering shall conform to ISO 128 Â· ISO 129-1 Â· ISO 3098 defaults, overridable per project. | S | P6 | DOM-DIM-003, DOM-ANNO-003, DOM-PLOTSTYLE-003 | I |
| `NFR-STD-006` | Multi-sheet PDF archival output shall pass a PDF/A-2 validator; engineering PDF output, when requested, shall pass a PDF/E-1 validator. | S | P6 | IOP-PDFSHEET-003, IOP-PDFSHEET-004 | T |
| `NFR-STD-007` | The system shall publish a documented conformance statement per released version enumerating the version of each standard it targets (NCS v6, AIA, ISO 13567, ISO 5457, ISO 7200, ISO 128/129/3098, ISO 19005-2, ISO 24517-1). | S | P6 | Phase 6 sheet output | I |

## Benchmarks & validation â€” `NFR-BENCH`

Turns the performance/scalability targets from asserted numbers into **verifiable**
requirements, by defining the fixed inputs and the validation gate.

| ID | Requirement | Pri | Phase | Constrains / validates | Verify |
| --- | --- | :--: | :--: | --- | :--: |
| `NFR-BENCH-001` | The project shall define named reference datasets â€” `BENCH-TYPICAL` (â‰ˆ 500 elements: one site with parcels, lots, zones, ROW, land use), `BENCH-LARGE` (â‰ˆ 5,000 elements), and `BENCH-STRESS` (â‰ˆ 100,000 elements) â€” as the fixed inputs for performance and scalability targets. | S | P2 | NFR-PERF-001..005, NFR-SCALE-001..003 | I |
| `NFR-BENCH-002` | The project shall define a named collaboration scenario `BENCH-COLLAB` (25 concurrent simulated editors on `BENCH-LARGE`) as the input for concurrency and sync-latency targets. | S | P4 | NFR-SCALE-001, NFR-PERF-003, NFR-REL-002 | I |
| `NFR-BENCH-003` | Before a release publicly claims a performance or scalability figure, that figure shall be validated by an automated benchmark/load test against the applicable `BENCH` dataset on the reference hardware profile, with results recorded. | M | P2 | NFR-PERF-001..005, NFR-SCALE-001..003 | A |
| `NFR-BENCH-004` | A performance regression budget shall be enforced in CI so a merge degrading a benchmarked metric beyond a defined threshold (e.g. > 10% on frame time, update latency, or open time vs the recorded baseline) fails the build. | S | P2 | NFR-PERF-001..004, NFR-SCALE-003 | A |
| `NFR-BENCH-005` | The reference hardware and network profile used for benchmarking (the "mainstream laptop" and "normal network") shall be documented and pinned so measurements are comparable across releases. | S | P2 | NFR-PERF-001, NFR-PERF-003 | I |
| `NFR-BENCH-006` | The project shall define named sheet-set reference datasets â€” `BENCH-SHEETS-SMALL` (â‰ˆ 30 sheets across 3 disciplines), `BENCH-SHEETS-TYPICAL` (â‰ˆ 120 sheets across 6 disciplines), and `BENCH-SHEETS-LARGE` (â‰ˆ 600 sheets across all disciplines) â€” as the fixed inputs for sheet-set composition, plot, and packaging performance targets. | S | P6 | NFR-PLOT-*, BE-SHEET-*, BE-PLOT-*, IOP-PDFSHEET-* | I |

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

