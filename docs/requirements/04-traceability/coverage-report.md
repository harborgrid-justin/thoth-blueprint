# Coverage Report

Validates the [traceability matrix](traceability-matrix.md) against the suite's
coverage rules `R1`â€“`R5`
([standards & conventions](../00-overview/standards-and-conventions.md#traceability-model)).
The RTM is **generated** from the requirement source files and validated by
[`_meta/scripts/validate.py`](../_meta/scripts/validate.py); this report records
the result. Date of last validation: **2026-07-20**.

## Requirement inventory

| Layer | File | Count |
| --- | --- | :--: |
| Business (`BR`) | [business-requirements.md](../01-business/business-requirements.md) | 12 |
| Stakeholder (`STK`) | [stakeholders.md](../01-business/stakeholders.md) | 8 |
| Functional â€” Frontend (`FE`) | [frontend-requirements.md](../02-functional/frontend-requirements.md) | 175 |
| Functional â€” Backend (`BE`) | [backend-requirements.md](../02-functional/backend-requirements.md) | 100 |
| Functional â€” Domain (`DOM`) | [domain-requirements.md](../02-functional/domain-requirements.md) | 166 |
| Functional â€” Interop (`IOP`) | [interoperability-requirements.md](../02-functional/interoperability-requirements.md) | 59 |
| Non-functional (`NFR`) | [nonfunctional-requirements.md](../03-nonfunctional/nonfunctional-requirements.md) | 86 |
| Constraints (`CON`) | [scope-and-context.md](../00-overview/scope-and-context.md) | 12 |
| Dependencies (`DEP`) | [scope-and-context.md](../00-overview/scope-and-context.md) | 6 |
| **Total** | | **624** |

Functional total: **500**.

## Automated validation

`validate.py` output (must be green in CI alongside the link check):

```
Functional requirements: 500
NFRs: 86 | BR: 12 | STK: 8 | CON: 12 | DEP: 6
PASS â€” R1â€“R5 and ID hygiene OK.
```

## Rule-by-rule validation

### R1 â€” every `BR` traces down to at least one `STK` âœ…

All 12 business requirements are served by at least one stakeholder
([Matrix A](traceability-matrix.md#matrix-a--business--stakeholder)). `validate.py`
confirms every `BR` except `BR-011` (a delivery requirement realized via the phase
mapping) appears in some stakeholder's **Satisfies** list. `BR-012`
(architecture & engineering CAD sheets) is claimed by `STK-004` and `STK-008`.

### R2 â€” every `STK` traces down to at least one functional requirement âœ…

`validate.py` confirms all of `STK-001`â€“`STK-008` appear in at least one functional
requirement's **Trace** column. `STK-008` is traced across the new Phase-6
functional areas (`FE-SHEET*`, `FE-VIEWPORT`, `FE-TITLE`, `FE-PLOT`, `FE-ANNO`,
`FE-SYMBOL`, `FE-GRIDLINE`, `FE-MATCHLINE`, `FE-SCHEDULE`, `FE-REV`,
`FE-SHEETSET`, the `BE-SHEET`/`BE-TEMPLATE`/`BE-PLOT`/`BE-SCHEDULE`/`BE-PACKAGE`
services, and the `DOM-SHEET*`/`DOM-TITLEBLOCK`/`DOM-SHEETSET`/`DOM-PLOTSTYLE`/
`DOM-SYMBOL`/`DOM-DIM`/`DOM-ANNO`/`DOM-LAYERSTD`/`DOM-GRID`/`DOM-SCHEDULE`/
`DOM-REV`/`DOM-ISSUE`/`DOM-XREF`/`DOM-MATCHLINE`/`DOM-DISCIPLINE`/`DOM-NUMBERING`
model and the `IOP-DXFSHEET`/`IOP-PDFSHEET`/`IOP-PLTSTYLE`/`IOP-LAYERMAP`/
`IOP-TITLEBLOCK`/`IOP-BLOCK` interop).

### R3 â€” every functional requirement traces up to â‰¥1 `STK` and maps to one module âœ…

Generation guarantees this: `gen_rtm.py` emits a row only from a source
requirement, buckets its `Trace` into the â†‘ Stakeholder column, and assigns exactly
one module ([Matrix F](traceability-matrix.md#matrix-f--module-coverage)).
`validate.py` fails the build if any functional requirement lacks an STK up-trace.

### R4 â€” every functional requirement has a verification method âœ…

`validate.py` confirms every functional row carries a valid `T`/`D`/`I`/`A` method;
distribution is in the
[verification method summary](traceability-matrix.md#verification-method-summary).

### R5 â€” every `NFR` names the requirements/modules it constrains âœ…

`validate.py` confirms all 86 NFRs have a non-empty **Constrains** cell
([Matrix D](traceability-matrix.md#matrix-d--non-functional--constrained-scope)).
The new `NFR-PLOT` (plot fidelity) and `NFR-STD` (standards conformance)
categories each constrain the Phase-6 CAD sheet requirements they govern.

### ID hygiene âœ…

`validate.py` confirms no duplicate IDs and that every `BR`/`STK`/`CON`/`DEP`
referenced in a functional trace exists.

## Business-requirement coverage detail

Downward reachability BR â†’ STK â†’ functional area (all âœ…):

| BR | Reaches functional areas (via STK) |
| --- | --- |
| BR-001 Web-native | FE-* workspace, FE-NAV, FE-STATE, FE-REVIEW |
| BR-002 Domain-native | DOM-* (incl. BUILDING, BLOCK), FE-CANVAS, FE-STYLE |
| BR-003 Collaboration | BE-COLLAB, BE-COMMENT, BE-NOTIFY, FE-PRESENCE, FE-NOTIFY, FE-REVIEW |
| BR-004 Spatial honesty | DOM-CRS, DOM-UNIT, DOM-GEOM, BE-GEO, IOP-CRSX, FE-PREFS |
| BR-005 Interoperability | IOP-*, BE-IMPORT, BE-EXPORT, BE-JOB, FE-IO |
| BR-006 Precision | FE-PRECISION, FE-MEASURE, FE-EDIT, FE-SELECT, FE-ANNO |
| BR-007 Governed & auditable | BE-VERSION, BE-AUDIT, BE-ACCESS, FE-PROJECT, DOM-ISSUE, BE-PACKAGE |
| BR-008 Planning intelligence | DOM-METRIC, DOM-COMPLY, DOM-BUILDING, FE-METRIC |
| BR-009 Full spectrum | BE-ACCESS, FE-ACCOUNT, FE-HELP, FE-REVIEW, NFR-A11Y |
| BR-010 Open & self-hostable | BE-API, BE-WEBHOOK, NFR-PORT, NFR-LEGAL |
| BR-011 Incremental delivery | realized via Phase mapping (Matrix E) |
| BR-012 Arch/eng CAD sheets | FE-SHEET*, FE-VIEWPORT, FE-TITLE, FE-PLOT, FE-ANNO, FE-SYMBOL, FE-GRIDLINE, FE-MATCHLINE, FE-SCHEDULE, FE-REV, FE-SHEETSET, BE-SHEET, BE-TEMPLATE, BE-PLOT, BE-SCHEDULE, BE-PACKAGE, DOM-SHEET, DOM-TITLEBLOCK, DOM-SHEETSET, DOM-DISCIPLINE, DOM-NUMBERING, DOM-LAYERSTD, DOM-PLOTSTYLE, DOM-SYMBOL, DOM-DIM, DOM-ANNO, DOM-GRID, DOM-MATCHLINE, DOM-SCHEDULE, DOM-REV, DOM-ISSUE, DOM-XREF, IOP-DXFSHEET, IOP-PDFSHEET, IOP-PLTSTYLE, IOP-LAYERMAP, IOP-TITLEBLOCK, IOP-BLOCK, NFR-PLOT, NFR-STD |

## Frontend vs backend balance

The suite covers both front-end and back-end and now the CAD-sheet production
tier. Current split:

- **Frontend:** 175 requirements across 33 areas (`apps/web`).
- **Backend services:** 100 requirements across `auth`, `projects`,
  `geospatial`, `collaboration`, plus cross-service API/webhook areas.
- **Domain + interop (shared/backend):** 166 + 59 = 225 requirements.
- Backend-and-shared total (BE + DOM + IOP): **325**.

Every backend service module named in [ARCHITECTURE.md](../../ARCHITECTURE.md) has
requirements ([Matrix F](traceability-matrix.md#matrix-f--module-coverage)).
Phase-6 sheet work adds `BE-SHEET`, `BE-TEMPLATE`, `BE-PLOT`, `BE-SCHEDULE`, and
`BE-PACKAGE` inside the existing `services/geospatial` and `services/projects`
modules â€” no new architectural boundary is introduced.

## Third-pass changes (what the review added/fixed)

This report reflects a third review pass that added Phase 6 â€”
architecture & engineering CAD sheet production:

- **New business requirement `BR-012`** for producing complete architecture and
  engineering CAD sheet sets.
- **New stakeholder `STK-008`** â€” Architect / engineer / CAD manager â€” and
  `STK-004` extended with sheet-set output.
- **New Phase 6** in [`ROADMAP.md`](../../ROADMAP.md) covering sheet
  composition, title blocks, viewports at plot scale, discipline-organised
  sheet numbering, CAD layer standards (NCS/AIA/ISO 13567), annotative
  dimensions and symbols, coordination graphics (grids, levels, match-lines,
  callouts), data-driven schedules, revisions & issue management, and
  multi-sheet PDF / DXF / DWG export.
- **Scope adjusted** in [`scope-and-context.md`](../00-overview/scope-and-context.md):
  "multi-sheet construction plan sets" and "detailed construction
  documentation" removed from non-goals and folded into Phase 6; *engineering
  calculations* (structural, hydraulic, energy) and *3D BIM authoring*
  explicitly retained as non-goals so the scope shift is bounded.
- **Two new constraints:** `CON-011` (industry-standards conformance for
  sheets) and `CON-012` (sheets are compositions of the shared planning
  model, not a separate authoring surface).
- **Two new dependencies:** `DEP-005` (PDF generation runtime with PDF/A and
  PDF/E-1 conformance) and `DEP-006` (CAD interchange library for DXF/DWG
  sheet-set export).
- **New functional area codes** â€” Frontend: `SHEET`, `VIEWPORT`, `TITLE`,
  `PLOT`, `ANNO`, `SYMBOL`, `GRIDLINE`, `MATCHLINE`, `SCHEDULE`, `REV`,
  `SHEETSET`. Backend: `SHEET`, `TEMPLATE`, `PLOT`, `SCHEDULE`, `PACKAGE`.
  Domain: `SHEET`, `TITLEBLOCK`, `SHEETSET`, `DISCIPLINE`, `NUMBERING`,
  `LAYERSTD`, `PLOTSTYLE`, `SYMBOL`, `DIM`, `ANNO`, `GRID`, `MATCHLINE`,
  `SCHEDULE`, `REV`, `ISSUE`, `XREF`. Interop: `DXFSHEET`, `PDFSHEET`,
  `PLTSTYLE`, `LAYERMAP`, `TITLEBLOCK`, `BLOCK`.
- **Two new non-functional categories:** `NFR-PLOT` (plot fidelity: true-scale,
  lineweight, annotation size, colour, preview parity) and `NFR-STD`
  (verifiable conformance to ANSI/ASME Y14.1, ISO 5457, ISO 7200, NCS v6, ISO
  13567, ISO 128/129/3098, PDF/A-2, PDF/E-1).
- **Tolerances added:** plot scale tolerance (â‰¤ 0.2 mm on paper) and
  annotation-plot-size defaults (body 2.5 mm, headings 3.5 mm, arrowheads
  2.5 mm) so `NFR-PLOT` is measurable.
- **Benchmark scale added:** `NFR-BENCH-006` defines sheet-set reference
  datasets (`BENCH-SHEETS-SMALL/-TYPICAL/-LARGE`) and PERF/SCALE targets
  reference them.
- **Grounding** captured in
  [`_meta/research-cad-sheets.md`](../_meta/research-cad-sheets.md) â€”
  sheet-set anatomy, discipline designators, sheet numbering, layer
  standards, plot styles, dimensioning standards, model/paper/viewport,
  coordination graphics, schedules, revisions, and packaging.

## Second-pass changes (from the prior review pass, retained)

- **Benchmark/validation NFRs added** (`NFR-BENCH-001..005`) â€” quantitative
  targets are validated against named datasets on the reference hardware.
- **Missing domain primitive fixed:** `DOM-BUILDING-*` and `FE-CANVAS-011`.
- **Model-portability gaps filled:** `DOM-SERIAL-*`, `DOM-IDENT-*`,
  `DOM-SNAPSHOT-*`, and `BE-PROJECT-005`.
- **Unowned cross-service concerns given owners:** notifications, async jobs,
  asset storage, deletion cascade, dependencies register.
- **Scope hardened** for grading/earthwork, corridor/alignment, procedural 3D,
  financial pro forma, predictive simulation, and 3D BIM authoring.

## Known gaps & watch items

Honest accounting of what this suite still does **not** do:

1. **No `TC-â€¦` test cases yet.** Verification *methods* are assigned and
   `NFR-MAINT-006` now requires a traced `TC-â€¦` for every Must before its phase
   ships, but concrete test cases await a test suite (the repo is Phase-0 scaffold).
2. **Numeric NFR thresholds and tolerances are initial targets.** They are now
   pinned (benchmark datasets, tolerances table) so they are verifiable, but the
   specific numbers â€” including the Phase-6 plot scale and annotation-size
   defaults â€” will be confirmed by `NFR-BENCH-003`/`NFR-BENCH-006` benchmarking
   and may move.
3. **3D, engineering-calculation, procedural, financial, and simulation
   capabilities remain out of scope** â€” documented exclusions, not coverage
   gaps. Phase 6 produces the *drawings*, not the calculations that populate
   them.
4. **Sheet-set import from a DWG/DXF authored elsewhere** (`IOP-DXFSHEET-006`)
   is Should-priority for Phase 6 and depends on the depth of DXF/DWG parsing
   the chosen interchange library actually supports (`DEP-006`).

## How to regenerate & validate

```
python3 docs/requirements/_meta/scripts/gen_rtm.py     # regenerate the RTM from source
python3 docs/requirements/_meta/scripts/validate.py    # check R1â€“R5 + ID hygiene
```

Both are suitable for CI alongside a relative-link check. The source requirement
files are authoritative; the RTM is derived.

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

