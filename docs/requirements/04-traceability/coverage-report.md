# Coverage Report

Validates the [traceability matrix](traceability-matrix.md) against the suite's
own coverage rules `R1`–`R5`
([standards & conventions](../00-overview/standards-and-conventions.md#traceability-model)).
Regenerate this report whenever requirements change. Date of last manual
validation: **2026-07-19**.

## Requirement inventory

| Layer | File | Count |
| --- | --- | :--: |
| Business (`BR`) | [business-requirements.md](../01-business/business-requirements.md) | 11 |
| Stakeholder (`STK`) | [stakeholders.md](../01-business/stakeholders.md) | 7 |
| Functional — Frontend (`FE`) | [frontend-requirements.md](../02-functional/frontend-requirements.md) | 58 |
| Functional — Backend (`BE`) | [backend-requirements.md](../02-functional/backend-requirements.md) | 41 |
| Functional — Domain (`DOM`) | [domain-requirements.md](../02-functional/domain-requirements.md) | 55 |
| Functional — Interop (`IOP`) | [interoperability-requirements.md](../02-functional/interoperability-requirements.md) | 21 |
| Non-functional (`NFR`) | [nonfunctional-requirements.md](../03-nonfunctional/nonfunctional-requirements.md) | 42 |
| Constraints (`CON`) | [scope-and-context.md](../00-overview/scope-and-context.md) | 10 |
| **Total** | | **245** |

Functional total: **175**.

## Rule-by-rule validation

### R1 — every `BR` traces down to at least one `STK` ✅

All 11 business requirements are served by at least one stakeholder
([Matrix A](traceability-matrix.md#matrix-a--business--stakeholder)). No orphan
business requirements.

### R2 — every `STK` traces down to at least one functional requirement ✅

All 7 stakeholders decompose into functional areas
([Matrix B](traceability-matrix.md#matrix-b--stakeholder--functional-areas--module)),
each of which contains functional requirements. No stakeholder is a dead end.

### R3 — every functional requirement traces up to ≥1 `STK` and maps to exactly one module ✅

Every row in [Matrix C](traceability-matrix.md#matrix-c--master-requirement-traceability)
carries a stakeholder in its "↑ Stakeholder" column and sits under a single
architecture module ([Matrix F](traceability-matrix.md#matrix-f--module-coverage)).
No orphan features. Modules are assigned as: FE→`apps/web`, BE by area to
`services/*`, DOM→`packages/domain`, IOP→`services/geospatial` (+`apps/web` for
the wizard UI, specified separately as `FE-IO`).

### R4 — every functional requirement has a verification method ✅

Every row in Matrix C has a `V` value (T/D/I/A). Distribution is summarized in the
[verification method summary](traceability-matrix.md#verification-method-summary).

### R5 — every `NFR` names the requirements/modules it constrains ✅

All 46 NFRs list a "Constrains" scope
([Matrix D](traceability-matrix.md#matrix-d--non-functional--constrained-scope) and
the source tables). No free-floating quality attributes.

## Business-requirement coverage detail

Downward reachability BR → STK → functional area:

| BR | Reaches functional areas (via STK) | Covered |
| --- | --- | :--: |
| BR-001 Web-native | FE-* (workspace), FE-NAV, FE-REVIEW | ✅ |
| BR-002 Domain-native | DOM-*, FE-CANVAS, FE-STYLE, FE-METRIC | ✅ |
| BR-003 Collaboration | BE-COLLAB, BE-COMMENT, FE-PRESENCE, FE-REVIEW | ✅ |
| BR-004 Spatial honesty | DOM-CRS, DOM-UNIT, DOM-GEOM, BE-GEO, IOP-CRSX | ✅ |
| BR-005 Interoperability | IOP-*, BE-IMPORT, BE-EXPORT, FE-IO | ✅ |
| BR-006 Precision | FE-PRECISION, FE-MEASURE, FE-SELECT | ✅ |
| BR-007 Governed & auditable | BE-VERSION, BE-AUDIT, BE-ACCESS, FE-PROJECT | ✅ |
| BR-008 Planning intelligence | DOM-METRIC, DOM-COMPLY, FE-METRIC | ✅ |
| BR-009 Full spectrum | BE-ACCESS, FE-ACCOUNT, FE-REVIEW, NFR-A11Y | ✅ |
| BR-010 Open & self-hostable | BE-API, NFR-PORT, NFR-LEGAL | ✅ |
| BR-011 Incremental delivery | realized via Phase mapping (Matrix E) | ✅ |

## Frontend vs backend balance

The request explicitly required both front-end and back-end coverage. Confirmed:

- **Frontend:** 58 requirements across 13 areas (`apps/web`).
- **Backend:** 41 service requirements across `auth`, `projects`, `geospatial`,
  `collaboration`, plus a cross-service API area — **and** the 55 domain +
  21 interop requirements are predominantly backend/shared-library concerns.
- Backend-and-shared total (BE + DOM + IOP): **117**.

Every backend service module named in [ARCHITECTURE.md](../../ARCHITECTURE.md) has
requirements ([Matrix F](traceability-matrix.md#matrix-f--module-coverage)).

## Known gaps & watch items

Honest accounting of what this suite does **not** yet do:

1. **No `TC-…` test cases yet.** Verification *methods* are assigned, but concrete
   test-case IDs and evidence are absent until a test suite exists (deliberate —
   the repo is Phase-0 scaffold). The RTM has a Status column ready to track this.
2. **Quantitative NFR thresholds are initial targets.** Numbers in `NFR-PERF`,
   `NFR-SCALE` (fps, ms, concurrent editors) need confirmation against real
   workloads and may change; they are stated to keep the requirements verifiable.
3. **Minor BR→STK asymmetry.** Some stakeholder files list a subset of the business
   requirements they touch; Matrix A (sourced from the business file) is the
   canonical BR→STK mapping. This does not break any coverage rule.
4. **Phase counts in Matrix E are indicative.** A few requirements name a secondary
   phase in prose; the Phase column of Matrix C is authoritative per requirement.
5. **3D, civil-engineering, and procedural capabilities are intentionally out of
   scope** (LandXML/CityGML/IFC/glTF, grading/earthwork, corridors). These are
   documented exclusions, not coverage gaps —
   see [competitive analysis](../00-overview/competitive-analysis.md#deliberate-exclusions).

## How to regenerate

This report is currently validated by manual inspection of the matrices. When the
suite grows, the checks above (unique IDs; every functional row has an STK and a
`V`; every BR reaches a functional area; every NFR has a scope) are mechanical and
suitable for a small validation script under
[`_meta/`](../_meta/), invoked in CI alongside a link check.
