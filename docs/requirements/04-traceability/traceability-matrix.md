# Requirements Traceability Matrix (RTM)

This is the spine of the suite: it realizes **bidirectional traceability** across
the full chain defined in
[standards & conventions](../00-overview/standards-and-conventions.md#traceability-model):

```
BR ─▶ STK ─▶ {FE, BE, DOM, IOP} ─▶ Phase · Module · Verification
                    ▲
              NFR (cross-cutting constraints)
```

Read it **down** (a business goal → the features that deliver it) or **up** (a
requirement → why it exists). The [coverage report](coverage-report.md) validates
the matrix against the suite's own coverage rules `R1`–`R5`.

**Legend.** Priority: **M** Must · **S** Should · **C** Could · **W** Won't-yet.
Verify: **T** Test · **D** Demonstration · **I** Inspection · **A** Analysis.
Status: ⬜ Planned (specified, not yet built) · 🟡 In progress · ✅ Done. The
repository is currently scaffold ([ROADMAP](../../ROADMAP.md) Phase 0), so every
requirement is **⬜ Planned**; this column becomes the live build tracker as work
lands.

---

## Matrix A — Business → Stakeholder

Every business requirement is served by at least one stakeholder (rule `R1`).
Source: [business requirements](../01-business/business-requirements.md).

| Business req | Served by stakeholders |
| --- | --- |
| [`BR-001`](../01-business/business-requirements.md) Web-native workspace | STK-001, STK-002, STK-005 |
| [`BR-002`](../01-business/business-requirements.md) Domain-native objects | STK-001, STK-002 |
| [`BR-003`](../01-business/business-requirements.md) Real-time collaboration | STK-003, STK-005 |
| [`BR-004`](../01-business/business-requirements.md) Spatial honesty | STK-001, STK-002 |
| [`BR-005`](../01-business/business-requirements.md) Interoperability | STK-001, STK-004, STK-007 |
| [`BR-006`](../01-business/business-requirements.md) CAD-grade precision | STK-001, STK-004 |
| [`BR-007`](../01-business/business-requirements.md) Governed & auditable | STK-003, STK-005, STK-006 |
| [`BR-008`](../01-business/business-requirements.md) Planning intelligence | STK-001, STK-002, STK-004 |
| [`BR-009`](../01-business/business-requirements.md) Full stakeholder spectrum | STK-001 – STK-007 |
| [`BR-010`](../01-business/business-requirements.md) Open & self-hostable | STK-007 |
| [`BR-011`](../01-business/business-requirements.md) Incremental, domain-first | all (via Phase) |

## Matrix B — Stakeholder → functional areas & module

Every stakeholder decomposes into functional areas (rule `R2`).
Source: [stakeholders](../01-business/stakeholders.md).

| Stakeholder | Frontend | Backend | Domain | Interop |
| --- | --- | --- | --- | --- |
| STK-001 Site planner | CANVAS, PRECISION, MEASURE | GEO, IMPORT | PARCEL, LOT, GEOM, SUBDIV, METRIC | DXF, GEOJSON, SHP |
| STK-002 Urban planner | STYLE, METRIC, LAYER | GEO | ZONE, LANDUSE, METRIC, COMPLY | — |
| STK-003 Reviewer | REVIEW, PROJECT | COMMENT, VERSION, AUDIT, ACCESS | — | — |
| STK-004 Developer | CANVAS, METRIC | EXPORT | SETBACK, ENVELOPE, METRIC | PDF, DXF |
| STK-005 Community | REVIEW, NAV | ACCESS | — | KML, PDF |
| STK-006 Org admin | ACCOUNT | AUTH, ACCESS, AUDIT | — | — |
| STK-007 Integrator | IO | API, IMPORT, EXPORT | — | GEOJSON, SHP, GPKG, CSV |

---

## Matrix C — Master requirement traceability

One row per requirement. Requirement text lives in the linked source files; this
matrix carries the trace links. Module is constant per area (stated in the
sub-heading).

### C.1 Frontend — module `apps/web` · source [frontend-requirements.md](../02-functional/frontend-requirements.md)

| Req | ↑ Stakeholder | ↑ Business / Constraint | NFR | Phase | Pri | V | Status |
| --- | --- | --- | --- | :--: | :--: | :--: | :--: |
| FE-CANVAS-001 | STK-001, STK-002 | BR-002 | — | P2 | M | D | ⬜ |
| FE-CANVAS-002 | STK-001 | BR-002 | — | P2 | M | D | ⬜ |
| FE-CANVAS-003 | STK-001 | BR-002 | — | P2 | S | D | ⬜ |
| FE-CANVAS-004 | STK-001 | BR-002 | NFR-USE-002 | P2 | M | D | ⬜ |
| FE-CANVAS-005 | STK-002 | BR-002 | — | P2 | M | T | ⬜ |
| FE-CANVAS-006 | STK-001 | BR-002 | — | P2 | S | D | ⬜ |
| FE-CANVAS-007 | STK-001 | BR-002 | — | P2 | S | D | ⬜ |
| FE-CANVAS-008 | STK-001 | BR-006 | NFR-USE-002 | P2 | M | T | ⬜ |
| FE-PRECISION-001 | STK-001 | BR-006 | — | P2 | M | D | ⬜ |
| FE-PRECISION-002 | STK-001 | BR-006 | — | P2 | M | D | ⬜ |
| FE-PRECISION-003 | STK-001 | BR-006 | — | P2 | S | D | ⬜ |
| FE-PRECISION-004 | STK-001 | BR-006 | — | P2 | S | D | ⬜ |
| FE-PRECISION-005 | STK-001 | BR-006 | — | P2 | C | D | ⬜ |
| FE-MEASURE-001 | STK-001 | BR-004 | NFR-COMPAT-002 | P2 | M | D | ⬜ |
| FE-MEASURE-002 | STK-001 | BR-004 | NFR-COMPAT-002 | P2 | M | D | ⬜ |
| FE-MEASURE-003 | STK-001 | BR-004 | — | P2 | M | D | ⬜ |
| FE-MEASURE-004 | STK-001 | BR-004 | — | P2 | C | D | ⬜ |
| FE-LAYER-001 | STK-002 | BR-002 | — | P2 | M | D | ⬜ |
| FE-LAYER-002 | STK-002 | BR-002 | — | P2 | M | D | ⬜ |
| FE-LAYER-003 | STK-002 | BR-002 | — | P2 | S | D | ⬜ |
| FE-LAYER-004 | STK-002 | BR-002 | — | P2 | S | D | ⬜ |
| FE-LAYER-005 | STK-002 | BR-002 | — | P2 | M | D | ⬜ |
| FE-STYLE-001 | STK-002 | BR-002 | NFR-A11Y-003 | P2 | M | D | ⬜ |
| FE-STYLE-002 | STK-002 | BR-002 | NFR-A11Y-003 | P2 | S | D | ⬜ |
| FE-STYLE-003 | STK-002 | BR-002 | — | P2 | S | D | ⬜ |
| FE-METRIC-001 | STK-002, STK-004 | BR-008 | NFR-PERF-002 | P2 | M | D | ⬜ |
| FE-METRIC-002 | STK-002 | BR-008 | NFR-PERF-002 | P2 | M | T | ⬜ |
| FE-METRIC-003 | STK-004 | BR-008 | — | P2 | S | D | ⬜ |
| FE-METRIC-004 | STK-002 | BR-008 | NFR-A11Y-003 | P5 | S | D | ⬜ |
| FE-NAV-001 | STK-005 | BR-001 | NFR-PERF-001 | P2 | M | D | ⬜ |
| FE-NAV-002 | STK-001 | BR-004 | — | P2 | M | D | ⬜ |
| FE-NAV-003 | STK-002 | BR-001 | NFR-LEGAL-002 | P3 | C | D | ⬜ |
| FE-NAV-004 | STK-005 | BR-001 | — | P2 | S | D | ⬜ |
| FE-SELECT-001 | STK-001 | BR-006 | — | P2 | M | D | ⬜ |
| FE-SELECT-002 | STK-001 | BR-006 | — | P2 | M | D | ⬜ |
| FE-SELECT-003 | STK-002 | BR-002 | — | P2 | M | D | ⬜ |
| FE-SELECT-004 | STK-001 | BR-006 | NFR-USE-002 | P2 | M | D | ⬜ |
| FE-PROJECT-001 | STK-006 | BR-007 | — | P2 | M | D | ⬜ |
| FE-PROJECT-002 | STK-001, STK-003 | CON-002 | NFR-REL-001 | P2 | M | T | ⬜ |
| FE-PROJECT-003 | STK-003 | BR-007 | NFR-REL-004 | P2 | S | D | ⬜ |
| FE-PROJECT-004 | STK-003 | BR-007 | — | P4 | S | D | ⬜ |
| FE-REVIEW-001 | STK-003, STK-005 | BR-003 | NFR-USE-001 | P4 | M | D | ⬜ |
| FE-REVIEW-002 | STK-003 | BR-003 | — | P4 | M | D | ⬜ |
| FE-REVIEW-003 | STK-003 | BR-003 | — | P4 | S | D | ⬜ |
| FE-REVIEW-004 | STK-003 | BR-003 | — | P4 | S | D | ⬜ |
| FE-REVIEW-005 | STK-005 | BR-009 | NFR-A11Y-004 | P4 | S | D | ⬜ |
| FE-PRESENCE-001 | STK-003 | BR-003 | NFR-PERF-003 | P4 | M | D | ⬜ |
| FE-PRESENCE-002 | STK-003 | BR-003 | NFR-PERF-003, NFR-REL-002 | P4 | M | T | ⬜ |
| FE-PRESENCE-003 | STK-003 | BR-003 | — | P4 | S | D | ⬜ |
| FE-PRESENCE-004 | STK-003 | BR-003 | — | P4 | C | D | ⬜ |
| FE-IO-001 | STK-001, STK-007 | BR-005 | NFR-COMPAT-004 | P3 | M | D | ⬜ |
| FE-IO-002 | STK-004, STK-007 | BR-005 | — | P3 | M | D | ⬜ |
| FE-IO-003 | STK-001 | BR-005 | — | P3 | S | D | ⬜ |
| FE-IO-004 | STK-007 | BR-005 | NFR-OBS-002 | P3 | M | D | ⬜ |
| FE-ACCOUNT-001 | STK-006 | BR-007 | NFR-SEC-002 | P2 | M | D | ⬜ |
| FE-ACCOUNT-002 | STK-006 | BR-009 | — | P2 | S | D | ⬜ |
| FE-ACCOUNT-003 | STK-006 | BR-007 | NFR-PRIV-002 | P4 | M | D | ⬜ |
| FE-ACCOUNT-004 | STK-006 | BR-009 | — | P4 | S | D | ⬜ |

### C.2 Backend — modules `services/*` · source [backend-requirements.md](../02-functional/backend-requirements.md)

| Req | Module | ↑ Stakeholder | ↑ Business / Constraint | NFR | Phase | Pri | V | Status |
| --- | --- | --- | --- | --- | :--: | :--: | :--: | :--: |
| BE-AUTH-001 | auth | STK-006 | BR-007 | NFR-SEC-002 | P2 | M | T | ⬜ |
| BE-AUTH-002 | auth | STK-006 | BR-007 | NFR-SEC-002, NFR-SEC-005 | P2 | M | T | ⬜ |
| BE-AUTH-003 | auth | STK-006 | BR-009 | — | P2 | M | T | ⬜ |
| BE-AUTH-004 | auth | STK-006 | BR-009 | — | P2 | M | T | ⬜ |
| BE-ACCESS-001 | auth | STK-006 | BR-007 | NFR-SEC-003 | P2 | M | T | ⬜ |
| BE-ACCESS-002 | auth | STK-003, STK-006 | BR-007 | NFR-PRIV-001 | P4 | M | T | ⬜ |
| BE-ACCESS-003 | auth | STK-005 | BR-009 | NFR-PRIV-002 | P4 | S | T | ⬜ |
| BE-ACCESS-004 | auth | STK-006 | BR-007 | — | P4 | S | T | ⬜ |
| BE-ACCESS-005 | auth | STK-006 | BR-007 | NFR-SEC-001 | P4 | S | T | ⬜ |
| BE-PROJECT-001 | projects | STK-006 | BR-007 | — | P2 | M | T | ⬜ |
| BE-PROJECT-002 | projects | STK-001 | CON-002 | NFR-REL-001 | P2 | M | T | ⬜ |
| BE-PROJECT-003 | projects | STK-006 | BR-007 | NFR-PRIV-001 | P2 | M | T | ⬜ |
| BE-PROJECT-004 | projects | STK-003 | BR-003 | NFR-REL-001 | P2 | M | T | ⬜ |
| BE-VERSION-001 | projects | STK-003 | BR-007 | — | P4 | M | T | ⬜ |
| BE-VERSION-002 | projects | STK-003 | BR-007 | NFR-REL-004 | P2 | M | T | ⬜ |
| BE-VERSION-003 | projects | STK-003 | BR-007 | NFR-REL-004 | P2 | M | T | ⬜ |
| BE-VERSION-004 | projects | STK-003 | BR-007 | — | P4 | S | T | ⬜ |
| BE-GEO-001 | geospatial | STK-001 | BR-004 | NFR-COMPAT-001 | P3 | M | T | ⬜ |
| BE-GEO-002 | geospatial | STK-002 | BR-004 | — | P3 | M | T | ⬜ |
| BE-GEO-003 | geospatial | STK-002 | BR-008 | — | P3 | S | T | ⬜ |
| BE-GEO-004 | geospatial | STK-001 | BR-004 | NFR-COMPAT-002 | P3 | M | T | ⬜ |
| BE-IMPORT-001 | geospatial | STK-001, STK-007 | BR-005 | NFR-COMPAT-001 | P3 | M | T | ⬜ |
| BE-IMPORT-002 | geospatial | STK-001 | BR-004 | NFR-COMPAT-004 | P3 | M | T | ⬜ |
| BE-IMPORT-003 | geospatial | STK-007 | BR-005 | NFR-REL-003 | P3 | M | T | ⬜ |
| BE-EXPORT-001 | geospatial | STK-004, STK-007 | BR-005 | NFR-COMPAT-001 | P3 | M | T | ⬜ |
| BE-EXPORT-002 | geospatial | STK-004 | BR-005 | — | P3 | S | T | ⬜ |
| BE-EXPORT-003 | geospatial | STK-004 | BR-005 | — | P3 | S | D | ⬜ |
| BE-COLLAB-001 | collaboration | STK-003 | BR-003 | NFR-PERF-003 | P4 | M | T | ⬜ |
| BE-COLLAB-002 | collaboration | STK-003 | BR-003 | NFR-REL-002 | P4 | M | T | ⬜ |
| BE-COLLAB-003 | collaboration | STK-003 | BR-003 | — | P4 | M | T | ⬜ |
| BE-COLLAB-004 | collaboration | STK-003 | BR-003 | — | P4 | C | T | ⬜ |
| BE-COMMENT-001 | collaboration | STK-003 | BR-003 | — | P4 | M | T | ⬜ |
| BE-COMMENT-002 | collaboration | STK-003 | BR-003 | — | P4 | M | T | ⬜ |
| BE-COMMENT-003 | collaboration | STK-003 | BR-003 | — | P4 | S | T | ⬜ |
| BE-AUDIT-001 | projects | STK-003, STK-006 | BR-007 | — | P4 | S | T | ⬜ |
| BE-AUDIT-002 | projects | STK-006 | BR-007 | — | P4 | S | T | ⬜ |
| BE-AUDIT-003 | projects | STK-003 | BR-007 | NFR-SEC-001 | P4 | C | A | ⬜ |
| BE-API-001 | all | STK-007 | BR-010 | — | P3 | S | I | ⬜ |
| BE-API-002 | all | STK-007 | BR-010 | NFR-SEC-002, NFR-SEC-003 | P3 | M | T | ⬜ |
| BE-API-003 | all | STK-007 | BR-010 | NFR-MAINT-001 | P3 | S | I | ⬜ |
| BE-API-004 | all | STK-007 | BR-005 | — | P3 | S | T | ⬜ |

### C.3 Domain model — module `packages/domain` · source [domain-requirements.md](../02-functional/domain-requirements.md)

| Req | ↑ Stakeholder | ↑ Business / Constraint | NFR | Phase | Pri | V | Status |
| --- | --- | --- | --- | :--: | :--: | :--: | :--: |
| DOM-CRS-001 | STK-001 | BR-004, CON-004 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-CRS-002 | STK-001 | BR-004 | NFR-COMPAT-004 | P1 | M | T | ⬜ |
| DOM-CRS-003 | STK-001 | BR-004 | NFR-COMPAT-001 | P1 | M | T | ⬜ |
| DOM-CRS-004 | STK-001 | BR-004 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-UNIT-001 | STK-001 | BR-004, CON-004 | — | P1 | M | T | ⬜ |
| DOM-UNIT-002 | STK-001 | BR-004 | — | P1 | M | T | ⬜ |
| DOM-UNIT-003 | STK-001 | BR-004 | — | P1 | M | T | ⬜ |
| DOM-GEOM-001 | STK-001 | BR-002 | NFR-COMPAT-003 | P1 | M | T | ⬜ |
| DOM-GEOM-002 | STK-001 | BR-004 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-GEOM-003 | STK-001 | BR-004 | NFR-REL-003 | P1 | M | T | ⬜ |
| DOM-GEOM-004 | STK-002 | BR-008 | — | P1 | S | T | ⬜ |
| DOM-GEOM-005 | STK-001 | BR-002 | — | P2 | S | T | ⬜ |
| DOM-LAYER-001 | STK-002 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-LAYER-002 | STK-002 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-LAYER-003 | STK-002 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-SITE-001 | STK-002 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-SITE-002 | STK-001 | BR-004, CON-004 | — | P1 | M | T | ⬜ |
| DOM-PARCEL-001 | STK-001 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-PARCEL-002 | STK-001 | BR-008 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-PARCEL-003 | STK-001 | BR-002 | — | P1 | S | T | ⬜ |
| DOM-PARCEL-004 | STK-001 | BR-002 | NFR-REL-003 | P2 | S | T | ⬜ |
| DOM-LOT-001 | STK-001 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-LOT-002 | STK-001 | BR-008 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-LOT-003 | STK-001 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-ZONE-001 | STK-002 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-ZONE-002 | STK-002 | BR-008 | — | P1 | M | T | ⬜ |
| DOM-ZONE-003 | STK-002 | BR-002 | — | P1 | S | T | ⬜ |
| DOM-LANDUSE-001 | STK-002 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-LANDUSE-002 | STK-002 | BR-008 | — | P1 | M | T | ⬜ |
| DOM-LANDUSE-003 | STK-002 | BR-002 | — | P1 | S | T | ⬜ |
| DOM-ROW-001 | STK-001 | BR-002 | — | P1 | S | T | ⬜ |
| DOM-ROW-002 | STK-001 | BR-002 | — | P2 | S | T | ⬜ |
| DOM-ROW-003 | STK-001 | BR-002 | — | P2 | S | T | ⬜ |
| DOM-SETBACK-001 | STK-004 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-SETBACK-002 | STK-004 | BR-002 | — | P2 | S | T | ⬜ |
| DOM-SETBACK-003 | STK-004 | BR-008 | NFR-COMPAT-002 | P2 | M | T | ⬜ |
| DOM-SETBACK-004 | STK-004 | BR-008 | — | P5 | C | T | ⬜ |
| DOM-ENVELOPE-001 | STK-004 | BR-008 | — | P5 | S | T | ⬜ |
| DOM-ENVELOPE-002 | STK-004 | BR-008 | — | P5 | S | T | ⬜ |
| DOM-ENVELOPE-003 | STK-004 | BR-008 | — | P5 | W | T | ⬜ |
| DOM-INFRA-001 | STK-001 | BR-002 | — | P5 | C | T | ⬜ |
| DOM-INFRA-002 | STK-001 | BR-002 | — | P5 | C | T | ⬜ |
| DOM-SUBDIV-001 | STK-001 | BR-002 | — | P1 | M | T | ⬜ |
| DOM-SUBDIV-002 | STK-001 | BR-008 | NFR-REL-003 | P2 | S | T | ⬜ |
| DOM-SUBDIV-003 | STK-004 | BR-008 | — | P2 | S | T | ⬜ |
| DOM-METRIC-001 | STK-002 | BR-008 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-METRIC-002 | STK-002 | BR-008 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-METRIC-003 | STK-004 | BR-008 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-METRIC-004 | STK-002 | BR-008 | — | P1 | M | T | ⬜ |
| DOM-METRIC-005 | STK-002 | BR-008 | NFR-COMPAT-002 | P1 | S | T | ⬜ |
| DOM-METRIC-006 | STK-001 | BR-004 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-COMPLY-001 | STK-002 | BR-008 | — | P5 | S | T | ⬜ |
| DOM-COMPLY-002 | STK-002 | BR-008 | — | P5 | S | T | ⬜ |
| DOM-COMPLY-003 | STK-002 | BR-008 | — | P5 | S | T | ⬜ |
| DOM-COMPLY-004 | STK-002 | BR-008 | — | P5 | S | T | ⬜ |

### C.4 Interoperability — module `services/geospatial` + `apps/web` · source [interoperability-requirements.md](../02-functional/interoperability-requirements.md)

| Req | ↑ Stakeholder | ↑ Business / Constraint | NFR | Phase | Pri | V | Status |
| --- | --- | --- | --- | :--: | :--: | :--: | :--: |
| IOP-GEOJSON-001 | STK-001, STK-007 | BR-005 | NFR-COMPAT-001 | P3 | M | T | ⬜ |
| IOP-GEOJSON-002 | STK-007 | BR-005 | NFR-COMPAT-001 | P3 | M | T | ⬜ |
| IOP-GEOJSON-003 | STK-001 | BR-004 | NFR-COMPAT-002 | P3 | M | T | ⬜ |
| IOP-KML-001 | STK-005 | BR-005 | — | P3 | S | T | ⬜ |
| IOP-KML-002 | STK-005 | BR-005 | — | P3 | S | T | ⬜ |
| IOP-SHP-001 | STK-001 | BR-005 | NFR-COMPAT-001 | P3 | M | T | ⬜ |
| IOP-SHP-002 | STK-001 | BR-004 | NFR-COMPAT-004 | P3 | M | T | ⬜ |
| IOP-SHP-003 | STK-007 | BR-005 | — | P3 | S | T | ⬜ |
| IOP-DXF-001 | STK-001, STK-004 | BR-005 | — | P3 | M | T | ⬜ |
| IOP-DXF-002 | STK-001 | BR-005 | — | P3 | S | T | ⬜ |
| IOP-DXF-003 | STK-001 | BR-004 | NFR-COMPAT-004 | P3 | M | D | ⬜ |
| IOP-DXF-004 | STK-004 | BR-005 | — | P3 | S | T | ⬜ |
| IOP-GPKG-001 | STK-007 | BR-005 | — | P3 | C | T | ⬜ |
| IOP-GPKG-002 | STK-007 | BR-005 | — | P3 | C | T | ⬜ |
| IOP-PDF-001 | STK-004, STK-005 | BR-005 | — | P3 | S | D | ⬜ |
| IOP-PDF-002 | STK-004 | BR-008 | — | P3 | C | D | ⬜ |
| IOP-CSV-001 | STK-007 | BR-005 | — | P3 | C | T | ⬜ |
| IOP-CSV-002 | STK-004 | BR-005 | — | P3 | C | T | ⬜ |
| IOP-CRSX-001 | STK-001 | BR-004 | NFR-COMPAT-004 | P3 | M | T | ⬜ |
| IOP-CRSX-002 | STK-001 | BR-004 | NFR-COMPAT-001 | P3 | M | T | ⬜ |
| IOP-CRSX-003 | STK-001 | BR-004 | NFR-COMPAT-002 | P3 | S | D | ⬜ |

---

## Matrix D — Non-functional → constrained scope

Every NFR names the requirements/modules it constrains (rule `R5`).
Source: [non-functional requirements](../03-nonfunctional/nonfunctional-requirements.md).

| NFR category | Constrains (areas/modules) |
| --- | --- |
| NFR-PERF | FE-CANVAS, FE-NAV, FE-METRIC, DOM-METRIC, BE-COLLAB, FE-PRESENCE, FE-PROJECT, BE-IMPORT |
| NFR-SCALE | BE-COLLAB, BE-PROJECT, BE-GEO, services/* |
| NFR-SEC | BE-* (all services), BE-API, BE-AUTH, BE-ACCESS |
| NFR-PRIV | BE-ACCESS, BE-AUTH |
| NFR-A11Y | FE-* (all client), FE-STYLE, FE-METRIC, FE-REVIEW |
| NFR-USE | FE-REVIEW, FE-NAV, FE-CANVAS, FE-SELECT, apps/web |
| NFR-REL | BE-PROJECT, BE-COLLAB, BE-IMPORT, BE-EXPORT, BE-VERSION |
| NFR-COMPAT | DOM-METRIC, DOM-GEOM, BE-GEO, IOP-*, packages/domain |
| NFR-MAINT | all code, packages/domain, monorepo, docs/ |
| NFR-OBS | services/*, FE-IO |
| NFR-PORT | services/* |
| NFR-LEGAL | repo, FE-NAV, IOP-* |

---

## Matrix E — Phase coverage (roadmap alignment)

Requirement counts by roadmap [phase](../../ROADMAP.md). Confirms the domain
model (P1) leads and later phases build on it (`BR-011`, `CON-010`).

| Phase | Focus | FE | BE | DOM | IOP | Total |
| --- | --- | :--: | :--: | :--: | :--: | :--: |
| **P1** | Domain model foundation | 0 | 0 | 37 | 0 | 37 |
| **P2** | Single-player cloud workspace | 40 | 11 | 8 | 0 | 59 |
| **P3** | Interoperability | 5 | 14 | 0 | 21 | 40 |
| **P4** | Collaboration & review | 12 | 16 | 0 | 0 | 28 |
| **P5** | Analysis & planning depth | 1 | 0 | 10 | 0 | 11 |
| | **Totals** | **58** | **41** | **55** | **21** | **175** |

> The authoritative phase for each requirement is the Phase column in Matrix C;
> the table above is computed from it. NFRs (42) are cross-cutting and phased with
> the areas they constrain.

## Matrix F — Module coverage

Confirms every functional requirement maps to exactly one architecture module
(rule `R3`) and every module is exercised.

| Architecture module | Requirement areas | Count |
| --- | --- | :--: |
| `apps/web` | FE-CANVAS, PRECISION, MEASURE, LAYER, STYLE, METRIC, NAV, SELECT, PROJECT, REVIEW, PRESENCE, IO, ACCOUNT | 58 |
| `services/auth` | BE-AUTH, BE-ACCESS | 9 |
| `services/projects` | BE-PROJECT, BE-VERSION, BE-AUDIT | 11 |
| `services/geospatial` | BE-GEO, BE-IMPORT, BE-EXPORT, IOP-* | 31 |
| `services/collaboration` | BE-COLLAB, BE-COMMENT | 7 |
| `packages/domain` | DOM-* | 55 |
| all services | BE-API | 4 |

> Sum = 175 functional requirements (`apps/web` 58 + backend services 58 +
> `packages/domain` 55 + interop is counted inside `services/geospatial`).

## Verification method summary

| Method | Count (functional) | Typical requirements |
| --- | :--: | --- |
| **T** Test | 114 | Domain rules/metrics, service behavior, format round-trips |
| **D** Demonstration | 58 | Canvas/UI interactions, wizards, exhibits |
| **I** Inspection | 2 | API docs, versioned contracts |
| **A** Analysis | 1 | Audit immutability |

> Functional total 175. NFRs add further I/A-heavy verification (e.g. ASVS,
> WCAG conformance by inspection; performance by analysis), counted in the
> [non-functional requirements](../03-nonfunctional/nonfunctional-requirements.md).

> Verification **evidence** (test-case IDs `TC-…`) attaches here once a test suite
> exists; today the matrix specifies the method, per the
> [conventions](../00-overview/standards-and-conventions.md#verification-methods).
