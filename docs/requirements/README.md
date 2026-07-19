# Thoth Blueprint — Requirements Suite

The enterprise requirements documentation for **Thoth Blueprint**, the cloud site
& community planning platform. This suite specifies **what** the product must do —
across the **frontend** workspace, the **backend** services, the shared **domain
model**, and **interoperability** — and traces every requirement from business
goal to verification.

It is grounded in a survey of established site- and community-planning software
(AutoCAD/Civil 3D, ArcGIS Urban/Pro, CityEngine, UrbanFootprint, TestFit, Modelur,
and collaborative web canvases) and structured to align with **ISO/IEC/IEEE
29148**.

> New here? Read the [SRS](00-overview/SRS.md) for the 2-minute map, then jump to
> the [Traceability Matrix](04-traceability/traceability-matrix.md) to see how it
> all connects.

## At a glance

| | |
| --- | --- |
| **Requirements** | 419 total — 319 functional, 68 non-functional, 11 business, 7 stakeholder, 10 constraints, 4 dependencies |
| **Frontend** | 108 requirements (`apps/web`) |
| **Backend & shared** | 211 requirements (backend services 75 · `packages/domain` 101 · interop 35) |
| **Traceability** | BR → STK → {FE, BE, DOM, IOP} → phase · module · verification (RTM generated from source) |
| **Status** | Draft · specified, not yet built (repo is Phase-0 scaffold) |

## How to navigate

```
docs/requirements/
├── README.md                     ← you are here (portal)
├── 00-overview/
│   ├── SRS.md                    Master Software Requirements Specification
│   ├── scope-and-context.md      Scope, actors, constraints, dependencies (DEP)
│   ├── standards-and-conventions.md   ID scheme, quality rules, tolerances, traceability
│   ├── competitive-analysis.md   Research grounding vs comparable tools
│   └── glossary-additions.md     Technical/UI terms (domain terms live in ../GLOSSARY.md)
├── 01-business/
│   ├── business-requirements.md  BR — why the product exists
│   └── stakeholders.md           STK — personas & their needs
├── 02-functional/
│   ├── frontend-requirements.md  FE — the browser planning workspace
│   ├── backend-requirements.md   BE — the cloud services
│   ├── domain-requirements.md    DOM — the framework-agnostic planning model
│   └── interoperability-requirements.md   IOP — import/export
├── 03-nonfunctional/
│   └── nonfunctional-requirements.md   NFR — performance, security, a11y, …
├── 04-traceability/
│   ├── traceability-matrix.md    RTM — the full cross-reference (generated)
│   └── coverage-report.md        Validation against coverage rules R1–R5
└── _meta/                        Raw research captures (provenance)
    └── scripts/                  gen_rtm.py (regenerates the RTM), validate.py (R1–R5)
```

> The RTM is **generated** from the requirement source files by
> [`_meta/scripts/gen_rtm.py`](_meta/scripts/gen_rtm.py); the source `Trace`
> columns are authoritative. [`_meta/scripts/validate.py`](_meta/scripts/validate.py)
> checks coverage rules R1–R5 and ID hygiene. Re-run both after editing any
> requirement.

## Reading paths

- **"Show me the traceability matrix."** →
  [04-traceability/traceability-matrix.md](04-traceability/traceability-matrix.md)
- **"What must the frontend do?"** →
  [02-functional/frontend-requirements.md](02-functional/frontend-requirements.md)
- **"What must the backend do?"** →
  [02-functional/backend-requirements.md](02-functional/backend-requirements.md)
- **"What's the domain model responsible for?"** →
  [02-functional/domain-requirements.md](02-functional/domain-requirements.md)
- **"How do we exchange files?"** →
  [02-functional/interoperability-requirements.md](02-functional/interoperability-requirements.md)
- **"How well must it perform / how secure / how accessible?"** →
  [03-nonfunctional/nonfunctional-requirements.md](03-nonfunctional/nonfunctional-requirements.md)
- **"Why does requirement X exist?"** → follow its `↑` trace in the
  [RTM](04-traceability/traceability-matrix.md#matrix-c--master-requirement-traceability)
  up to a business goal.
- **"Where did these requirements come from?"** →
  [00-overview/competitive-analysis.md](00-overview/competitive-analysis.md) and
  [`_meta/`](_meta/).

## The traceability model

```
BR ─▶ STK ─▶ {FE, BE, DOM, IOP} ─▶ Phase (P1–P5) · Module · Verification (T/D/I/A)
                    ▲
              NFR (cross-cutting)
```

Every requirement traces up (why it exists) and down (how it's satisfied). The
[RTM](04-traceability/traceability-matrix.md) realizes this in full; the
[coverage report](04-traceability/coverage-report.md) proves no requirement is an
orphan and no stakeholder is a dead end.

## Identifier quick reference

| Prefix | Layer | Prefix | Layer |
| --- | --- | --- | --- |
| `BR` | Business | `DOM` | Domain model (backend/shared) |
| `STK` | Stakeholder | `IOP` | Interoperability (backend/shared) |
| `FE` | Frontend functional | `NFR` | Non-functional |
| `BE` | Backend functional | `CON` | Constraint / assumption |
| | | `DEP` | External dependency / assumption |

Full scheme and area codes:
[standards & conventions](00-overview/standards-and-conventions.md#identifier-scheme).

## Conventions & maintenance

- **Priority:** MoSCoW — **M**ust / **S**hould / **C**ould / **W**on't-yet.
- **Verification:** **T**est / **D**emonstration / **I**nspection / **A**nalysis.
- **Status** (in the RTM): ⬜ Planned · 🟡 In progress · ✅ Done.
- Requirement IDs are **stable and never reused**; withdrawn requirements are
  marked deprecated in place.
- *Docs move with behavior*: when structure or behavior changes, update the
  affected requirement and its RTM row, and re-validate the
  [coverage report](04-traceability/coverage-report.md).

## Relationship to the rest of the repo

This suite specifies the product defined in [`../VISION.md`](../VISION.md),
scheduled in [`../ROADMAP.md`](../ROADMAP.md), and structured in
[`../ARCHITECTURE.md`](../ARCHITECTURE.md), using the vocabulary of
[`../GLOSSARY.md`](../GLOSSARY.md). It does not specify the archived app under
[`../../artifact/`](../../artifact/), which is read-only reference.
