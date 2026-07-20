# Thoth Blueprint â€” Requirements Suite

The enterprise requirements documentation for **Thoth Blueprint**, the cloud site
& community planning platform. This suite specifies **what** the product must do â€”
across the **frontend** workspace, the **backend** services, the shared **domain
model**, and **interoperability** â€” and traces every requirement from business
goal to verification.

It is grounded in a survey of established site- and community-planning software
(AutoCAD/Civil 3D, ArcGIS Urban/Pro, CityEngine, UrbanFootprint, TestFit, Modelur,
and collaborative web canvases) plus a Phase-6 grounding in architecture &
engineering CAD-sheet standards (US National CAD Standard v6, AIA CAD Layer
Guidelines, ISO 13567, ANSI/ASME Y14.1, ISO 5457, ISO 7200, ISO 128/129/3098,
PDF/A-2, PDF/E-1). It is structured to align with **ISO/IEC/IEEE 29148**.

> New here? Read the [SRS](00-overview/SRS.md) for the 2-minute map, then jump to
> the [Traceability Matrix](04-traceability/traceability-matrix.md) to see how it
> all connects.

## At a glance

| | |
| --- | --- |
| **Requirements** | 624 total â€” 500 functional, 86 non-functional, 12 business, 8 stakeholder, 12 constraints, 6 dependencies |
| **Frontend** | 175 requirements (`apps/web`) |
| **Backend & shared** | 325 requirements (backend services 100 Â· `packages/domain` 166 Â· interop 59) |
| **Traceability** | BR â†’ STK â†’ {FE, BE, DOM, IOP} â†’ phase Â· module Â· verification (RTM generated from source) |
| **Status** | Draft Â· specified, not yet built (repo is Phase-0 scaffold) |
| **Phase coverage** | Phase 1 (domain foundation) â†’ Phase 6 (architecture & engineering CAD sheets) |

## How to navigate

```
docs/requirements/
â”œâ”€â”€ README.md                     â† you are here (portal)
â”œâ”€â”€ 00-overview/
â”‚   â”œâ”€â”€ SRS.md                    Master Software Requirements Specification
â”‚   â”œâ”€â”€ scope-and-context.md      Scope, actors, constraints, dependencies (DEP)
â”‚   â”œâ”€â”€ standards-and-conventions.md   ID scheme, quality rules, tolerances, traceability
â”‚   â”œâ”€â”€ competitive-analysis.md   Research grounding vs comparable tools
â”‚   â””â”€â”€ glossary-additions.md     Technical/UI terms (domain terms live in ../GLOSSARY.md)
â”œâ”€â”€ 01-business/
â”‚   â”œâ”€â”€ business-requirements.md  BR â€” why the product exists
â”‚   â””â”€â”€ stakeholders.md           STK â€” personas & their needs
â”œâ”€â”€ 02-functional/
â”‚   â”œâ”€â”€ frontend-requirements.md  FE â€” the browser planning workspace
â”‚   â”œâ”€â”€ backend-requirements.md   BE â€” the cloud services
â”‚   â”œâ”€â”€ domain-requirements.md    DOM â€” the framework-agnostic planning model
â”‚   â””â”€â”€ interoperability-requirements.md   IOP â€” import/export
â”œâ”€â”€ 03-nonfunctional/
â”‚   â””â”€â”€ nonfunctional-requirements.md   NFR â€” performance, security, a11y, â€¦
â”œâ”€â”€ 04-traceability/
â”‚   â”œâ”€â”€ traceability-matrix.md    RTM â€” the full cross-reference (generated)
â”‚   â””â”€â”€ coverage-report.md        Validation against coverage rules R1â€“R5
â””â”€â”€ _meta/                        Raw research captures (provenance)
    â””â”€â”€ scripts/                  gen_rtm.py (regenerates the RTM), validate.py (R1â€“R5)
```

> The RTM is **generated** from the requirement source files by
> [`_meta/scripts/gen_rtm.py`](_meta/scripts/gen_rtm.py); the source `Trace`
> columns are authoritative. [`_meta/scripts/validate.py`](_meta/scripts/validate.py)
> checks coverage rules R1â€“R5 and ID hygiene. Re-run both after editing any
> requirement.

## Reading paths

- **"Show me the traceability matrix."** â†’
  [04-traceability/traceability-matrix.md](04-traceability/traceability-matrix.md)
- **"What must the frontend do?"** â†’
  [02-functional/frontend-requirements.md](02-functional/frontend-requirements.md)
- **"What must the backend do?"** â†’
  [02-functional/backend-requirements.md](02-functional/backend-requirements.md)
- **"What's the domain model responsible for?"** â†’
  [02-functional/domain-requirements.md](02-functional/domain-requirements.md)
- **"How do we exchange files?"** â†’
  [02-functional/interoperability-requirements.md](02-functional/interoperability-requirements.md)
- **"How well must it perform / how secure / how accessible?"** â†’
  [03-nonfunctional/nonfunctional-requirements.md](03-nonfunctional/nonfunctional-requirements.md)
- **"Why does requirement X exist?"** â†’ follow its `â†‘` trace in the
  [RTM](04-traceability/traceability-matrix.md#matrix-c--master-requirement-traceability)
  up to a business goal.
- **"Where did these requirements come from?"** â†’
  [00-overview/competitive-analysis.md](00-overview/competitive-analysis.md) and
  [`_meta/`](_meta/).

## The traceability model

```
BR â”€â–¶ STK â”€â–¶ {FE, BE, DOM, IOP} â”€â–¶ Phase (P1â€“P5) Â· Module Â· Verification (T/D/I/A)
                    â–²
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

- **Priority:** MoSCoW â€” **M**ust / **S**hould / **C**ould / **W**on't-yet.
- **Verification:** **T**est / **D**emonstration / **I**nspection / **A**nalysis.
- **Status** (in the RTM): â¬œ Planned Â· ðŸŸ¡ In progress Â· âœ… Done.
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

