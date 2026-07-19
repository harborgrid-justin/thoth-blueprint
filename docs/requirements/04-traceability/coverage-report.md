# Coverage Report

Validates the [traceability matrix](traceability-matrix.md) against the suite's
coverage rules `R1`–`R5`
([standards & conventions](../00-overview/standards-and-conventions.md#traceability-model)).
The RTM is **generated** from the requirement source files and validated by
[`_meta/scripts/validate.py`](../_meta/scripts/validate.py); this report records
the result. Date of last validation: **2026-07-19**.

## Requirement inventory

| Layer | File | Count |
| --- | --- | :--: |
| Business (`BR`) | [business-requirements.md](../01-business/business-requirements.md) | 11 |
| Stakeholder (`STK`) | [stakeholders.md](../01-business/stakeholders.md) | 7 |
| Functional — Frontend (`FE`) | [frontend-requirements.md](../02-functional/frontend-requirements.md) | 108 |
| Functional — Backend (`BE`) | [backend-requirements.md](../02-functional/backend-requirements.md) | 75 |
| Functional — Domain (`DOM`) | [domain-requirements.md](../02-functional/domain-requirements.md) | 101 |
| Functional — Interop (`IOP`) | [interoperability-requirements.md](../02-functional/interoperability-requirements.md) | 35 |
| Non-functional (`NFR`) | [nonfunctional-requirements.md](../03-nonfunctional/nonfunctional-requirements.md) | 68 |
| Constraints (`CON`) | [scope-and-context.md](../00-overview/scope-and-context.md) | 10 |
| Dependencies (`DEP`) | [scope-and-context.md](../00-overview/scope-and-context.md) | 4 |
| **Total** | | **419** |

Functional total: **319**.

## Automated validation

`validate.py` output (must be green in CI alongside the link check):

```
Functional requirements: 319
NFRs: 68 | BR: 11 | STK: 7 | CON: 10 | DEP: 4
PASS — R1–R5 and ID hygiene OK.
```

## Rule-by-rule validation

### R1 — every `BR` traces down to at least one `STK` ✅

All 11 business requirements are served by at least one stakeholder
([Matrix A](traceability-matrix.md#matrix-a--business--stakeholder)). `validate.py`
confirms every `BR` except `BR-011` (a delivery requirement realized via the phase
mapping) appears in some stakeholder's **Satisfies** list.

### R2 — every `STK` traces down to at least one functional requirement ✅

`validate.py` confirms all of `STK-001`–`STK-007` appear in at least one functional
requirement's **Trace** column.

### R3 — every functional requirement traces up to ≥1 `STK` and maps to one module ✅

Generation guarantees this: `gen_rtm.py` emits a row only from a source
requirement, buckets its `Trace` into the ↑ Stakeholder column, and assigns exactly
one module ([Matrix F](traceability-matrix.md#matrix-f--module-coverage)).
`validate.py` fails the build if any functional requirement lacks an STK up-trace.

### R4 — every functional requirement has a verification method ✅

`validate.py` confirms every functional row carries a valid `T`/`D`/`I`/`A` method;
distribution is in the
[verification method summary](traceability-matrix.md#verification-method-summary).

### R5 — every `NFR` names the requirements/modules it constrains ✅

`validate.py` confirms all 68 NFRs have a non-empty **Constrains** cell
([Matrix D](traceability-matrix.md#matrix-d--non-functional--constrained-scope)).

### ID hygiene ✅

`validate.py` confirms no duplicate IDs and that every `BR`/`STK`/`CON`/`DEP`
referenced in a functional trace exists.

## Business-requirement coverage detail

Downward reachability BR → STK → functional area (all ✅):

| BR | Reaches functional areas (via STK) |
| --- | --- |
| BR-001 Web-native | FE-* workspace, FE-NAV, FE-STATE, FE-REVIEW |
| BR-002 Domain-native | DOM-* (incl. BUILDING, BLOCK), FE-CANVAS, FE-STYLE |
| BR-003 Collaboration | BE-COLLAB, BE-COMMENT, BE-NOTIFY, FE-PRESENCE, FE-NOTIFY, FE-REVIEW |
| BR-004 Spatial honesty | DOM-CRS, DOM-UNIT, DOM-GEOM, BE-GEO, IOP-CRSX, FE-PREFS |
| BR-005 Interoperability | IOP-*, BE-IMPORT, BE-EXPORT, BE-JOB, FE-IO |
| BR-006 Precision | FE-PRECISION, FE-MEASURE, FE-EDIT, FE-SELECT |
| BR-007 Governed & auditable | BE-VERSION, BE-AUDIT, BE-ACCESS, FE-PROJECT |
| BR-008 Planning intelligence | DOM-METRIC, DOM-COMPLY, DOM-BUILDING, FE-METRIC |
| BR-009 Full spectrum | BE-ACCESS, FE-ACCOUNT, FE-HELP, FE-REVIEW, NFR-A11Y |
| BR-010 Open & self-hostable | BE-API, BE-WEBHOOK, NFR-PORT, NFR-LEGAL |
| BR-011 Incremental delivery | realized via Phase mapping (Matrix E) |

## Frontend vs backend balance

The request required both front-end and back-end coverage. Confirmed:

- **Frontend:** 108 requirements across 22 areas (`apps/web`).
- **Backend services:** 75 requirements across `auth`, `projects`, `geospatial`,
  `collaboration`, plus cross-service API/webhook areas.
- **Domain + interop (shared/backend):** 101 + 35 = 136 requirements.
- Backend-and-shared total (BE + DOM + IOP): **211**.

Every backend service module named in [ARCHITECTURE.md](../../ARCHITECTURE.md) has
requirements ([Matrix F](traceability-matrix.md#matrix-f--module-coverage)).

## Second-pass changes (what the review added/fixed)

This report reflects a second review pass over the first-pass suite:

- **Benchmark/validation NFRs added** (`NFR-BENCH-001..005`): the earlier caveat
  that performance targets are "initial targets to be confirmed against real
  workloads" is now discharged by requirements that define named benchmark
  datasets, mandate validation before a figure is claimed, and enforce a CI
  regression budget. `NFR-PERF`/`NFR-SCALE` now reference those datasets instead
  of the undefined word "typical."
- **Missing domain primitive fixed:** `DOM-BUILDING-*` and `FE-CANVAS-011` define
  the Building/footprint object that coverage, FAR, and density metrics require but
  the first pass never modeled.
- **Model-portability gaps filled:** `DOM-SERIAL-*` (canonical serialization +
  schema versioning), `DOM-IDENT-*` (stable element identity), `DOM-SNAPSHOT-*`,
  and `BE-PROJECT-005` (stored-plan migration).
- **Unowned cross-service concerns given owners:** notifications (`BE-NOTIFY`,
  `FE-NOTIFY`), async jobs (`BE-JOB`), asset storage (`BE-STORAGE`), deletion
  cascade (`BE-PROJECT-008`), and a dependencies register (`DEP-001..004`).
- **Defects fixed:** compound requirements split; "unlimited undo" bounded;
  a P2 Must that depended on P4 collaboration re-phased (`BE-PROJECT-004`);
  audit promoted to Must (`BE-AUDIT-001`); the `IOP-KML` mis-trace corrected;
  `BR-009` reconciled across Matrix A and the stakeholder files; a **tolerances
  table** added so "within tolerance" is defined.
- **Scope hardened:** non-goals for grading/earthwork, corridor/alignment,
  procedural 3D, financial pro forma, predictive simulation, and multi-sheet plan
  sets promoted into the canonical scope list; the "grading concepts" actor blurb
  corrected.

## Known gaps & watch items

Honest accounting of what this suite still does **not** do:

1. **No `TC-…` test cases yet.** Verification *methods* are assigned and
   `NFR-MAINT-006` now requires a traced `TC-…` for every Must before its phase
   ships, but concrete test cases await a test suite (the repo is Phase-0 scaffold).
2. **Numeric NFR thresholds and tolerances are initial targets.** They are now
   pinned (benchmark datasets, tolerances table) so they are verifiable, but the
   specific numbers will be confirmed by `NFR-BENCH-003` benchmarking and may move.
3. **3D, civil-engineering, procedural, financial, and simulation capabilities are
   intentionally out of scope** — documented exclusions, not coverage gaps.

## How to regenerate & validate

```
python3 docs/requirements/_meta/scripts/gen_rtm.py     # regenerate the RTM from source
python3 docs/requirements/_meta/scripts/validate.py    # check R1–R5 + ID hygiene
```

Both are suitable for CI alongside a relative-link check. The source requirement
files are authoritative; the RTM is derived.
