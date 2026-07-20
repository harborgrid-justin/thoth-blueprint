# Requirements Traceability Matrix (RTM)

> **Generated file.** Matrix C and the roll-ups below are produced by
> [`_meta/scripts/gen_rtm.py`](../_meta/scripts/gen_rtm.py) from the `Trace`
> columns of the requirement source files â€” the source files are authoritative.
> Re-run the generator after editing any requirement; do not hand-edit Matrix C.

This is the spine of the suite: it realizes **bidirectional traceability** across
the chain defined in
[standards & conventions](../00-overview/standards-and-conventions.md#traceability-model):

```
BR â”€â–¶ STK â”€â–¶ {FE, BE, DOM, IOP} â”€â–¶ Phase Â· Module Â· Verification
                    â–²
              NFR (cross-cutting constraints)
```

Read it **down** (a business goal â†’ the features that deliver it) or **up** (a
requirement â†’ why it exists). The [coverage report](coverage-report.md) validates
the matrix against coverage rules `R1`â€“`R5`.

**Legend.** Priority: **M** Must Â· **S** Should Â· **C** Could Â· **W** Won't-yet.
Verify: **T** Test Â· **D** Demonstration Â· **I** Inspection Â· **A** Analysis.
Status: â¬œ Planned (specified, not yet built) Â· ðŸŸ¡ In progress Â· âœ… Done. The
repository is currently scaffold ([ROADMAP](../../ROADMAP.md) Phase 0), so every
requirement is **â¬œ Planned**; this column becomes the live build tracker.

---

## Matrix A â€” Business â†’ Stakeholder

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
| [`BR-009`](../01-business/business-requirements.md) Full stakeholder spectrum | STK-001 â€“ STK-008 |
| [`BR-010`](../01-business/business-requirements.md) Open & self-hostable | STK-007 |
| [`BR-011`](../01-business/business-requirements.md) Incremental, domain-first | all (via Phase) |
| [`BR-012`](../01-business/business-requirements.md) Architecture & engineering CAD sheets | STK-004, STK-008 |

## Matrix B â€” Stakeholder â†’ functional areas & module

A non-exhaustive digest of each stakeholder's principal functional areas (rule
`R2`). The authoritative, complete stakeholder trace for every requirement is the
â†‘ Stakeholder column of [Matrix C](#matrix-c--master-requirement-traceability).
Source: [stakeholders](../01-business/stakeholders.md).

| Stakeholder | Frontend | Backend | Domain | Interop |
| --- | --- | --- | --- | --- |
| STK-001 Site planner | CANVAS, PRECISION, MEASURE, PREFS | GEO, IMPORT, JOB | CRS, UNIT, GEOM, PARCEL, LOT, SURVEY, SUBDIV, METRIC | DXF, GEOJSON, SHP, RASTER |
| STK-002 Urban planner | STYLE, METRIC, LAYER, FIND, SCENARIO | GEO | ZONE, LANDUSE, BLOCK, METRIC, COMPLY, SCENARIO | â€” |
| STK-003 Reviewer | REVIEW, PROJECT, NOTIFY | COMMENT, VERSION, AUDIT, ACCESS, NOTIFY | IDENT, SNAPSHOT | â€” |
| STK-004 Developer | CANVAS, METRIC, PRINT | EXPORT, JOB | SETBACK, BUILDING, ENVELOPE, PARKING, METRIC | PDF, DXF |
| STK-005 Community | REVIEW, NAV, HELP | ACCESS | â€” | PDF |
| STK-006 Org admin | ACCOUNT, STATE | AUTH, ACCESS, AUDIT, SEARCH, STORAGE | â€” | â€” |
| STK-007 Integrator | IO | API, IMPORT, EXPORT, JOB, WEBHOOK | SERIAL | GEOJSON, SHP, GPKG, CSV, FIELD, SCHEMA |
| STK-008 Architect / engineer / CAD manager | SHEET, VIEWPORT, TITLE, PLOT, ANNO, SYMBOL, GRIDLINE, MATCHLINE, SCHEDULE, REV, SHEETSET | SHEET, TEMPLATE, PLOT, SCHEDULE, PACKAGE | SHEET, TITLEBLOCK, SHEETSET, DISCIPLINE, NUMBERING, LAYERSTD, PLOTSTYLE, SYMBOL, DIM, ANNO, GRID, MATCHLINE, SCHEDULE, REV, ISSUE, XREF | DXFSHEET, PDFSHEET, PLTSTYLE, LAYERMAP, TITLEBLOCK, BLOCK |

---

## Matrix C â€” Master requirement traceability

One row per requirement, generated from the source files. Requirement text lives
in the linked sources; this matrix carries the trace links.

### C.1 Frontend â€” module `apps/web` Â· source [frontend-requirements.md](../02-functional/frontend-requirements.md)

| Req | â†‘ Stakeholder | â†‘ Business / Constraint / NFR | Phase | Pri | V | Status |
| --- | --- | --- | :--: | :--: | :--: | :--: |
| FE-CANVAS-001 | STK-001, STK-002 | BR-002 | P2 | M | D | â¬œ |
| FE-CANVAS-002 | STK-001 | BR-002 | P2 | M | D | â¬œ |
| FE-CANVAS-003 | STK-001 | BR-002 | P2 | S | D | â¬œ |
| FE-CANVAS-004 | STK-001 | BR-002 | P2 | M | D | â¬œ |
| FE-CANVAS-005 | STK-002 | BR-002 | P2 | M | T | â¬œ |
| FE-CANVAS-006 | STK-001 | BR-002 | P2 | S | D | â¬œ |
| FE-CANVAS-007 | STK-001 | BR-002 | P2 | S | D | â¬œ |
| FE-CANVAS-008 | STK-001 | BR-006 | P2 | M | T | â¬œ |
| FE-CANVAS-009 | STK-002 | BR-002 | P2 | S | D | â¬œ |
| FE-CANVAS-010 | STK-003 | BR-003 | P3 | C | D | â¬œ |
| FE-CANVAS-011 | STK-004 | BR-008 | P2 | M | D | â¬œ |
| FE-CANVAS-012 | STK-001 | BR-002 | P2 | S | D | â¬œ |
| FE-PRECISION-001 | STK-001 | BR-006 | P2 | M | D | â¬œ |
| FE-PRECISION-002 | STK-001 | BR-006 | P2 | M | D | â¬œ |
| FE-PRECISION-003 | STK-001 | BR-006 | P2 | S | D | â¬œ |
| FE-PRECISION-004 | STK-001 | BR-006 | P2 | S | D | â¬œ |
| FE-PRECISION-005 | STK-001 | BR-006 | P2 | C | D | â¬œ |
| FE-PRECISION-006 | STK-001 | BR-006 | P2 | S | D | â¬œ |
| FE-PRECISION-007 | STK-001 | BR-006 | P2 | S | D | â¬œ |
| FE-MEASURE-001 | STK-001 | BR-004 | P2 | M | D | â¬œ |
| FE-MEASURE-002 | STK-001 | BR-004 | P2 | M | D | â¬œ |
| FE-MEASURE-003 | STK-001 | BR-004 | P2 | M | D | â¬œ |
| FE-MEASURE-004 | STK-001 | BR-004 | P2 | C | D | â¬œ |
| FE-MEASURE-005 | STK-001 | BR-004 | P2 | S | D | â¬œ |
| FE-LAYER-001 | STK-002 | BR-002 | P2 | M | D | â¬œ |
| FE-LAYER-002 | STK-002 | BR-002 | P2 | M | D | â¬œ |
| FE-LAYER-003 | STK-002 | BR-002 | P2 | S | D | â¬œ |
| FE-LAYER-004 | STK-002 | BR-002 | P2 | S | D | â¬œ |
| FE-LAYER-005 | STK-002 | BR-002 | P2 | M | D | â¬œ |
| FE-STYLE-001 | STK-002 | BR-002 | P2 | M | D | â¬œ |
| FE-STYLE-002 | STK-002 | BR-002 | P2 | S | D | â¬œ |
| FE-STYLE-003 | STK-002 | BR-002 | P2 | S | D | â¬œ |
| FE-METRIC-001 | STK-002, STK-004 | BR-008 | P2 | M | D | â¬œ |
| FE-METRIC-002 | STK-002 | BR-008 | P2 | M | T | â¬œ |
| FE-METRIC-003 | STK-004 | BR-008 | P2 | S | D | â¬œ |
| FE-METRIC-004 | STK-002 | BR-008 | P5 | S | D | â¬œ |
| FE-NAV-001 | STK-005 | BR-001 | P2 | M | D | â¬œ |
| FE-NAV-002 | STK-001 | BR-004 | P2 | M | D | â¬œ |
| FE-NAV-003 | STK-002 | BR-001 | P3 | C | D | â¬œ |
| FE-NAV-004 | STK-005 | BR-001 | P2 | S | D | â¬œ |
| FE-NAV-005 | STK-001 | BR-005 | P3 | S | D | â¬œ |
| FE-NAV-006 | STK-002 | BR-001 | P2 | C | D | â¬œ |
| FE-NAV-007 | STK-001 | BR-004 | P2 | S | D | â¬œ |
| FE-NAV-008 | STK-005 | BR-001 | P2 | C | D | â¬œ |
| FE-SELECT-001 | STK-001 | BR-006 | P2 | M | D | â¬œ |
| FE-SELECT-002 | STK-001 | BR-006 | P2 | M | D | â¬œ |
| FE-SELECT-003 | STK-002 | BR-002 | P2 | M | D | â¬œ |
| FE-SELECT-004 | STK-001 | BR-006 | P2 | M | D | â¬œ |
| FE-SELECT-005 | STK-002 | BR-002 | P2 | S | D | â¬œ |
| FE-EDIT-001 | STK-001 | BR-006 | P2 | M | T | â¬œ |
| FE-EDIT-002 | STK-001 | BR-006 | P2 | M | D | â¬œ |
| FE-EDIT-003 | STK-001 | BR-002 | P2 | S | D | â¬œ |
| FE-EDIT-004 | STK-001 | BR-006 | P2 | C | D | â¬œ |
| FE-FIND-001 | STK-002 | BR-002 | P2 | S | D | â¬œ |
| FE-FIND-002 | STK-002 | BR-002 | P2 | S | D | â¬œ |
| FE-FIND-003 | STK-002 | BR-002 | P2 | C | D | â¬œ |
| FE-CMD-001 | STK-001 | BR-006 | P2 | S | D | â¬œ |
| FE-CMD-002 | STK-001 | BR-001 | P2 | C | D | â¬œ |
| FE-CMD-003 | STK-005 | NFR-A11Y-002 | P2 | S | T | â¬œ |
| FE-CMD-004 | STK-001 | NFR-USE-001 | P2 | C | D | â¬œ |
| FE-NOTIFY-001 | STK-003 | BR-003 | P4 | S | D | â¬œ |
| FE-NOTIFY-002 | STK-003 | BR-003 | P4 | C | D | â¬œ |
| FE-NOTIFY-003 | STK-003 | BR-007 | P4 | S | D | â¬œ |
| FE-HELP-001 | STK-005, STK-006 | BR-009 | P2 | S | D | â¬œ |
| FE-HELP-002 | STK-005 | BR-009 | P2 | C | D | â¬œ |
| FE-HELP-003 | STK-005 | NFR-USE-004 | P2 | C | D | â¬œ |
| FE-STATE-001 | STK-003 | CON-002 | P2 | M | D | â¬œ |
| FE-STATE-002 | STK-006 | NFR-USE-001 | P2 | S | D | â¬œ |
| FE-STATE-003 | STK-006 | NFR-OBS-002 | P2 | M | D | â¬œ |
| FE-STATE-004 | STK-003 | CON-002 | P4 | M | D | â¬œ |
| FE-STATE-005 | STK-003 | BR-003 | P4 | S | T | â¬œ |
| FE-STATE-006 | STK-003 | CON-002 | P2 | S | D | â¬œ |
| FE-PREFS-001 | STK-001 | BR-004 | P2 | M | D | â¬œ |
| FE-PREFS-002 | STK-001 | BR-004 | P2 | S | D | â¬œ |
| FE-PREFS-003 | STK-001 | BR-004 | P2 | C | D | â¬œ |
| FE-PREFS-004 | STK-001 | BR-004 | P2 | C | D | â¬œ |
| FE-PREFS-005 | STK-005 | NFR-A11Y-001 | P2 | S | D | â¬œ |
| FE-PRINT-001 | STK-004 | BR-005 | P3 | S | D | â¬œ |
| FE-PRINT-002 | STK-004 | BR-005 | P3 | C | D | â¬œ |
| FE-PRINT-003 | STK-005 | BR-009 | P4 | C | D | â¬œ |
| FE-PROJECT-001 | STK-006 | BR-007 | P2 | M | D | â¬œ |
| FE-PROJECT-002 | STK-001, STK-003 | CON-002 | P2 | M | T | â¬œ |
| FE-PROJECT-003 | STK-003 | BR-007 | P2 | S | D | â¬œ |
| FE-PROJECT-004 | STK-003 | BR-007 | P4 | S | D | â¬œ |
| FE-PROJECT-005 | STK-001 | BR-004, CON-004 | P2 | M | D | â¬œ |
| FE-PROJECT-006 | STK-006 | BR-007 | P2 | S | D | â¬œ |
| FE-PROJECT-007 | STK-006 | BR-007 | P2 | S | D | â¬œ |
| FE-REVIEW-001 | STK-003, STK-005 | BR-003 | P4 | M | D | â¬œ |
| FE-REVIEW-002 | STK-003 | BR-003 | P4 | M | D | â¬œ |
| FE-REVIEW-003 | STK-003 | BR-003 | P4 | S | D | â¬œ |
| FE-REVIEW-004 | STK-003 | BR-003 | P4 | S | D | â¬œ |
| FE-REVIEW-005 | STK-005 | BR-009 | P4 | S | D | â¬œ |
| FE-PRESENCE-001 | STK-003 | BR-003 | P4 | M | D | â¬œ |
| FE-PRESENCE-002 | STK-003 | BR-003 | P4 | M | T | â¬œ |
| FE-PRESENCE-003 | STK-003 | BR-003 | P4 | S | D | â¬œ |
| FE-PRESENCE-004 | STK-003 | BR-003 | P4 | C | D | â¬œ |
| FE-SCENARIO-001 | STK-002 | BR-001 | P5 | S | D | â¬œ |
| FE-SCENARIO-002 | STK-002 | BR-008 | P5 | S | D | â¬œ |
| FE-SCENARIO-003 | STK-002, STK-004 | BR-008 | P5 | S | D | â¬œ |
| FE-IO-001 | STK-001, STK-007 | BR-005 | P3 | M | D | â¬œ |
| FE-IO-002 | STK-004, STK-007 | BR-005 | P3 | M | D | â¬œ |
| FE-IO-003 | STK-001 | BR-005 | P3 | S | D | â¬œ |
| FE-IO-004 | STK-007 | NFR-OBS-002 | P3 | M | D | â¬œ |
| FE-ACCOUNT-001 | STK-006 | NFR-SEC-002 | P2 | M | D | â¬œ |
| FE-ACCOUNT-002 | STK-006 | BR-009 | P2 | S | D | â¬œ |
| FE-ACCOUNT-003 | STK-006 | BR-007 | P4 | M | D | â¬œ |
| FE-ACCOUNT-004 | STK-006 | BR-009 | P4 | S | D | â¬œ |
| FE-ACCOUNT-005 | STK-006 | BR-007 | P4 | S | D | â¬œ |
| FE-SHEET-001 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-SHEET-002 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-SHEET-003 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-SHEET-004 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-SHEET-005 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-SHEET-006 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-SHEET-007 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-SHEET-008 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| FE-VIEWPORT-001 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-VIEWPORT-002 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-VIEWPORT-003 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-VIEWPORT-004 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-VIEWPORT-005 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-VIEWPORT-006 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-VIEWPORT-007 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-VIEWPORT-008 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-VIEWPORT-009 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-TITLE-001 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-TITLE-002 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-TITLE-003 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| FE-TITLE-004 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-TITLE-005 | STK-008 | BR-012 | P6 | C | D | â¬œ |
| FE-PLOT-001 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-PLOT-002 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-PLOT-003 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-PLOT-004 | STK-008 | NFR-PLOT-001 | P6 | M | D | â¬œ |
| FE-PLOT-005 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-PLOT-006 | STK-008 | BR-012, DEP-005, DEP-006 | P6 | M | D | â¬œ |
| FE-PLOT-007 | STK-008, STK-007 | NFR-OBS-002 | P6 | M | D | â¬œ |
| FE-ANNO-001 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-ANNO-002 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-ANNO-003 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| FE-ANNO-004 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-ANNO-005 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| FE-ANNO-006 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-ANNO-007 | STK-008 | NFR-PLOT-002 | P6 | S | D | â¬œ |
| FE-SYMBOL-001 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-SYMBOL-002 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-SYMBOL-003 | STK-008 | BR-012, DEP-006 | P6 | S | D | â¬œ |
| FE-SYMBOL-004 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-SYMBOL-005 | STK-008, STK-006 | BR-012 | P6 | C | D | â¬œ |
| FE-GRIDLINE-001 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-GRIDLINE-002 | STK-008 | BR-012, CON-012 | P6 | M | D | â¬œ |
| FE-GRIDLINE-003 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-GRIDLINE-004 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-GRIDLINE-005 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| FE-MATCHLINE-001 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-MATCHLINE-002 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-MATCHLINE-003 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-MATCHLINE-004 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| FE-MATCHLINE-005 | STK-008 | NFR-REL-003 | P6 | M | D | â¬œ |
| FE-SCHEDULE-001 | STK-008 | BR-012, CON-012 | P6 | M | D | â¬œ |
| FE-SCHEDULE-002 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| FE-SCHEDULE-003 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-SCHEDULE-004 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-SCHEDULE-005 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-SCHEDULE-006 | STK-008, STK-007 | BR-005 | P6 | S | T | â¬œ |
| FE-REV-001 | STK-008 | BR-012 | P6 | M | D | â¬œ |
| FE-REV-002 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-REV-003 | STK-008 | BR-012, BR-007 | P6 | M | D | â¬œ |
| FE-REV-004 | STK-008 | BR-007 | P6 | S | D | â¬œ |
| FE-REV-005 | STK-008 | BR-007 | P6 | C | D | â¬œ |
| FE-SHEETSET-001 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| FE-SHEETSET-002 | STK-008 | BR-012 | P6 | S | D | â¬œ |
| FE-SHEETSET-003 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| FE-SHEETSET-004 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| FE-SHEETSET-005 | STK-008 | BR-012 | P6 | M | D | â¬œ |

### C.2 Backend â€” modules `services/*` Â· source [backend-requirements.md](../02-functional/backend-requirements.md)

| Req | Module | â†‘ Stakeholder | â†‘ Business / Constraint / NFR | Phase | Pri | V | Status |
| --- | --- | --- | --- | :--: | :--: | :--: | :--: |
| BE-AUTH-001 | services/auth | STK-006 | DEP-001 | P2 | M | T | â¬œ |
| BE-AUTH-002 | services/auth | STK-006 | NFR-SEC-002 | P2 | M | T | â¬œ |
| BE-AUTH-003 | services/auth | STK-006 | â€” | P2 | M | T | â¬œ |
| BE-AUTH-004 | services/auth | STK-006 | BR-009 | P2 | M | T | â¬œ |
| BE-AUTH-005 | services/auth | STK-006 | â€” | P2 | M | T | â¬œ |
| BE-AUTH-006 | services/auth | STK-006 | â€” | P4 | S | T | â¬œ |
| BE-AUTH-007 | services/auth | STK-006 | NFR-PRIV-003 | P4 | S | T | â¬œ |
| BE-ACCESS-001 | services/auth | STK-006 | NFR-SEC-003 | P2 | M | T | â¬œ |
| BE-ACCESS-002 | services/auth | STK-003, STK-006 | BR-007 | P4 | M | T | â¬œ |
| BE-ACCESS-003 | services/auth | STK-005 | BR-009 | P4 | S | T | â¬œ |
| BE-ACCESS-004 | services/auth | STK-006 | â€” | P4 | S | T | â¬œ |
| BE-ACCESS-005 | services/auth | STK-006 | NFR-SEC-001 | P4 | S | T | â¬œ |
| BE-ACCESS-006 | services/auth | STK-006 | BR-007 | P4 | M | T | â¬œ |
| BE-PROJECT-001 | services/projects | STK-006 | â€” | P2 | M | T | â¬œ |
| BE-PROJECT-002 | services/projects | STK-001 | CON-002 | P2 | M | T | â¬œ |
| BE-PROJECT-003 | services/projects | STK-006 | NFR-PRIV-001 | P2 | M | T | â¬œ |
| BE-PROJECT-004 | services/projects | STK-003 | NFR-REL-002 | P4 | M | T | â¬œ |
| BE-PROJECT-005 | services/projects | STK-003 | CON-010, NFR-MAINT-001 | P2 | M | T | â¬œ |
| BE-PROJECT-006 | services/projects | STK-004 | â€” | P4 | S | T | â¬œ |
| BE-PROJECT-007 | services/projects | STK-002, STK-004 | â€” | P4 | C | T | â¬œ |
| BE-PROJECT-008 | services/projects | STK-006 | NFR-PRIV-003 | P4 | S | T | â¬œ |
| BE-VERSION-001 | services/projects | STK-003 | BR-007 | P4 | M | T | â¬œ |
| BE-VERSION-002 | services/projects | STK-003 | BR-007 | P2 | M | T | â¬œ |
| BE-VERSION-003 | services/projects | STK-003 | BR-007 | P2 | M | T | â¬œ |
| BE-VERSION-004 | services/projects | STK-003 | BR-007 | P4 | S | T | â¬œ |
| BE-VERSION-005 | services/projects | STK-003 | BR-007 | P4 | C | T | â¬œ |
| BE-GEO-001 | services/geospatial | STK-001 | BR-004, DEP-002 | P3 | M | T | â¬œ |
| BE-GEO-002 | services/geospatial | STK-002 | BR-002 | P3 | M | T | â¬œ |
| BE-GEO-003 | services/geospatial | STK-002 | BR-008 | P3 | S | T | â¬œ |
| BE-GEO-004 | services/geospatial | STK-001 | BR-004, NFR-COMPAT-002 | P3 | M | T | â¬œ |
| BE-GEO-005 | services/geospatial | STK-001 | NFR-LEGAL-002, DEP-003 | P3 | S | T | â¬œ |
| BE-IMPORT-001 | services/geospatial | STK-001, STK-007 | BR-005 | P3 | M | T | â¬œ |
| BE-IMPORT-002 | services/geospatial | STK-001 | BR-004 | P3 | M | T | â¬œ |
| BE-IMPORT-003 | services/geospatial | STK-007 | NFR-REL-003 | P3 | M | T | â¬œ |
| BE-EXPORT-001 | services/geospatial | STK-004, STK-007 | BR-005 | P3 | M | T | â¬œ |
| BE-EXPORT-002 | services/geospatial | STK-004 | BR-005 | P3 | S | T | â¬œ |
| BE-EXPORT-003 | services/geospatial | STK-004 | BR-005 | P3 | S | D | â¬œ |
| BE-JOB-001 | services/geospatial | STK-001, STK-007 | NFR-PERF-005 | P3 | M | T | â¬œ |
| BE-JOB-002 | services/geospatial | STK-007 | NFR-OBS-002 | P3 | M | T | â¬œ |
| BE-JOB-003 | services/geospatial | STK-007 | â€” | P3 | S | T | â¬œ |
| BE-JOB-004 | services/geospatial | STK-004, STK-007 | NFR-SEC-002 | P3 | S | T | â¬œ |
| BE-STORAGE-001 | services/projects | STK-001, STK-004 | â€” | P3 | M | T | â¬œ |
| BE-STORAGE-002 | services/projects | STK-006 | NFR-PRIV-001 | P3 | M | T | â¬œ |
| BE-STORAGE-003 | services/projects | STK-007 | NFR-SEC-006 | P3 | S | T | â¬œ |
| BE-STORAGE-004 | services/projects | STK-006 | NFR-PRIV-003 | P4 | S | T | â¬œ |
| BE-COLLAB-001 | services/collaboration | STK-003 | BR-003 | P4 | M | T | â¬œ |
| BE-COLLAB-002 | services/collaboration | STK-003 | NFR-REL-002 | P4 | M | T | â¬œ |
| BE-COLLAB-003 | services/collaboration | STK-003 | BR-003 | P4 | M | T | â¬œ |
| BE-COLLAB-004 | services/collaboration | STK-003 | BR-003 | P4 | C | T | â¬œ |
| BE-COLLAB-005 | services/collaboration | STK-003 | NFR-REL-005 | P4 | S | T | â¬œ |
| BE-COLLAB-006 | services/collaboration | STK-003 | CON-002, NFR-REL-005 | P5 | C | T | â¬œ |
| BE-COMMENT-001 | services/collaboration | STK-003 | BR-003 | P4 | M | T | â¬œ |
| BE-COMMENT-002 | services/collaboration | STK-003 | BR-003 | P4 | M | T | â¬œ |
| BE-COMMENT-003 | services/collaboration | STK-003 | BR-003 | P4 | S | T | â¬œ |
| BE-COMMENT-004 | services/collaboration | STK-003 | â€” | P4 | C | T | â¬œ |
| BE-NOTIFY-001 | services/collaboration | STK-003, STK-006 | BR-003 | P4 | S | T | â¬œ |
| BE-NOTIFY-002 | services/collaboration | STK-003, STK-006 | â€” | P4 | S | T | â¬œ |
| BE-NOTIFY-003 | services/collaboration | STK-006 | NFR-PRIV-004 | P4 | C | T | â¬œ |
| BE-SEARCH-001 | services/projects | STK-006 | â€” | P2 | M | T | â¬œ |
| BE-SEARCH-002 | services/projects | STK-006 | â€” | P2 | S | T | â¬œ |
| BE-SEARCH-003 | services/projects | STK-006 | â€” | P4 | C | T | â¬œ |
| BE-AUDIT-001 | services/projects | STK-003, STK-006 | BR-007 | P4 | M | T | â¬œ |
| BE-AUDIT-002 | services/projects | STK-006 | BR-007 | P4 | S | T | â¬œ |
| BE-AUDIT-003 | services/projects | STK-003 | NFR-SEC-001 | P4 | C | A | â¬œ |
| BE-AUDIT-004 | services/projects | STK-006 | NFR-SEC-001 | P4 | S | T | â¬œ |
| BE-WEBHOOK-001 | all services | STK-007 | BR-010 | P5 | C | T | â¬œ |
| BE-WEBHOOK-002 | all services | STK-007 | NFR-SEC-001 | P5 | C | T | â¬œ |
| BE-API-001 | all services | STK-007 | BR-010 | P3 | S | I | â¬œ |
| BE-API-002 | all services | STK-007 | NFR-SEC-003 | P3 | M | T | â¬œ |
| BE-API-003 | all services | STK-007 | NFR-MAINT-005 | P3 | S | I | â¬œ |
| BE-API-004 | all services | STK-007 | BR-005 | P3 | S | T | â¬œ |
| BE-API-005 | all services | STK-007 | NFR-REL-001 | P3 | S | T | â¬œ |
| BE-API-006 | all services | STK-007 | NFR-MAINT-001 | P3 | S | I | â¬œ |
| BE-API-007 | all services | STK-007 | NFR-OBS-002 | P3 | S | I | â¬œ |
| BE-API-008 | all services | STK-007 | NFR-REL-002 | P3 | S | T | â¬œ |
| BE-SHEET-001 | services/geospatial | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| BE-SHEET-002 | services/geospatial | STK-008 | BR-012 | P6 | M | T | â¬œ |
| BE-SHEET-003 | services/geospatial | STK-008 | BR-012 | P6 | M | T | â¬œ |
| BE-SHEET-004 | services/geospatial | STK-008 | BR-012 | P6 | M | T | â¬œ |
| BE-SHEET-005 | services/geospatial | STK-008 | NFR-PLOT-001, NFR-PLOT-002 | P6 | M | A | â¬œ |
| BE-SHEET-006 | services/geospatial | STK-008 | NFR-REL-003 | P6 | M | T | â¬œ |
| BE-TEMPLATE-001 | services/projects | STK-008, STK-006 | BR-012 | P6 | M | T | â¬œ |
| BE-TEMPLATE-002 | services/projects | STK-008, STK-006 | BR-012 | P6 | S | T | â¬œ |
| BE-TEMPLATE-003 | services/projects | STK-006 | BR-012, NFR-MAINT-005 | P6 | S | T | â¬œ |
| BE-TEMPLATE-004 | services/projects | STK-006 | NFR-PRIV-001 | P6 | M | T | â¬œ |
| BE-PLOT-001 | services/geospatial | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| BE-PLOT-002 | services/geospatial | STK-008, STK-007 | BR-012, NFR-PERF-005 | P6 | M | T | â¬œ |
| BE-PLOT-003 | services/geospatial | STK-008, STK-007 | NFR-SEC-002 | P6 | M | T | â¬œ |
| BE-PLOT-004 | services/geospatial | STK-008 | NFR-PLOT-002 | P6 | S | T | â¬œ |
| BE-PLOT-005 | services/geospatial | STK-008 | BR-012, DEP-005 | P6 | S | T | â¬œ |
| BE-PLOT-006 | services/geospatial | STK-008 | NFR-REL-003 | P6 | S | T | â¬œ |
| BE-SCHEDULE-001 | services/projects | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| BE-SCHEDULE-002 | services/projects | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| BE-SCHEDULE-003 | services/projects | STK-008 | NFR-REL-002 | P6 | M | T | â¬œ |
| BE-SCHEDULE-004 | services/projects | STK-007 | BR-005 | P6 | S | T | â¬œ |
| BE-PACKAGE-001 | services/projects | STK-008 | BR-012, BR-007 | P6 | M | T | â¬œ |
| BE-PACKAGE-002 | services/projects | STK-008 | BR-012, DEP-005 | P6 | M | T | â¬œ |
| BE-PACKAGE-003 | services/projects | STK-008, STK-003 | NFR-SEC-001, BR-007 | P6 | S | T | â¬œ |
| BE-PACKAGE-004 | services/projects | STK-003, STK-008 | NFR-AVAIL-002, BR-007 | P6 | M | T | â¬œ |
| BE-PACKAGE-005 | services/projects | STK-003 | BR-007, NFR-SEC-001 | P6 | S | T | â¬œ |

### C.3 Domain model â€” module `packages/domain` Â· source [domain-requirements.md](../02-functional/domain-requirements.md)

| Req | â†‘ Stakeholder | â†‘ Business / Constraint / NFR | Phase | Pri | V | Status |
| --- | --- | --- | :--: | :--: | :--: | :--: |
| DOM-CRS-001 | STK-001 | BR-004, CON-004 | P1 | M | T | â¬œ |
| DOM-CRS-002 | STK-001 | DEP-002 | P1 | M | T | â¬œ |
| DOM-CRS-003 | STK-001 | BR-004 | P1 | M | T | â¬œ |
| DOM-CRS-004 | STK-001 | NFR-COMPAT-002 | P1 | M | T | â¬œ |
| DOM-UNIT-001 | STK-001 | BR-004, CON-004 | P1 | M | T | â¬œ |
| DOM-UNIT-002 | STK-001 | BR-004 | P1 | M | T | â¬œ |
| DOM-UNIT-003 | STK-001 | BR-004 | P1 | M | T | â¬œ |
| DOM-UNIT-004 | STK-001 | BR-004, BR-008 | P1 | M | T | â¬œ |
| DOM-UNIT-005 | STK-001 | BR-004 | P1 | S | T | â¬œ |
| DOM-GEOM-001 | STK-001 | BR-002 | P1 | M | T | â¬œ |
| DOM-GEOM-002 | STK-001 | BR-004 | P1 | M | T | â¬œ |
| DOM-GEOM-003 | STK-001 | NFR-REL-003 | P1 | M | T | â¬œ |
| DOM-GEOM-004 | STK-002 | BR-008 | P1 | S | T | â¬œ |
| DOM-GEOM-005 | STK-001 | BR-002 | P2 | S | T | â¬œ |
| DOM-GEOM-006 | STK-001 | BR-002 | P1 | S | T | â¬œ |
| DOM-GEOM-007 | STK-001 | BR-002 | P1 | S | T | â¬œ |
| DOM-GEOM-008 | STK-001 | BR-002 | P2 | S | T | â¬œ |
| DOM-GEOM-009 | STK-001 | NFR-REL-003 | P1 | M | T | â¬œ |
| DOM-GEOM-010 | STK-001 | BR-005 | P2 | C | T | â¬œ |
| DOM-GEOM-011 | STK-001 | NFR-COMPAT-001 | P1 | S | T | â¬œ |
| DOM-SURVEY-001 | STK-001 | BR-002 | P2 | S | T | â¬œ |
| DOM-SURVEY-002 | STK-001 | BR-004 | P2 | S | T | â¬œ |
| DOM-SURVEY-003 | STK-001 | NFR-REL-003 | P3 | C | T | â¬œ |
| DOM-IDENT-001 | STK-003 | BR-003 | P1 | M | T | â¬œ |
| DOM-IDENT-002 | STK-001 | NFR-REL-003 | P1 | M | T | â¬œ |
| DOM-IDENT-003 | STK-002 | BR-002 | P2 | C | T | â¬œ |
| DOM-LAYER-001 | STK-002 | BR-002 | P1 | M | T | â¬œ |
| DOM-LAYER-002 | STK-002 | BR-002 | P1 | M | T | â¬œ |
| DOM-LAYER-003 | STK-002 | BR-002 | P1 | M | T | â¬œ |
| DOM-SITE-001 | STK-002 | BR-002 | P1 | M | T | â¬œ |
| DOM-SITE-002 | STK-001 | BR-004, CON-004 | P1 | M | T | â¬œ |
| DOM-PARCEL-001 | STK-001 | BR-002 | P1 | M | T | â¬œ |
| DOM-PARCEL-002 | STK-001 | BR-008 | P1 | M | T | â¬œ |
| DOM-PARCEL-003 | STK-001 | BR-002 | P1 | S | T | â¬œ |
| DOM-PARCEL-004 | STK-001 | NFR-REL-003 | P2 | S | T | â¬œ |
| DOM-PARCEL-005 | STK-004 | BR-008 | P2 | S | T | â¬œ |
| DOM-PARCEL-006 | STK-001 | BR-002 | P2 | S | T | â¬œ |
| DOM-PARCEL-007 | STK-001 | BR-008 | P1 | M | T | â¬œ |
| DOM-LOT-001 | STK-001 | BR-002 | P1 | M | T | â¬œ |
| DOM-LOT-002 | STK-001 | BR-008 | P1 | M | T | â¬œ |
| DOM-LOT-003 | STK-001 | BR-002 | P1 | M | T | â¬œ |
| DOM-BLOCK-001 | STK-001 | BR-002 | P1 | M | T | â¬œ |
| DOM-BLOCK-002 | STK-001 | BR-002 | P2 | S | T | â¬œ |
| DOM-BLOCK-003 | STK-001 | BR-008 | P1 | S | T | â¬œ |
| DOM-ZONE-001 | STK-002 | BR-002 | P1 | M | T | â¬œ |
| DOM-ZONE-002 | STK-002 | BR-008 | P1 | M | T | â¬œ |
| DOM-ZONE-003 | STK-002 | BR-002 | P1 | S | T | â¬œ |
| DOM-LANDUSE-001 | STK-002 | BR-002 | P1 | M | T | â¬œ |
| DOM-LANDUSE-002 | STK-002 | BR-008 | P1 | M | T | â¬œ |
| DOM-LANDUSE-003 | STK-002 | BR-002 | P1 | S | T | â¬œ |
| DOM-ROW-001 | STK-001 | BR-002 | P1 | S | T | â¬œ |
| DOM-ROW-002 | STK-001 | BR-002 | P2 | S | T | â¬œ |
| DOM-ROW-003 | STK-001 | BR-002 | P2 | S | T | â¬œ |
| DOM-EASEMENT-001 | STK-004 | BR-002 | P2 | S | T | â¬œ |
| DOM-EASEMENT-002 | STK-004 | BR-008 | P2 | S | T | â¬œ |
| DOM-DEDICATION-001 | STK-001 | BR-002 | P2 | S | T | â¬œ |
| DOM-DEDICATION-002 | STK-004 | BR-008 | P2 | S | T | â¬œ |
| DOM-SETBACK-001 | STK-004 | BR-002 | P1 | M | T | â¬œ |
| DOM-SETBACK-002 | STK-004 | BR-008 | P2 | S | T | â¬œ |
| DOM-SETBACK-003 | STK-004 | BR-008 | P2 | M | T | â¬œ |
| DOM-SETBACK-004 | STK-004 | BR-008 | P5 | C | T | â¬œ |
| DOM-BUILDING-001 | STK-004 | BR-008 | P1 | M | T | â¬œ |
| DOM-BUILDING-002 | STK-004 | BR-008 | P2 | S | T | â¬œ |
| DOM-BUILDING-003 | STK-004 | BR-008 | P2 | S | T | â¬œ |
| DOM-BUILDING-004 | STK-002 | BR-008 | P2 | S | T | â¬œ |
| DOM-ENVELOPE-001 | STK-004 | BR-008 | P5 | S | T | â¬œ |
| DOM-ENVELOPE-002 | STK-004 | BR-008 | P5 | S | T | â¬œ |
| DOM-ENVELOPE-003 | STK-004 | BR-008 | P5 | W | T | â¬œ |
| DOM-OPENSPACE-001 | STK-002 | BR-008 | P2 | S | T | â¬œ |
| DOM-OPENSPACE-002 | STK-002 | BR-008 | P5 | C | T | â¬œ |
| DOM-PARKING-001 | STK-004 | BR-008 | P2 | S | T | â¬œ |
| DOM-PARKING-002 | STK-004 | BR-008 | P5 | S | T | â¬œ |
| DOM-INFRA-001 | STK-001 | BR-002 | P5 | C | T | â¬œ |
| DOM-INFRA-002 | STK-001 | BR-002 | P5 | C | T | â¬œ |
| DOM-SUBDIV-001 | STK-001 | BR-002 | P1 | M | T | â¬œ |
| DOM-SUBDIV-002 | STK-001 | NFR-REL-003 | P2 | S | T | â¬œ |
| DOM-SUBDIV-003 | STK-004 | BR-008 | P2 | S | T | â¬œ |
| DOM-METRIC-001 | STK-002 | BR-008 | P1 | M | T | â¬œ |
| DOM-METRIC-002 | STK-002 | BR-008 | P1 | M | T | â¬œ |
| DOM-METRIC-003 | STK-004 | BR-008 | P1 | M | T | â¬œ |
| DOM-METRIC-004 | STK-002 | BR-008 | P1 | M | T | â¬œ |
| DOM-METRIC-005 | STK-002 | BR-008 | P1 | S | T | â¬œ |
| DOM-METRIC-006 | STK-001 | BR-004, NFR-COMPAT-002 | P1 | M | T | â¬œ |
| DOM-METRIC-007 | STK-004 | BR-008 | P1 | M | T | â¬œ |
| DOM-METRIC-008 | STK-004 | BR-008 | P5 | C | T | â¬œ |
| DOM-COMPLY-001 | STK-002 | BR-008 | P5 | S | T | â¬œ |
| DOM-COMPLY-002 | STK-002 | BR-008 | P5 | S | T | â¬œ |
| DOM-COMPLY-003 | STK-002 | BR-008 | P5 | S | T | â¬œ |
| DOM-COMPLY-004 | STK-002 | BR-008 | P5 | S | T | â¬œ |
| DOM-COMPLY-005 | STK-002 | BR-008 | P5 | S | T | â¬œ |
| DOM-COMPLY-006 | STK-003 | BR-008 | P5 | C | T | â¬œ |
| DOM-SCENARIO-001 | STK-002 | BR-001 | P5 | S | T | â¬œ |
| DOM-SCENARIO-002 | STK-002 | BR-008 | P5 | S | T | â¬œ |
| DOM-SCENARIO-003 | STK-002 | BR-008 | P5 | C | T | â¬œ |
| DOM-SERIAL-001 | STK-007 | BR-005, CON-002 | P1 | M | T | â¬œ |
| DOM-SERIAL-002 | STK-007 | NFR-MAINT-001 | P1 | M | T | â¬œ |
| DOM-SERIAL-003 | STK-007 | NFR-REL-003 | P1 | M | T | â¬œ |
| DOM-COMPUTE-001 | STK-002 | NFR-REL-002 | P1 | M | T | â¬œ |
| DOM-COMPUTE-002 | STK-002 | BR-008 | P1 | S | T | â¬œ |
| DOM-SNAPSHOT-001 | STK-003 | BR-003 | P1 | M | T | â¬œ |
| DOM-SNAPSHOT-002 | STK-003 | BR-003 | P5 | C | T | â¬œ |
| DOM-SHEET-001 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-SHEET-002 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| DOM-SHEET-003 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-SHEET-004 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-SHEET-005 | STK-008 | NFR-REL-002 | P6 | M | T | â¬œ |
| DOM-SHEET-006 | STK-008 | BR-012, CON-004 | P6 | M | T | â¬œ |
| DOM-SHEET-007 | STK-008 | BR-012, CON-011 | P6 | S | T | â¬œ |
| DOM-TITLEBLOCK-001 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-TITLEBLOCK-002 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-TITLEBLOCK-003 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| DOM-TITLEBLOCK-004 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| DOM-SHEETSET-001 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-SHEETSET-002 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| DOM-SHEETSET-003 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-SHEETSET-004 | STK-008 | NFR-REL-003 | P6 | M | T | â¬œ |
| DOM-DISCIPLINE-001 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-DISCIPLINE-002 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-DISCIPLINE-003 | STK-008 | BR-012 | P6 | C | T | â¬œ |
| DOM-NUMBERING-001 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-NUMBERING-002 | STK-008 | BR-012 | P6 | C | T | â¬œ |
| DOM-NUMBERING-003 | STK-008 | NFR-REL-003, CON-012 | P6 | M | T | â¬œ |
| DOM-LAYERSTD-001 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-LAYERSTD-002 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-LAYERSTD-003 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| DOM-LAYERSTD-004 | STK-008 | NFR-STD-001 | P6 | S | T | â¬œ |
| DOM-PLOTSTYLE-001 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-PLOTSTYLE-002 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-PLOTSTYLE-003 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| DOM-PLOTSTYLE-004 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| DOM-SYMBOL-001 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-SYMBOL-002 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-SYMBOL-003 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-SYMBOL-004 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-SYMBOL-005 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| DOM-DIM-001 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-DIM-002 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| DOM-DIM-003 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-DIM-004 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-DIM-005 | STK-008 | BR-004, BR-012 | P6 | M | T | â¬œ |
| DOM-ANNO-001 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-ANNO-002 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-ANNO-003 | STK-008 | BR-012, CON-011 | P6 | S | T | â¬œ |
| DOM-ANNO-004 | STK-008 | NFR-REL-003 | P6 | M | T | â¬œ |
| DOM-GRID-001 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-GRID-002 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| DOM-GRID-003 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| DOM-GRID-004 | STK-008 | CON-012 | P6 | M | T | â¬œ |
| DOM-MATCHLINE-001 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-MATCHLINE-002 | STK-008 | CON-012 | P6 | M | T | â¬œ |
| DOM-MATCHLINE-003 | STK-008 | NFR-REL-003 | P6 | M | T | â¬œ |
| DOM-MATCHLINE-004 | STK-008 | NFR-REL-003 | P6 | M | T | â¬œ |
| DOM-SCHEDULE-001 | STK-008 | BR-012, CON-012 | P6 | M | T | â¬œ |
| DOM-SCHEDULE-002 | STK-008 | CON-012 | P6 | M | T | â¬œ |
| DOM-SCHEDULE-003 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-SCHEDULE-004 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| DOM-SCHEDULE-005 | STK-008 | NFR-REL-002 | P6 | M | T | â¬œ |
| DOM-REV-001 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-REV-002 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| DOM-REV-003 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| DOM-ISSUE-001 | STK-008 | BR-012, BR-007 | P6 | M | T | â¬œ |
| DOM-ISSUE-002 | STK-008, STK-003 | BR-007, NFR-SEC-001 | P6 | M | T | â¬œ |
| DOM-ISSUE-003 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-XREF-001 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| DOM-XREF-002 | STK-008 | CON-012 | P6 | M | T | â¬œ |
| DOM-XREF-003 | STK-008 | NFR-REL-003 | P6 | M | T | â¬œ |

### C.4 Interoperability â€” module `services/geospatial` (+`apps/web` via `FE-IO`) Â· source [interoperability-requirements.md](../02-functional/interoperability-requirements.md)

| Req | â†‘ Stakeholder | â†‘ Business / Constraint / NFR | Phase | Pri | V | Status |
| --- | --- | --- | :--: | :--: | :--: | :--: |
| IOP-GEOJSON-001 | STK-001, STK-007 | BR-005 | P3 | M | T | â¬œ |
| IOP-GEOJSON-002 | STK-007 | BR-005 | P3 | M | T | â¬œ |
| IOP-GEOJSON-003 | STK-001 | BR-004 | P3 | M | T | â¬œ |
| IOP-KML-001 | STK-001 | BR-005 | P3 | S | T | â¬œ |
| IOP-KML-002 | STK-007 | BR-005 | P3 | S | T | â¬œ |
| IOP-SHP-001 | STK-001 | BR-005 | P3 | M | T | â¬œ |
| IOP-SHP-002 | STK-001 | BR-004 | P3 | M | T | â¬œ |
| IOP-SHP-003 | STK-007 | BR-005 | P3 | S | T | â¬œ |
| IOP-DXF-001 | STK-001, STK-004 | BR-005 | P3 | M | T | â¬œ |
| IOP-DXF-002 | STK-001 | BR-005 | P3 | S | T | â¬œ |
| IOP-DXF-003 | STK-001 | BR-004 | P3 | M | D | â¬œ |
| IOP-DXF-004 | STK-004 | BR-005 | P3 | S | T | â¬œ |
| IOP-GPKG-001 | STK-007 | BR-005 | P3 | C | T | â¬œ |
| IOP-GPKG-002 | STK-007 | BR-005 | P3 | C | T | â¬œ |
| IOP-PDF-001 | STK-004, STK-005 | BR-005 | P3 | S | D | â¬œ |
| IOP-PDF-002 | STK-004 | BR-008 | P3 | C | D | â¬œ |
| IOP-CSV-001 | STK-007 | BR-005 | P3 | C | T | â¬œ |
| IOP-CSV-002 | STK-004 | BR-005 | P3 | C | T | â¬œ |
| IOP-RASTER-001 | STK-001, STK-004 | BR-005 | P3 | M | T | â¬œ |
| IOP-RASTER-002 | STK-001 | BR-004 | P3 | S | D | â¬œ |
| IOP-RASTER-003 | STK-001 | CON-005 | P3 | S | I | â¬œ |
| IOP-FIELD-001 | STK-001, STK-007 | BR-005 | P3 | M | D | â¬œ |
| IOP-FIELD-002 | STK-007 | BR-005 | P3 | S | T | â¬œ |
| IOP-ENC-001 | STK-001 | BR-005, NFR-COMPAT-001 | P3 | M | T | â¬œ |
| IOP-BUNDLE-001 | STK-001, STK-005 | BR-005 | P3 | M | T | â¬œ |
| IOP-BUNDLE-002 | STK-001 | BR-004 | P3 | S | D | â¬œ |
| IOP-STREAM-001 | STK-007 | BR-005 | P3 | S | A | â¬œ |
| IOP-STREAM-002 | STK-007 | NFR-REL-003 | P3 | M | T | â¬œ |
| IOP-IDENT-001 | STK-001, STK-007 | NFR-COMPAT-001 | P3 | S | T | â¬œ |
| IOP-SCHEMA-001 | STK-007 | BR-005, CON-005 | P3 | M | I | â¬œ |
| IOP-GEOMX-001 | STK-001 | BR-005, NFR-REL-003 | P3 | M | T | â¬œ |
| IOP-PREC-001 | STK-007 | BR-005, NFR-COMPAT-001 | P3 | S | T | â¬œ |
| IOP-CRSX-001 | STK-001 | BR-004 | P3 | M | T | â¬œ |
| IOP-CRSX-002 | STK-001 | BR-004 | P3 | M | T | â¬œ |
| IOP-CRSX-003 | STK-001 | NFR-COMPAT-002 | P3 | S | D | â¬œ |
| IOP-DXFSHEET-001 | STK-008 | BR-012, DEP-006 | P6 | M | T | â¬œ |
| IOP-DXFSHEET-002 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| IOP-DXFSHEET-003 | STK-008 | BR-012 | P6 | M | T | â¬œ |
| IOP-DXFSHEET-004 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| IOP-DXFSHEET-005 | STK-008 | BR-012, CON-011 | P6 | M | T | â¬œ |
| IOP-DXFSHEET-006 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| IOP-PDFSHEET-001 | STK-008 | BR-012, DEP-005 | P6 | M | T | â¬œ |
| IOP-PDFSHEET-002 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| IOP-PDFSHEET-003 | STK-008 | BR-012, DEP-005 | P6 | S | T | â¬œ |
| IOP-PDFSHEET-004 | STK-008 | BR-012, DEP-005 | P6 | C | T | â¬œ |
| IOP-PDFSHEET-005 | STK-008 | NFR-PLOT-002, DEP-005 | P6 | M | T | â¬œ |
| IOP-PDFSHEET-006 | STK-008 | NFR-PLOT-001 | P6 | M | A | â¬œ |
| IOP-PDFSHEET-007 | STK-008 | BR-012, DEP-005 | P6 | S | T | â¬œ |
| IOP-PDFSHEET-008 | STK-008, STK-003 | BR-007 | P6 | S | T | â¬œ |
| IOP-PLTSTYLE-001 | STK-008 | BR-012, CON-011 | P6 | S | T | â¬œ |
| IOP-PLTSTYLE-002 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| IOP-LAYERMAP-001 | STK-008 | BR-012, CON-011 | P6 | M | D | â¬œ |
| IOP-LAYERMAP-002 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| IOP-LAYERMAP-003 | STK-008 | BR-012 | P6 | S | T | â¬œ |
| IOP-TITLEBLOCK-001 | STK-008 | BR-012, DEP-006 | P6 | S | T | â¬œ |
| IOP-TITLEBLOCK-002 | STK-008 | BR-012, CON-011 | P6 | S | D | â¬œ |
| IOP-TITLEBLOCK-003 | STK-008 | BR-012 | P6 | C | T | â¬œ |
| IOP-BLOCK-001 | STK-008 | BR-012, DEP-006 | P6 | S | T | â¬œ |
| IOP-BLOCK-002 | STK-008 | BR-012 | P6 | S | T | â¬œ |

---

## Matrix D â€” Non-functional â†’ constrained scope

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

## Matrix E â€” Phase coverage (roadmap alignment)

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

## Matrix F â€” Module coverage

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

> Verification **evidence** (test-case IDs `TC-â€¦`) attaches here once a test
> suite exists; today the matrix specifies the method, per the
> [conventions](../00-overview/standards-and-conventions.md#verification-methods).


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

