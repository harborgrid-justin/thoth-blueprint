# Requirements Traceability Matrix (RTM)

> **Generated file.** Matrix C and the roll-ups below are produced by
> [`_meta/scripts/gen_rtm.py`](../_meta/scripts/gen_rtm.py) from the `Trace`
> columns of the requirement source files — the source files are authoritative.
> Re-run the generator after editing any requirement; do not hand-edit Matrix C.

This is the spine of the suite: it realizes **bidirectional traceability** across
the chain defined in
[standards & conventions](../00-overview/standards-and-conventions.md#traceability-model):

```
BR ─▶ STK ─▶ {FE, BE, DOM, IOP} ─▶ Phase · Module · Verification
                    ▲
              NFR (cross-cutting constraints)
```

Read it **down** (a business goal → the features that deliver it) or **up** (a
requirement → why it exists). The [coverage report](coverage-report.md) validates
the matrix against coverage rules `R1`–`R5`.

**Legend.** Priority: **M** Must · **S** Should · **C** Could · **W** Won't-yet.
Verify: **T** Test · **D** Demonstration · **I** Inspection · **A** Analysis.
Status: ⬜ Planned (specified, not yet built) · 🟡 In progress · ✅ Done. The
repository is currently scaffold ([ROADMAP](../../ROADMAP.md) Phase 0), so every
requirement is **⬜ Planned**; this column becomes the live build tracker.

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
| [`BR-005`](../01-business/business-requirements.md) Interoperability | STK-001, STK-004, STK-007, STK-008 |
| [`BR-006`](../01-business/business-requirements.md) CAD-grade precision | STK-001, STK-004, STK-008 |
| [`BR-007`](../01-business/business-requirements.md) Governed & auditable | STK-003, STK-005, STK-006, STK-008 |
| [`BR-008`](../01-business/business-requirements.md) Planning intelligence | STK-001, STK-002, STK-004 |
| [`BR-009`](../01-business/business-requirements.md) Full stakeholder spectrum | STK-001 – STK-008 |
| [`BR-010`](../01-business/business-requirements.md) Open & self-hostable | STK-007 |
| [`BR-011`](../01-business/business-requirements.md) Incremental, domain-first | all (via Phase) |
| [`BR-012`](../01-business/business-requirements.md) Architecture & engineering CAD sheets | STK-004, STK-008 |

## Matrix B — Stakeholder → functional areas & module

A non-exhaustive digest of each stakeholder's principal functional areas (rule
`R2`). The authoritative, complete stakeholder trace for every requirement is the
↑ Stakeholder column of [Matrix C](#matrix-c--master-requirement-traceability).
Source: [stakeholders](../01-business/stakeholders.md).

| Stakeholder | Frontend | Backend | Domain | Interop |
| --- | --- | --- | --- | --- |
| STK-001 Site planner | CANVAS, PRECISION, MEASURE, PREFS | GEO, IMPORT, JOB | CRS, UNIT, GEOM, PARCEL, LOT, SURVEY, SUBDIV, METRIC | DXF, GEOJSON, SHP, RASTER |
| STK-002 Urban planner | STYLE, METRIC, LAYER, FIND, SCENARIO | GEO | ZONE, LANDUSE, BLOCK, METRIC, COMPLY, SCENARIO | — |
| STK-003 Reviewer | REVIEW, PROJECT, NOTIFY | COMMENT, VERSION, AUDIT, ACCESS, NOTIFY | IDENT, SNAPSHOT | — |
| STK-004 Developer | CANVAS, METRIC, PRINT | EXPORT, JOB | SETBACK, BUILDING, ENVELOPE, PARKING, METRIC | PDF, DXF |
| STK-005 Community | REVIEW, NAV, HELP | ACCESS | — | PDF |
| STK-006 Org admin | ACCOUNT, STATE | AUTH, ACCESS, AUDIT, SEARCH, STORAGE | — | — |
| STK-007 Integrator | IO | API, IMPORT, EXPORT, JOB, WEBHOOK | SERIAL | GEOJSON, SHP, GPKG, CSV, FIELD, SCHEMA |
| STK-008 Architect / engineer / CAD manager | SHEET, VIEWPORT, TITLE, PLOT, ANNO, SYMBOL, GRIDLINE, MATCHLINE, SCHEDULE, REV, SHEETSET | SHEET, TEMPLATE, PLOT, SCHEDULE, PACKAGE | SHEET, TITLEBLOCK, SHEETSET, DISCIPLINE, NUMBERING, LAYERSTD, PLOTSTYLE, SYMBOL, DIM, ANNO, GRID, MATCHLINE, SCHEDULE, REV, ISSUE, XREF | DXFSHEET, PDFSHEET, PLTSTYLE, LAYERMAP, TITLEBLOCK, BLOCK |

---

## Matrix C — Master requirement traceability

One row per requirement, generated from the source files. Requirement text lives
in the linked sources; this matrix carries the trace links.

### C.1 Frontend — module `apps/web` · source [frontend-requirements.md](../02-functional/frontend-requirements.md)

| Req | ↑ Stakeholder | ↑ Business / Constraint / NFR | Phase | Pri | V | Status |
| --- | --- | --- | :--: | :--: | :--: | :--: |
| FE-CANVAS-001 | STK-001, STK-002 | BR-002 | P2 | M | D | ⬜ |
| FE-CANVAS-002 | STK-001 | BR-002 | P2 | M | D | ⬜ |
| FE-CANVAS-003 | STK-001 | BR-002 | P2 | S | D | ⬜ |
| FE-CANVAS-004 | STK-001 | BR-002 | P2 | M | D | ⬜ |
| FE-CANVAS-005 | STK-002 | BR-002 | P2 | M | T | ⬜ |
| FE-CANVAS-006 | STK-001 | BR-002 | P2 | S | D | ⬜ |
| FE-CANVAS-007 | STK-001 | BR-002 | P2 | S | D | ⬜ |
| FE-CANVAS-008 | STK-001 | BR-006 | P2 | M | T | ⬜ |
| FE-CANVAS-009 | STK-002 | BR-002 | P2 | S | D | ⬜ |
| FE-CANVAS-010 | STK-003 | BR-003 | P3 | C | D | ⬜ |
| FE-CANVAS-011 | STK-004 | BR-008 | P2 | M | D | ⬜ |
| FE-CANVAS-012 | STK-001 | BR-002 | P2 | S | D | ⬜ |
| FE-PRECISION-001 | STK-001 | BR-006 | P2 | M | D | ⬜ |
| FE-PRECISION-002 | STK-001 | BR-006 | P2 | M | D | ⬜ |
| FE-PRECISION-003 | STK-001 | BR-006 | P2 | S | D | ⬜ |
| FE-PRECISION-004 | STK-001 | BR-006 | P2 | S | D | ⬜ |
| FE-PRECISION-005 | STK-001 | BR-006 | P2 | C | D | ⬜ |
| FE-PRECISION-006 | STK-001 | BR-006 | P2 | S | D | ⬜ |
| FE-PRECISION-007 | STK-001 | BR-006 | P2 | S | D | ⬜ |
| FE-MEASURE-001 | STK-001 | BR-004 | P2 | M | D | ⬜ |
| FE-MEASURE-002 | STK-001 | BR-004 | P2 | M | D | ⬜ |
| FE-MEASURE-003 | STK-001 | BR-004 | P2 | M | D | ⬜ |
| FE-MEASURE-004 | STK-001 | BR-004 | P2 | C | D | ⬜ |
| FE-MEASURE-005 | STK-001 | BR-004 | P2 | S | D | ⬜ |
| FE-LAYER-001 | STK-002 | BR-002 | P2 | M | D | ⬜ |
| FE-LAYER-002 | STK-002 | BR-002 | P2 | M | D | ⬜ |
| FE-LAYER-003 | STK-002 | BR-002 | P2 | S | D | ⬜ |
| FE-LAYER-004 | STK-002 | BR-002 | P2 | S | D | ⬜ |
| FE-LAYER-005 | STK-002 | BR-002 | P2 | M | D | ⬜ |
| FE-STYLE-001 | STK-002 | BR-002 | P2 | M | D | ⬜ |
| FE-STYLE-002 | STK-002 | BR-002 | P2 | S | D | ⬜ |
| FE-STYLE-003 | STK-002 | BR-002 | P2 | S | D | ⬜ |
| FE-METRIC-001 | STK-002, STK-004 | BR-008 | P2 | M | D | ⬜ |
| FE-METRIC-002 | STK-002 | BR-008 | P2 | M | T | ⬜ |
| FE-METRIC-003 | STK-004 | BR-008 | P2 | S | D | ⬜ |
| FE-METRIC-004 | STK-002 | BR-008 | P5 | S | D | ⬜ |
| FE-NAV-001 | STK-005 | BR-001 | P2 | M | D | ⬜ |
| FE-NAV-002 | STK-001 | BR-004 | P2 | M | D | ⬜ |
| FE-NAV-003 | STK-002 | BR-001 | P3 | C | D | ⬜ |
| FE-NAV-004 | STK-005 | BR-001 | P2 | S | D | ⬜ |
| FE-NAV-005 | STK-001 | BR-005 | P3 | S | D | ⬜ |
| FE-NAV-006 | STK-002 | BR-001 | P2 | C | D | ⬜ |
| FE-NAV-007 | STK-001 | BR-004 | P2 | S | D | ⬜ |
| FE-NAV-008 | STK-005 | BR-001 | P2 | C | D | ⬜ |
| FE-SELECT-001 | STK-001 | BR-006 | P2 | M | D | ⬜ |
| FE-SELECT-002 | STK-001 | BR-006 | P2 | M | D | ⬜ |
| FE-SELECT-003 | STK-002 | BR-002 | P2 | M | D | ⬜ |
| FE-SELECT-004 | STK-001 | BR-006 | P2 | M | D | ⬜ |
| FE-SELECT-005 | STK-002 | BR-002 | P2 | S | D | ⬜ |
| FE-EDIT-001 | STK-001 | BR-006 | P2 | M | T | ⬜ |
| FE-EDIT-002 | STK-001 | BR-006 | P2 | M | D | ⬜ |
| FE-EDIT-003 | STK-001 | BR-002 | P2 | S | D | ⬜ |
| FE-EDIT-004 | STK-001 | BR-006 | P2 | C | D | ⬜ |
| FE-FIND-001 | STK-002 | BR-002 | P2 | S | D | ⬜ |
| FE-FIND-002 | STK-002 | BR-002 | P2 | S | D | ⬜ |
| FE-FIND-003 | STK-002 | BR-002 | P2 | C | D | ⬜ |
| FE-CMD-001 | STK-001 | BR-006 | P2 | S | D | ⬜ |
| FE-CMD-002 | STK-001 | BR-001 | P2 | C | D | ⬜ |
| FE-CMD-003 | STK-005 | NFR-A11Y-002 | P2 | S | T | ⬜ |
| FE-CMD-004 | STK-001 | NFR-USE-001 | P2 | C | D | ⬜ |
| FE-NOTIFY-001 | STK-003 | BR-003 | P4 | S | D | ⬜ |
| FE-NOTIFY-002 | STK-003 | BR-003 | P4 | C | D | ⬜ |
| FE-NOTIFY-003 | STK-003 | BR-007 | P4 | S | D | ⬜ |
| FE-HELP-001 | STK-005, STK-006 | BR-009 | P2 | S | D | ⬜ |
| FE-HELP-002 | STK-005 | BR-009 | P2 | C | D | ⬜ |
| FE-HELP-003 | STK-005 | NFR-USE-004 | P2 | C | D | ⬜ |
| FE-STATE-001 | STK-003 | CON-002 | P2 | M | D | ⬜ |
| FE-STATE-002 | STK-006 | NFR-USE-001 | P2 | S | D | ⬜ |
| FE-STATE-003 | STK-006 | NFR-OBS-002 | P2 | M | D | ⬜ |
| FE-STATE-004 | STK-003 | CON-002 | P4 | M | D | ⬜ |
| FE-STATE-005 | STK-003 | BR-003 | P4 | S | T | ⬜ |
| FE-STATE-006 | STK-003 | CON-002 | P2 | S | D | ⬜ |
| FE-PREFS-001 | STK-001 | BR-004 | P2 | M | D | ⬜ |
| FE-PREFS-002 | STK-001 | BR-004 | P2 | S | D | ⬜ |
| FE-PREFS-003 | STK-001 | BR-004 | P2 | C | D | ⬜ |
| FE-PREFS-004 | STK-001 | BR-004 | P2 | C | D | ⬜ |
| FE-PREFS-005 | STK-005 | NFR-A11Y-001 | P2 | S | D | ⬜ |
| FE-PRINT-001 | STK-004 | BR-005 | P3 | S | D | ⬜ |
| FE-PRINT-002 | STK-004 | BR-005 | P3 | C | D | ⬜ |
| FE-PRINT-003 | STK-005 | BR-009 | P4 | C | D | ⬜ |
| FE-PROJECT-001 | STK-006 | BR-007 | P2 | M | D | ⬜ |
| FE-PROJECT-002 | STK-001, STK-003 | CON-002 | P2 | M | T | ⬜ |
| FE-PROJECT-003 | STK-003 | BR-007 | P2 | S | D | ⬜ |
| FE-PROJECT-004 | STK-003 | BR-007 | P4 | S | D | ⬜ |
| FE-PROJECT-005 | STK-001 | BR-004, CON-004 | P2 | M | D | ⬜ |
| FE-PROJECT-006 | STK-006 | BR-007 | P2 | S | D | ⬜ |
| FE-PROJECT-007 | STK-006 | BR-007 | P2 | S | D | ⬜ |
| FE-REVIEW-001 | STK-003, STK-005 | BR-003 | P4 | M | D | ⬜ |
| FE-REVIEW-002 | STK-003 | BR-003 | P4 | M | D | ⬜ |
| FE-REVIEW-003 | STK-003 | BR-003 | P4 | S | D | ⬜ |
| FE-REVIEW-004 | STK-003 | BR-003 | P4 | S | D | ⬜ |
| FE-REVIEW-005 | STK-005 | BR-009 | P4 | S | D | ⬜ |
| FE-PRESENCE-001 | STK-003 | BR-003 | P4 | M | D | ⬜ |
| FE-PRESENCE-002 | STK-003 | BR-003 | P4 | M | T | ⬜ |
| FE-PRESENCE-003 | STK-003 | BR-003 | P4 | S | D | ⬜ |
| FE-PRESENCE-004 | STK-003 | BR-003 | P4 | C | D | ⬜ |
| FE-SCENARIO-001 | STK-002 | BR-001 | P5 | S | D | ⬜ |
| FE-SCENARIO-002 | STK-002 | BR-008 | P5 | S | D | ⬜ |
| FE-SCENARIO-003 | STK-002, STK-004 | BR-008 | P5 | S | D | ⬜ |
| FE-IO-001 | STK-001, STK-007 | BR-005 | P3 | M | D | ⬜ |
| FE-IO-002 | STK-004, STK-007 | BR-005 | P3 | M | D | ⬜ |
| FE-IO-003 | STK-001 | BR-005 | P3 | S | D | ⬜ |
| FE-IO-004 | STK-007 | NFR-OBS-002 | P3 | M | D | ⬜ |
| FE-ACCOUNT-001 | STK-006 | NFR-SEC-002 | P2 | M | D | ⬜ |
| FE-ACCOUNT-002 | STK-006 | BR-009 | P2 | S | D | ⬜ |
| FE-ACCOUNT-003 | STK-006 | BR-007 | P4 | M | D | ⬜ |
| FE-ACCOUNT-004 | STK-006 | BR-009 | P4 | S | D | ⬜ |
| FE-ACCOUNT-005 | STK-006 | BR-007 | P4 | S | D | ⬜ |
| FE-SHEET-001 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-SHEET-002 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-SHEET-003 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-SHEET-004 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-SHEET-005 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-SHEET-006 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-SHEET-007 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-SHEET-008 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| FE-VIEWPORT-001 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-VIEWPORT-002 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-VIEWPORT-003 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-VIEWPORT-004 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-VIEWPORT-005 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-VIEWPORT-006 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-VIEWPORT-007 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-VIEWPORT-008 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-VIEWPORT-009 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-TITLE-001 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-TITLE-002 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-TITLE-003 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| FE-TITLE-004 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-TITLE-005 | STK-008 | BR-012 | P6 | C | D | ⬜ |
| FE-PLOT-001 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-PLOT-002 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-PLOT-003 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-PLOT-004 | STK-008 | NFR-PLOT-001 | P6 | M | D | ⬜ |
| FE-PLOT-005 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-PLOT-006 | STK-008 | BR-012, DEP-005, DEP-006 | P6 | M | D | ⬜ |
| FE-PLOT-007 | STK-008, STK-007 | NFR-OBS-002 | P6 | M | D | ⬜ |
| FE-ANNO-001 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-ANNO-002 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-ANNO-003 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| FE-ANNO-004 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-ANNO-005 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| FE-ANNO-006 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-ANNO-007 | STK-008 | NFR-PLOT-002 | P6 | S | D | ⬜ |
| FE-SYMBOL-001 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-SYMBOL-002 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-SYMBOL-003 | STK-008 | BR-012, DEP-006 | P6 | S | D | ⬜ |
| FE-SYMBOL-004 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-SYMBOL-005 | STK-008, STK-006 | BR-012 | P6 | C | D | ⬜ |
| FE-GRIDLINE-001 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-GRIDLINE-002 | STK-008 | BR-012, CON-012 | P6 | M | D | ⬜ |
| FE-GRIDLINE-003 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-GRIDLINE-004 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-GRIDLINE-005 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| FE-MATCHLINE-001 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-MATCHLINE-002 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-MATCHLINE-003 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-MATCHLINE-004 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| FE-MATCHLINE-005 | STK-008 | NFR-REL-003 | P6 | M | D | ⬜ |
| FE-SCHEDULE-001 | STK-008 | BR-012, CON-012 | P6 | M | D | ⬜ |
| FE-SCHEDULE-002 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| FE-SCHEDULE-003 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-SCHEDULE-004 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-SCHEDULE-005 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-SCHEDULE-006 | STK-008, STK-007 | BR-005 | P6 | S | T | ⬜ |
| FE-REV-001 | STK-008 | BR-012 | P6 | M | D | ⬜ |
| FE-REV-002 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-REV-003 | STK-008 | BR-012, BR-007 | P6 | M | D | ⬜ |
| FE-REV-004 | STK-008 | BR-007 | P6 | S | D | ⬜ |
| FE-REV-005 | STK-008 | BR-007 | P6 | C | D | ⬜ |
| FE-SHEETSET-001 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| FE-SHEETSET-002 | STK-008 | BR-012 | P6 | S | D | ⬜ |
| FE-SHEETSET-003 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| FE-SHEETSET-004 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| FE-SHEETSET-005 | STK-008 | BR-012 | P6 | M | D | ⬜ |

### C.2 Backend — modules `services/*` · source [backend-requirements.md](../02-functional/backend-requirements.md)

| Req | Module | ↑ Stakeholder | ↑ Business / Constraint / NFR | Phase | Pri | V | Status |
| --- | --- | --- | --- | :--: | :--: | :--: | :--: |
| BE-AUTH-001 | services/auth | STK-006 | DEP-001 | P2 | M | T | ⬜ |
| BE-AUTH-002 | services/auth | STK-006 | NFR-SEC-002 | P2 | M | T | ⬜ |
| BE-AUTH-003 | services/auth | STK-006 | — | P2 | M | T | ⬜ |
| BE-AUTH-004 | services/auth | STK-006 | BR-009 | P2 | M | T | ⬜ |
| BE-AUTH-005 | services/auth | STK-006 | — | P2 | M | T | ⬜ |
| BE-AUTH-006 | services/auth | STK-006 | — | P4 | S | T | ⬜ |
| BE-AUTH-007 | services/auth | STK-006 | NFR-PRIV-003 | P4 | S | T | ⬜ |
| BE-ACCESS-001 | services/auth | STK-006 | NFR-SEC-003 | P2 | M | T | ⬜ |
| BE-ACCESS-002 | services/auth | STK-003, STK-006 | BR-007 | P4 | M | T | ⬜ |
| BE-ACCESS-003 | services/auth | STK-005 | BR-009 | P4 | S | T | ⬜ |
| BE-ACCESS-004 | services/auth | STK-006 | — | P4 | S | T | ⬜ |
| BE-ACCESS-005 | services/auth | STK-006 | NFR-SEC-001 | P4 | S | T | ⬜ |
| BE-ACCESS-006 | services/auth | STK-006 | BR-007 | P4 | M | T | ⬜ |
| BE-PROJECT-001 | services/projects | STK-006 | — | P2 | M | T | ⬜ |
| BE-PROJECT-002 | services/projects | STK-001 | CON-002 | P2 | M | T | ⬜ |
| BE-PROJECT-003 | services/projects | STK-006 | NFR-PRIV-001 | P2 | M | T | ⬜ |
| BE-PROJECT-004 | services/projects | STK-003 | NFR-REL-002 | P4 | M | T | ⬜ |
| BE-PROJECT-005 | services/projects | STK-003 | CON-010, NFR-MAINT-001 | P2 | M | T | ⬜ |
| BE-PROJECT-006 | services/projects | STK-004 | — | P4 | S | T | ⬜ |
| BE-PROJECT-007 | services/projects | STK-002, STK-004 | — | P4 | C | T | ⬜ |
| BE-PROJECT-008 | services/projects | STK-006 | NFR-PRIV-003 | P4 | S | T | ⬜ |
| BE-VERSION-001 | services/projects | STK-003 | BR-007 | P4 | M | T | ⬜ |
| BE-VERSION-002 | services/projects | STK-003 | BR-007 | P2 | M | T | ⬜ |
| BE-VERSION-003 | services/projects | STK-003 | BR-007 | P2 | M | T | ⬜ |
| BE-VERSION-004 | services/projects | STK-003 | BR-007 | P4 | S | T | ⬜ |
| BE-VERSION-005 | services/projects | STK-003 | BR-007 | P4 | C | T | ⬜ |
| BE-GEO-001 | services/geospatial | STK-001 | BR-004, DEP-002 | P3 | M | T | ⬜ |
| BE-GEO-002 | services/geospatial | STK-002 | BR-002 | P3 | M | T | ⬜ |
| BE-GEO-003 | services/geospatial | STK-002 | BR-008 | P3 | S | T | ⬜ |
| BE-GEO-004 | services/geospatial | STK-001 | BR-004, NFR-COMPAT-002 | P3 | M | T | ⬜ |
| BE-GEO-005 | services/geospatial | STK-001 | NFR-LEGAL-002, DEP-003 | P3 | S | T | ⬜ |
| BE-IMPORT-001 | services/geospatial | STK-001, STK-007 | BR-005 | P3 | M | T | ⬜ |
| BE-IMPORT-002 | services/geospatial | STK-001 | BR-004 | P3 | M | T | ⬜ |
| BE-IMPORT-003 | services/geospatial | STK-007 | NFR-REL-003 | P3 | M | T | ⬜ |
| BE-EXPORT-001 | services/geospatial | STK-004, STK-007 | BR-005 | P3 | M | T | ⬜ |
| BE-EXPORT-002 | services/geospatial | STK-004 | BR-005 | P3 | S | T | ⬜ |
| BE-EXPORT-003 | services/geospatial | STK-004 | BR-005 | P3 | S | D | ⬜ |
| BE-JOB-001 | services/geospatial | STK-001, STK-007 | NFR-PERF-005 | P3 | M | T | ⬜ |
| BE-JOB-002 | services/geospatial | STK-007 | NFR-OBS-002 | P3 | M | T | ⬜ |
| BE-JOB-003 | services/geospatial | STK-007 | — | P3 | S | T | ⬜ |
| BE-JOB-004 | services/geospatial | STK-004, STK-007 | NFR-SEC-002 | P3 | S | T | ⬜ |
| BE-STORAGE-001 | services/projects | STK-001, STK-004 | — | P3 | M | T | ⬜ |
| BE-STORAGE-002 | services/projects | STK-006 | NFR-PRIV-001 | P3 | M | T | ⬜ |
| BE-STORAGE-003 | services/projects | STK-007 | NFR-SEC-006 | P3 | S | T | ⬜ |
| BE-STORAGE-004 | services/projects | STK-006 | NFR-PRIV-003 | P4 | S | T | ⬜ |
| BE-COLLAB-001 | services/collaboration | STK-003 | BR-003 | P4 | M | T | ⬜ |
| BE-COLLAB-002 | services/collaboration | STK-003 | NFR-REL-002 | P4 | M | T | ⬜ |
| BE-COLLAB-003 | services/collaboration | STK-003 | BR-003 | P4 | M | T | ⬜ |
| BE-COLLAB-004 | services/collaboration | STK-003 | BR-003 | P4 | C | T | ⬜ |
| BE-COLLAB-005 | services/collaboration | STK-003 | NFR-REL-005 | P4 | S | T | ⬜ |
| BE-COLLAB-006 | services/collaboration | STK-003 | CON-002, NFR-REL-005 | P5 | C | T | ⬜ |
| BE-COMMENT-001 | services/collaboration | STK-003 | BR-003 | P4 | M | T | ⬜ |
| BE-COMMENT-002 | services/collaboration | STK-003 | BR-003 | P4 | M | T | ⬜ |
| BE-COMMENT-003 | services/collaboration | STK-003 | BR-003 | P4 | S | T | ⬜ |
| BE-COMMENT-004 | services/collaboration | STK-003 | — | P4 | C | T | ⬜ |
| BE-NOTIFY-001 | services/collaboration | STK-003, STK-006 | BR-003 | P4 | S | T | ⬜ |
| BE-NOTIFY-002 | services/collaboration | STK-003, STK-006 | — | P4 | S | T | ⬜ |
| BE-NOTIFY-003 | services/collaboration | STK-006 | NFR-PRIV-004 | P4 | C | T | ⬜ |
| BE-SEARCH-001 | services/projects | STK-006 | — | P2 | M | T | ⬜ |
| BE-SEARCH-002 | services/projects | STK-006 | — | P2 | S | T | ⬜ |
| BE-SEARCH-003 | services/projects | STK-006 | — | P4 | C | T | ⬜ |
| BE-AUDIT-001 | services/projects | STK-003, STK-006 | BR-007 | P4 | M | T | ⬜ |
| BE-AUDIT-002 | services/projects | STK-006 | BR-007 | P4 | S | T | ⬜ |
| BE-AUDIT-003 | services/projects | STK-003 | NFR-SEC-001 | P4 | C | A | ⬜ |
| BE-AUDIT-004 | services/projects | STK-006 | NFR-SEC-001 | P4 | S | T | ⬜ |
| BE-WEBHOOK-001 | all services | STK-007 | BR-010 | P5 | C | T | ⬜ |
| BE-WEBHOOK-002 | all services | STK-007 | NFR-SEC-001 | P5 | C | T | ⬜ |
| BE-API-001 | all services | STK-007 | BR-010 | P3 | S | I | ⬜ |
| BE-API-002 | all services | STK-007 | NFR-SEC-003 | P3 | M | T | ⬜ |
| BE-API-003 | all services | STK-007 | NFR-MAINT-005 | P3 | S | I | ⬜ |
| BE-API-004 | all services | STK-007 | BR-005 | P3 | S | T | ⬜ |
| BE-API-005 | all services | STK-007 | NFR-REL-001 | P3 | S | T | ⬜ |
| BE-API-006 | all services | STK-007 | NFR-MAINT-001 | P3 | S | I | ⬜ |
| BE-API-007 | all services | STK-007 | NFR-OBS-002 | P3 | S | I | ⬜ |
| BE-API-008 | all services | STK-007 | NFR-REL-002 | P3 | S | T | ⬜ |
| BE-SHEET-001 | services/geospatial | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| BE-SHEET-002 | services/geospatial | STK-008 | BR-012 | P6 | M | T | ⬜ |
| BE-SHEET-003 | services/geospatial | STK-008 | BR-012 | P6 | M | T | ⬜ |
| BE-SHEET-004 | services/geospatial | STK-008 | BR-012 | P6 | M | T | ⬜ |
| BE-SHEET-005 | services/geospatial | STK-008 | NFR-PLOT-001, NFR-PLOT-002 | P6 | M | A | ⬜ |
| BE-SHEET-006 | services/geospatial | STK-008 | NFR-REL-003 | P6 | M | T | ⬜ |
| BE-TEMPLATE-001 | services/projects | STK-008, STK-006 | BR-012 | P6 | M | T | ⬜ |
| BE-TEMPLATE-002 | services/projects | STK-008, STK-006 | BR-012 | P6 | S | T | ⬜ |
| BE-TEMPLATE-003 | services/projects | STK-006 | BR-012, NFR-MAINT-005 | P6 | S | T | ⬜ |
| BE-TEMPLATE-004 | services/projects | STK-006 | NFR-PRIV-001 | P6 | M | T | ⬜ |
| BE-PLOT-001 | services/geospatial | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| BE-PLOT-002 | services/geospatial | STK-008, STK-007 | BR-012, NFR-PERF-005 | P6 | M | T | ⬜ |
| BE-PLOT-003 | services/geospatial | STK-008, STK-007 | NFR-SEC-002 | P6 | M | T | ⬜ |
| BE-PLOT-004 | services/geospatial | STK-008 | NFR-PLOT-002 | P6 | S | T | ⬜ |
| BE-PLOT-005 | services/geospatial | STK-008 | BR-012, DEP-005 | P6 | S | T | ⬜ |
| BE-PLOT-006 | services/geospatial | STK-008 | NFR-REL-003 | P6 | S | T | ⬜ |
| BE-SCHEDULE-001 | services/projects | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| BE-SCHEDULE-002 | services/projects | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| BE-SCHEDULE-003 | services/projects | STK-008 | NFR-REL-002 | P6 | M | T | ⬜ |
| BE-SCHEDULE-004 | services/projects | STK-007 | BR-005 | P6 | S | T | ⬜ |
| BE-PACKAGE-001 | services/projects | STK-008 | BR-012, BR-007 | P6 | M | T | ⬜ |
| BE-PACKAGE-002 | services/projects | STK-008 | BR-012, DEP-005 | P6 | M | T | ⬜ |
| BE-PACKAGE-003 | services/projects | STK-008, STK-003 | NFR-SEC-001, BR-007 | P6 | S | T | ⬜ |
| BE-PACKAGE-004 | services/projects | STK-003, STK-008 | NFR-AVAIL-002, BR-007 | P6 | M | T | ⬜ |
| BE-PACKAGE-005 | services/projects | STK-003 | BR-007, NFR-SEC-001 | P6 | S | T | ⬜ |

### C.3 Domain model — module `packages/domain` · source [domain-requirements.md](../02-functional/domain-requirements.md)

| Req | ↑ Stakeholder | ↑ Business / Constraint / NFR | Phase | Pri | V | Status |
| --- | --- | --- | :--: | :--: | :--: | :--: |
| DOM-CRS-001 | STK-001 | BR-004, CON-004 | P1 | M | T | ⬜ |
| DOM-CRS-002 | STK-001 | DEP-002 | P1 | M | T | ⬜ |
| DOM-CRS-003 | STK-001 | BR-004 | P1 | M | T | ⬜ |
| DOM-CRS-004 | STK-001 | NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-UNIT-001 | STK-001 | BR-004, CON-004 | P1 | M | T | ⬜ |
| DOM-UNIT-002 | STK-001 | BR-004 | P1 | M | T | ⬜ |
| DOM-UNIT-003 | STK-001 | BR-004 | P1 | M | T | ⬜ |
| DOM-UNIT-004 | STK-001 | BR-004, BR-008 | P1 | M | T | ⬜ |
| DOM-UNIT-005 | STK-001 | BR-004 | P1 | S | T | ⬜ |
| DOM-GEOM-001 | STK-001 | BR-002 | P1 | M | T | ⬜ |
| DOM-GEOM-002 | STK-001 | BR-004 | P1 | M | T | ⬜ |
| DOM-GEOM-003 | STK-001 | NFR-REL-003 | P1 | M | T | ⬜ |
| DOM-GEOM-004 | STK-002 | BR-008 | P1 | S | T | ⬜ |
| DOM-GEOM-005 | STK-001 | BR-002 | P2 | S | T | ⬜ |
| DOM-GEOM-006 | STK-001 | BR-002 | P1 | S | T | ⬜ |
| DOM-GEOM-007 | STK-001 | BR-002 | P1 | S | T | ⬜ |
| DOM-GEOM-008 | STK-001 | BR-002 | P2 | S | T | ⬜ |
| DOM-GEOM-009 | STK-001 | NFR-REL-003 | P1 | M | T | ⬜ |
| DOM-GEOM-010 | STK-001 | BR-005 | P2 | C | T | ⬜ |
| DOM-GEOM-011 | STK-001 | NFR-COMPAT-001 | P1 | S | T | ⬜ |
| DOM-SURVEY-001 | STK-001 | BR-002 | P2 | S | T | ⬜ |
| DOM-SURVEY-002 | STK-001 | BR-004 | P2 | S | T | ⬜ |
| DOM-SURVEY-003 | STK-001 | NFR-REL-003 | P3 | C | T | ⬜ |
| DOM-IDENT-001 | STK-003 | BR-003 | P1 | M | T | ⬜ |
| DOM-IDENT-002 | STK-001 | NFR-REL-003 | P1 | M | T | ⬜ |
| DOM-IDENT-003 | STK-002 | BR-002 | P2 | C | T | ⬜ |
| DOM-LAYER-001 | STK-002 | BR-002 | P1 | M | T | ⬜ |
| DOM-LAYER-002 | STK-002 | BR-002 | P1 | M | T | ⬜ |
| DOM-LAYER-003 | STK-002 | BR-002 | P1 | M | T | ⬜ |
| DOM-SITE-001 | STK-002 | BR-002 | P1 | M | T | ⬜ |
| DOM-SITE-002 | STK-001 | BR-004, CON-004 | P1 | M | T | ⬜ |
| DOM-PARCEL-001 | STK-001 | BR-002 | P1 | M | T | ⬜ |
| DOM-PARCEL-002 | STK-001 | BR-008 | P1 | M | T | ⬜ |
| DOM-PARCEL-003 | STK-001 | BR-002 | P1 | S | T | ⬜ |
| DOM-PARCEL-004 | STK-001 | NFR-REL-003 | P2 | S | T | ⬜ |
| DOM-PARCEL-005 | STK-004 | BR-008 | P2 | S | T | ⬜ |
| DOM-PARCEL-006 | STK-001 | BR-002 | P2 | S | T | ⬜ |
| DOM-PARCEL-007 | STK-001 | BR-008 | P1 | M | T | ⬜ |
| DOM-LOT-001 | STK-001 | BR-002 | P1 | M | T | ⬜ |
| DOM-LOT-002 | STK-001 | BR-008 | P1 | M | T | ⬜ |
| DOM-LOT-003 | STK-001 | BR-002 | P1 | M | T | ⬜ |
| DOM-BLOCK-001 | STK-001 | BR-002 | P1 | M | T | ⬜ |
| DOM-BLOCK-002 | STK-001 | BR-002 | P2 | S | T | ⬜ |
| DOM-BLOCK-003 | STK-001 | BR-008 | P1 | S | T | ⬜ |
| DOM-ZONE-001 | STK-002 | BR-002 | P1 | M | T | ⬜ |
| DOM-ZONE-002 | STK-002 | BR-008 | P1 | M | T | ⬜ |
| DOM-ZONE-003 | STK-002 | BR-002 | P1 | S | T | ⬜ |
| DOM-LANDUSE-001 | STK-002 | BR-002 | P1 | M | T | ⬜ |
| DOM-LANDUSE-002 | STK-002 | BR-008 | P1 | M | T | ⬜ |
| DOM-LANDUSE-003 | STK-002 | BR-002 | P1 | S | T | ⬜ |
| DOM-ROW-001 | STK-001 | BR-002 | P1 | S | T | ⬜ |
| DOM-ROW-002 | STK-001 | BR-002 | P2 | S | T | ⬜ |
| DOM-ROW-003 | STK-001 | BR-002 | P2 | S | T | ⬜ |
| DOM-EASEMENT-001 | STK-004 | BR-002 | P2 | S | T | ⬜ |
| DOM-EASEMENT-002 | STK-004 | BR-008 | P2 | S | T | ⬜ |
| DOM-DEDICATION-001 | STK-001 | BR-002 | P2 | S | T | ⬜ |
| DOM-DEDICATION-002 | STK-004 | BR-008 | P2 | S | T | ⬜ |
| DOM-SETBACK-001 | STK-004 | BR-002 | P1 | M | T | ⬜ |
| DOM-SETBACK-002 | STK-004 | BR-008 | P2 | S | T | ⬜ |
| DOM-SETBACK-003 | STK-004 | BR-008 | P2 | M | T | ⬜ |
| DOM-SETBACK-004 | STK-004 | BR-008 | P5 | C | T | ⬜ |
| DOM-BUILDING-001 | STK-004 | BR-008 | P1 | M | T | ⬜ |
| DOM-BUILDING-002 | STK-004 | BR-008 | P2 | S | T | ⬜ |
| DOM-BUILDING-003 | STK-004 | BR-008 | P2 | S | T | ⬜ |
| DOM-BUILDING-004 | STK-002 | BR-008 | P2 | S | T | ⬜ |
| DOM-ENVELOPE-001 | STK-004 | BR-008 | P5 | S | T | ⬜ |
| DOM-ENVELOPE-002 | STK-004 | BR-008 | P5 | S | T | ⬜ |
| DOM-ENVELOPE-003 | STK-004 | BR-008 | P5 | W | T | ⬜ |
| DOM-OPENSPACE-001 | STK-002 | BR-008 | P2 | S | T | ⬜ |
| DOM-OPENSPACE-002 | STK-002 | BR-008 | P5 | C | T | ⬜ |
| DOM-PARKING-001 | STK-004 | BR-008 | P2 | S | T | ⬜ |
| DOM-PARKING-002 | STK-004 | BR-008 | P5 | S | T | ⬜ |
| DOM-INFRA-001 | STK-001 | BR-002 | P5 | C | T | ⬜ |
| DOM-INFRA-002 | STK-001 | BR-002 | P5 | C | T | ⬜ |
| DOM-SUBDIV-001 | STK-001 | BR-002 | P1 | M | T | ⬜ |
| DOM-SUBDIV-002 | STK-001 | NFR-REL-003 | P2 | S | T | ⬜ |
| DOM-SUBDIV-003 | STK-004 | BR-008 | P2 | S | T | ⬜ |
| DOM-METRIC-001 | STK-002 | BR-008 | P1 | M | T | ⬜ |
| DOM-METRIC-002 | STK-002 | BR-008 | P1 | M | T | ⬜ |
| DOM-METRIC-003 | STK-004 | BR-008 | P1 | M | T | ⬜ |
| DOM-METRIC-004 | STK-002 | BR-008 | P1 | M | T | ⬜ |
| DOM-METRIC-005 | STK-002 | BR-008 | P1 | S | T | ⬜ |
| DOM-METRIC-006 | STK-001 | BR-004, NFR-COMPAT-002 | P1 | M | T | ⬜ |
| DOM-METRIC-007 | STK-004 | BR-008 | P1 | M | T | ⬜ |
| DOM-METRIC-008 | STK-004 | BR-008 | P5 | C | T | ⬜ |
| DOM-COMPLY-001 | STK-002 | BR-008 | P5 | S | T | ⬜ |
| DOM-COMPLY-002 | STK-002 | BR-008 | P5 | S | T | ⬜ |
| DOM-COMPLY-003 | STK-002 | BR-008 | P5 | S | T | ⬜ |
| DOM-COMPLY-004 | STK-002 | BR-008 | P5 | S | T | ⬜ |
| DOM-COMPLY-005 | STK-002 | BR-008 | P5 | S | T | ⬜ |
| DOM-COMPLY-006 | STK-003 | BR-008 | P5 | C | T | ⬜ |
| DOM-SCENARIO-001 | STK-002 | BR-001 | P5 | S | T | ⬜ |
| DOM-SCENARIO-002 | STK-002 | BR-008 | P5 | S | T | ⬜ |
| DOM-SCENARIO-003 | STK-002 | BR-008 | P5 | C | T | ⬜ |
| DOM-SERIAL-001 | STK-007 | BR-005, CON-002 | P1 | M | T | ⬜ |
| DOM-SERIAL-002 | STK-007 | NFR-MAINT-001 | P1 | M | T | ⬜ |
| DOM-SERIAL-003 | STK-007 | NFR-REL-003 | P1 | M | T | ⬜ |
| DOM-COMPUTE-001 | STK-002 | NFR-REL-002 | P1 | M | T | ⬜ |
| DOM-COMPUTE-002 | STK-002 | BR-008 | P1 | S | T | ⬜ |
| DOM-SNAPSHOT-001 | STK-003 | BR-003 | P1 | M | T | ⬜ |
| DOM-SNAPSHOT-002 | STK-003 | BR-003 | P5 | C | T | ⬜ |
| DOM-SHEET-001 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-SHEET-002 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| DOM-SHEET-003 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-SHEET-004 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-SHEET-005 | STK-008 | NFR-REL-002 | P6 | M | T | ⬜ |
| DOM-SHEET-006 | STK-008 | BR-012, CON-004 | P6 | M | T | ⬜ |
| DOM-SHEET-007 | STK-008 | BR-012, CON-011 | P6 | S | T | ⬜ |
| DOM-TITLEBLOCK-001 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-TITLEBLOCK-002 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-TITLEBLOCK-003 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| DOM-TITLEBLOCK-004 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| DOM-SHEETSET-001 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-SHEETSET-002 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| DOM-SHEETSET-003 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-SHEETSET-004 | STK-008 | NFR-REL-003 | P6 | M | T | ⬜ |
| DOM-DISCIPLINE-001 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-DISCIPLINE-002 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-DISCIPLINE-003 | STK-008 | BR-012 | P6 | C | T | ⬜ |
| DOM-NUMBERING-001 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-NUMBERING-002 | STK-008 | BR-012 | P6 | C | T | ⬜ |
| DOM-NUMBERING-003 | STK-008 | NFR-REL-003, CON-012 | P6 | M | T | ⬜ |
| DOM-LAYERSTD-001 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-LAYERSTD-002 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-LAYERSTD-003 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| DOM-LAYERSTD-004 | STK-008 | NFR-STD-001 | P6 | S | T | ⬜ |
| DOM-PLOTSTYLE-001 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-PLOTSTYLE-002 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-PLOTSTYLE-003 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| DOM-PLOTSTYLE-004 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| DOM-SYMBOL-001 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-SYMBOL-002 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-SYMBOL-003 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-SYMBOL-004 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-SYMBOL-005 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| DOM-DIM-001 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-DIM-002 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| DOM-DIM-003 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-DIM-004 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-DIM-005 | STK-008 | BR-004, BR-012 | P6 | M | T | ⬜ |
| DOM-ANNO-001 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-ANNO-002 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-ANNO-003 | STK-008 | BR-012, CON-011 | P6 | S | T | ⬜ |
| DOM-ANNO-004 | STK-008 | NFR-REL-003 | P6 | M | T | ⬜ |
| DOM-GRID-001 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-GRID-002 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| DOM-GRID-003 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| DOM-GRID-004 | STK-008 | CON-012 | P6 | M | T | ⬜ |
| DOM-MATCHLINE-001 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-MATCHLINE-002 | STK-008 | CON-012 | P6 | M | T | ⬜ |
| DOM-MATCHLINE-003 | STK-008 | NFR-REL-003 | P6 | M | T | ⬜ |
| DOM-MATCHLINE-004 | STK-008 | NFR-REL-003 | P6 | M | T | ⬜ |
| DOM-SCHEDULE-001 | STK-008 | BR-012, CON-012 | P6 | M | T | ⬜ |
| DOM-SCHEDULE-002 | STK-008 | CON-012 | P6 | M | T | ⬜ |
| DOM-SCHEDULE-003 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-SCHEDULE-004 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| DOM-SCHEDULE-005 | STK-008 | NFR-REL-002 | P6 | M | T | ⬜ |
| DOM-REV-001 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-REV-002 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| DOM-REV-003 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| DOM-ISSUE-001 | STK-008 | BR-012, BR-007 | P6 | M | T | ⬜ |
| DOM-ISSUE-002 | STK-008, STK-003 | BR-007, NFR-SEC-001 | P6 | M | T | ⬜ |
| DOM-ISSUE-003 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-XREF-001 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| DOM-XREF-002 | STK-008 | CON-012 | P6 | M | T | ⬜ |
| DOM-XREF-003 | STK-008 | NFR-REL-003 | P6 | M | T | ⬜ |

### C.4 Interoperability — module `services/geospatial` (+`apps/web` via `FE-IO`) · source [interoperability-requirements.md](../02-functional/interoperability-requirements.md)

| Req | ↑ Stakeholder | ↑ Business / Constraint / NFR | Phase | Pri | V | Status |
| --- | --- | --- | :--: | :--: | :--: | :--: |
| IOP-GEOJSON-001 | STK-001, STK-007 | BR-005 | P3 | M | T | ⬜ |
| IOP-GEOJSON-002 | STK-007 | BR-005 | P3 | M | T | ⬜ |
| IOP-GEOJSON-003 | STK-001 | BR-004 | P3 | M | T | ⬜ |
| IOP-KML-001 | STK-001 | BR-005 | P3 | S | T | ⬜ |
| IOP-KML-002 | STK-007 | BR-005 | P3 | S | T | ⬜ |
| IOP-SHP-001 | STK-001 | BR-005 | P3 | M | T | ⬜ |
| IOP-SHP-002 | STK-001 | BR-004 | P3 | M | T | ⬜ |
| IOP-SHP-003 | STK-007 | BR-005 | P3 | S | T | ⬜ |
| IOP-DXF-001 | STK-001, STK-004 | BR-005 | P3 | M | T | ⬜ |
| IOP-DXF-002 | STK-001 | BR-005 | P3 | S | T | ⬜ |
| IOP-DXF-003 | STK-001 | BR-004 | P3 | M | D | ⬜ |
| IOP-DXF-004 | STK-004 | BR-005 | P3 | S | T | ⬜ |
| IOP-GPKG-001 | STK-007 | BR-005 | P3 | C | T | ⬜ |
| IOP-GPKG-002 | STK-007 | BR-005 | P3 | C | T | ⬜ |
| IOP-PDF-001 | STK-004, STK-005 | BR-005 | P3 | S | D | ⬜ |
| IOP-PDF-002 | STK-004 | BR-008 | P3 | C | D | ⬜ |
| IOP-CSV-001 | STK-007 | BR-005 | P3 | C | T | ⬜ |
| IOP-CSV-002 | STK-004 | BR-005 | P3 | C | T | ⬜ |
| IOP-RASTER-001 | STK-001, STK-004 | BR-005 | P3 | M | T | ⬜ |
| IOP-RASTER-002 | STK-001 | BR-004 | P3 | S | D | ⬜ |
| IOP-RASTER-003 | STK-001 | CON-005 | P3 | S | I | ⬜ |
| IOP-FIELD-001 | STK-001, STK-007 | BR-005 | P3 | M | D | ⬜ |
| IOP-FIELD-002 | STK-007 | BR-005 | P3 | S | T | ⬜ |
| IOP-ENC-001 | STK-001 | BR-005, NFR-COMPAT-001 | P3 | M | T | ⬜ |
| IOP-BUNDLE-001 | STK-001, STK-005 | BR-005 | P3 | M | T | ⬜ |
| IOP-BUNDLE-002 | STK-001 | BR-004 | P3 | S | D | ⬜ |
| IOP-STREAM-001 | STK-007 | BR-005 | P3 | S | A | ⬜ |
| IOP-STREAM-002 | STK-007 | NFR-REL-003 | P3 | M | T | ⬜ |
| IOP-IDENT-001 | STK-001, STK-007 | NFR-COMPAT-001 | P3 | S | T | ⬜ |
| IOP-SCHEMA-001 | STK-007 | BR-005, CON-005 | P3 | M | I | ⬜ |
| IOP-GEOMX-001 | STK-001 | BR-005, NFR-REL-003 | P3 | M | T | ⬜ |
| IOP-PREC-001 | STK-007 | BR-005, NFR-COMPAT-001 | P3 | S | T | ⬜ |
| IOP-CRSX-001 | STK-001 | BR-004 | P3 | M | T | ⬜ |
| IOP-CRSX-002 | STK-001 | BR-004 | P3 | M | T | ⬜ |
| IOP-CRSX-003 | STK-001 | NFR-COMPAT-002 | P3 | S | D | ⬜ |
| IOP-DXFSHEET-001 | STK-008 | BR-012, DEP-006 | P6 | M | T | ⬜ |
| IOP-DXFSHEET-002 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| IOP-DXFSHEET-003 | STK-008 | BR-012 | P6 | M | T | ⬜ |
| IOP-DXFSHEET-004 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| IOP-DXFSHEET-005 | STK-008 | BR-012, CON-011 | P6 | M | T | ⬜ |
| IOP-DXFSHEET-006 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| IOP-PDFSHEET-001 | STK-008 | BR-012, DEP-005 | P6 | M | T | ⬜ |
| IOP-PDFSHEET-002 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| IOP-PDFSHEET-003 | STK-008 | BR-012, DEP-005 | P6 | S | T | ⬜ |
| IOP-PDFSHEET-004 | STK-008 | BR-012, DEP-005 | P6 | C | T | ⬜ |
| IOP-PDFSHEET-005 | STK-008 | NFR-PLOT-002, DEP-005 | P6 | M | T | ⬜ |
| IOP-PDFSHEET-006 | STK-008 | NFR-PLOT-001 | P6 | M | A | ⬜ |
| IOP-PDFSHEET-007 | STK-008 | BR-012, DEP-005 | P6 | S | T | ⬜ |
| IOP-PDFSHEET-008 | STK-008, STK-003 | BR-007 | P6 | S | T | ⬜ |
| IOP-PLTSTYLE-001 | STK-008 | BR-012, CON-011 | P6 | S | T | ⬜ |
| IOP-PLTSTYLE-002 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| IOP-LAYERMAP-001 | STK-008 | BR-012, CON-011 | P6 | M | D | ⬜ |
| IOP-LAYERMAP-002 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| IOP-LAYERMAP-003 | STK-008 | BR-012 | P6 | S | T | ⬜ |
| IOP-TITLEBLOCK-001 | STK-008 | BR-012, DEP-006 | P6 | S | T | ⬜ |
| IOP-TITLEBLOCK-002 | STK-008 | BR-012, CON-011 | P6 | S | D | ⬜ |
| IOP-TITLEBLOCK-003 | STK-008 | BR-012 | P6 | C | T | ⬜ |
| IOP-BLOCK-001 | STK-008 | BR-012, DEP-006 | P6 | S | T | ⬜ |
| IOP-BLOCK-002 | STK-008 | BR-012 | P6 | S | T | ⬜ |

---

## Matrix D — Non-functional → constrained scope

Every NFR names the requirements/modules it constrains (rule `R5`), generated
from the `Constrains` column of the
[non-functional requirements](../03-nonfunctional/nonfunctional-requirements.md).

| NFR category | Constrains (areas / modules / requirements) |
| --- | --- |
| NFR-PERF | FE-CANVAS, FE-NAV, FE-METRIC, DOM-METRIC, BE-COLLAB, FE-PRESENCE, FE-PROJECT, BE-PROJECT, BE-IMPORT, BE-JOB, FE-IO, FE-SHEETSET, FE-SHEET, BE-SHEET, BE-PLOT, IOP-PDFSHEET |
| NFR-SCALE | BE-COLLAB, BE-PROJECT, services/*, BE-GEO, BE-STORAGE, FE-SHEETSET, BE-SHEET |
| NFR-SEC | BE-*, BE-API, BE-AUTH, BE-ACCESS, services/*, apps/web, BE-STORAGE, monorepo, repo |
| NFR-PRIV | BE-ACCESS, BE-AUTH, apps/web, services/*, BE-PROJECT |
| NFR-A11Y | FE-*, FE-STYLE, FE-METRIC, FE-REVIEW |
| NFR-USE | FE-REVIEW, FE-NAV, FE-CANVAS, FE-SELECT, apps/web, FE-HELP |
| NFR-REL | BE-PROJECT, BE-COLLAB, BE-IMPORT, BE-EXPORT, BE-VERSION, FE-PRESENCE, BE-API |
| NFR-AVAIL | services/*, BE-API, BE-PROJECT, BE-VERSION |
| NFR-COMPAT | IOP-*, BE-GEO, DOM-METRIC, DOM-GEOM, packages/domain, IOP-CRSX, apps/web |
| NFR-I18N | FE-*, FE-METRIC, FE-MEASURE, FE-PREFS, DOM-UNIT |
| NFR-MOD | BE-COMMENT, FE-REVIEW |
| NFR-MAINT | all, packages/domain, monorepo, docs/, BE-API, all functional |
| NFR-OBS | services/*, FE-IO |
| NFR-PORT | services/*, apps/web |
| NFR-LEGAL | repo, FE-NAV, IOP-*, BE-GEO |
| NFR-PLOT | BE-SHEET-005, IOP-PDFSHEET-006, FE-PLOT-004, DOM-ANNO-002, DOM-DIM-004, BE-PLOT-004, IOP-PDFSHEET-005, DOM-PLOTSTYLE-002, DOM-PLOTSTYLE-003, BE-SHEET-002, DOM-PLOTSTYLE-001, BE-PLOT-001 |
| NFR-STD | DOM-SHEET-007, FE-SHEET-003, DOM-TITLEBLOCK-002, FE-TITLE-002, DOM-LAYERSTD-001, DOM-LAYERSTD-004, IOP-LAYERMAP-003, DOM-DISCIPLINE-001, DOM-NUMBERING-001, DOM-DIM-003, DOM-ANNO-003, DOM-PLOTSTYLE-003, IOP-PDFSHEET-003, IOP-PDFSHEET-004, Phase 6 sheet output |
| NFR-BENCH | NFR-PERF-001..005, NFR-SCALE-001..003, NFR-SCALE-001, NFR-PERF-003, NFR-REL-002, NFR-PERF-001..004, NFR-SCALE-003, NFR-PERF-001, NFR-PLOT-*, BE-SHEET-*, BE-PLOT-*, IOP-PDFSHEET-* |

---

## Matrix E — Phase coverage (roadmap alignment)

Requirement counts by roadmap [phase](../../ROADMAP.md), computed from Matrix C.
Confirms the domain model (P1) leads and later phases build on it.

| Phase | Focus | FE | BE | DOM | IOP | Total |
| --- | --- | :--: | :--: | :--: | :--: | :--: |
| **P1** | Domain model foundation | 0 | 0 | 56 | 0 | 56 |
| **P2** | Single-player cloud workspace | 76 | 14 | 25 | 0 | 115 |
| **P3** | Interoperability | 9 | 26 | 1 | 35 | 71 |
| **P4** | Collaboration & review | 19 | 32 | 0 | 0 | 51 |
| **P5** | Analysis & planning depth | 4 | 3 | 19 | 0 | 26 |
| **P6** | Architecture & engineering CAD sheets | 67 | 25 | 65 | 24 | 181 |
| | **Totals** | **175** | **100** | **166** | **59** | **500** |

> NFRs (86) are cross-cutting and phased with the areas they constrain.

## Matrix F — Module coverage

Every functional requirement maps to exactly one architecture module (rule `R3`).

| Architecture module | Areas | Count |
| --- | --- | :--: |
| `apps/web` | FE-ACCOUNT, FE-ANNO, FE-CANVAS, FE-CMD, FE-EDIT, FE-FIND, FE-GRIDLINE, FE-HELP, FE-IO, FE-LAYER, FE-MATCHLINE, FE-MEASURE, FE-METRIC, FE-NAV, FE-NOTIFY, FE-PLOT, FE-PRECISION, FE-PREFS, FE-PRESENCE, FE-PRINT, FE-PROJECT, FE-REV, FE-REVIEW, FE-SCENARIO, FE-SCHEDULE, FE-SELECT, FE-SHEET, FE-SHEETSET, FE-STATE, FE-STYLE, FE-SYMBOL, FE-TITLE, FE-VIEWPORT | 175 |
| `services/auth` | BE-ACCESS, BE-AUTH | 13 |
| `services/projects` | BE-AUDIT, BE-PACKAGE, BE-PROJECT, BE-SCHEDULE, BE-SEARCH, BE-STORAGE, BE-TEMPLATE, BE-VERSION | 37 |
| `services/geospatial` | BE-EXPORT, BE-GEO, BE-IMPORT, BE-JOB, BE-PLOT, BE-SHEET, IOP-BLOCK, IOP-BUNDLE, IOP-CRSX, IOP-CSV, IOP-DXF, IOP-DXFSHEET, IOP-ENC, IOP-FIELD, IOP-GEOJSON, IOP-GEOMX, IOP-GPKG, IOP-IDENT, IOP-KML, IOP-LAYERMAP, IOP-PDF, IOP-PDFSHEET, IOP-PLTSTYLE, IOP-PREC, IOP-RASTER, IOP-SCHEMA, IOP-SHP, IOP-STREAM, IOP-TITLEBLOCK | 86 |
| `services/collaboration` | BE-COLLAB, BE-COMMENT, BE-NOTIFY | 13 |
| `packages/domain` | DOM-ANNO, DOM-BLOCK, DOM-BUILDING, DOM-COMPLY, DOM-COMPUTE, DOM-CRS, DOM-DEDICATION, DOM-DIM, DOM-DISCIPLINE, DOM-EASEMENT, DOM-ENVELOPE, DOM-GEOM, DOM-GRID, DOM-IDENT, DOM-INFRA, DOM-ISSUE, DOM-LANDUSE, DOM-LAYER, DOM-LAYERSTD, DOM-LOT, DOM-MATCHLINE, DOM-METRIC, DOM-NUMBERING, DOM-OPENSPACE, DOM-PARCEL, DOM-PARKING, DOM-PLOTSTYLE, DOM-REV, DOM-ROW, DOM-SCENARIO, DOM-SCHEDULE, DOM-SERIAL, DOM-SETBACK, DOM-SHEET, DOM-SHEETSET, DOM-SITE, DOM-SNAPSHOT, DOM-SUBDIV, DOM-SURVEY, DOM-SYMBOL, DOM-TITLEBLOCK, DOM-UNIT, DOM-XREF, DOM-ZONE | 166 |
| `all services` | BE-API, BE-WEBHOOK | 10 |
| | **Total** | **500** |

## Verification method summary

| Method | Count (functional) | Typical requirements |
| --- | :--: | --- |
| **T** Test | 323 | Domain rules/metrics, service behavior, format round-trips |
| **D** Demonstration | 167 | Canvas/UI interactions, wizards, exhibits |
| **I** Inspection | 6 | API docs, license, config, schema mapping |
| **A** Analysis | 4 | Performance/load, audit immutability |

> Verification **evidence** (test-case IDs `TC-…`) attaches here once a test
> suite exists; today the matrix specifies the method, per the
> [conventions](../00-overview/standards-and-conventions.md#verification-methods).

