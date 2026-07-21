# Thoth Blueprint — Requirements Suite

The enterprise requirements documentation for **Thoth Blueprint**, the cloud site & community planning platform. This suite specifies **what** the product must do — across the **frontend** workspace, the **backend** services, the shared **domain model**, and **interoperability** — and traces every requirement from business goal to verification.

It is grounded in a survey of established site- and community-planning software (AutoCAD/Civil 3D, ArcGIS Urban/Pro, CityEngine, UrbanFootprint, TestFit, Modelur, and collaborative web canvases) plus architecture & engineering CAD-sheet standards (US National CAD Standard v6, AIA CAD Layer Guidelines, ISO 13567, ANSI/ASME Y14.1, ISO 5457, ISO 7200, ISO 128/129/3098, PDF/A-2, PDF/E-1). It is structured to align with **ISO/IEC/IEEE 29148**.

## At a glance

| Metric | Details |
| --- | --- |
| **Requirements** | 644 total — 520 functional, 86 non-functional, 12 business, 8 stakeholder, 12 constraints, 6 dependencies |
| **Frontend** | 175 requirements (`apps/web`) |
| **Backend & shared** | 345 requirements (backend services 100 · `packages/domain` 186 · interop 59) |
| **Prince William County, VA** | 20 civil & survey plat requirements (`REQ-PWC-001` through `REQ-PWC-020`) |
| **Traceability** | BR → STK → {FE, BE, DOM, IOP, PWC} → phase · module · verification |
| **Phase coverage** | Phase 1 (domain foundation) → Phase 6 (architecture & engineering CAD sheets) |

## Directory Structure

```
docs/requirements/
├── README.md                     ← portal
├── 00-overview/
│   ├── SRS.md                    Master Software Requirements Specification
│   ├── scope-and-context.md      Scope, actors, constraints, dependencies
│   ├── standards-and-conventions.md ID scheme, quality rules, tolerances
│   ├── competitive-analysis.md   Research grounding vs comparable tools
│   └── glossary-additions.md     Technical/UI terms
├── 01-business/
│   ├── business-requirements.md  BR — why the product exists
│   └── stakeholders.md           STK — personas & their needs
├── 02-functional/
│   ├── frontend-requirements.md  FE — browser planning workspace
│   ├── backend-requirements.md   BE — cloud services
│   ├── domain-requirements.md    DOM — framework-agnostic planning model
│   ├── prince-william-va-requirements.md PWC — Prince William County, VA Plat Submissions
│   └── interoperability-requirements.md IOP — import/export
├── 03-nonfunctional/
│   └── nonfunctional-requirements.md NFR — performance, security, a11y
└── 04-traceability/
    ├── traceability-matrix.md    RTM — master cross-reference
    ├── rtm_part_101.md           RTM Part 101 — Prince William County, VA Traceability
    └── coverage-report.md        Validation against coverage rules R1–R5
```

## Related Documents

- [Prince William County Virginia Functional Requirements](02-functional/prince-william-va-requirements.md)
- [Master Requirements Traceability Matrix](04-traceability/traceability-matrix.md)
- [Requirements Traceability Matrix - Part 101 (Prince William County, VA)](04-traceability/rtm_part_101.md)
