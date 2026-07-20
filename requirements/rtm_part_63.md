# Requirements Traceability Matrix - Part 63
**Subject:** Detail Drafting Tools (Chapter 35)
**Coverage:** Detail Components Insertion, Sizing Nominals, Auto-Hatching, Detail Masking boundaries, Cost Estimates Formulas

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-63-001 | Chapter 35 > Details > Component Database | The system shall support placing 2D details directly from component databases. | Trace-to-Spec-v1 | Symbol assets definitions lookup parsed in [elementMeta.ts](../apps/web/src/lib/elementMeta.ts) |
| REQ-63-002 | Chapter 35 > Details > Nominal Sizing | The system shall support nominal sizing catalogs matching standard manufactured parts sizes. | Trace-to-Spec-v1 | Parametric cylinder and vaults diameter/depth limits matching in [partbuilder.ts](../packages/domain/src/partbuilder.ts#L45-L75) |
| REQ-63-003 | Chapter 35 > Details > Detail Hatching | The system shall automatically fill detail components with standard material hatches (concrete, wood, steel). | Trace-to-Spec-v1 | Fills patterns rendered dynamically inside SVG sheets in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-63-004 | Chapter 35 > Details > Masking | The system shall support masking boundaries to hide background elements behind details. | Trace-to-Spec-v1 | Visual boundary masking supported under [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-63-005 | Chapter 35 > Details > QTO Formulas | The system shall calculate cost estimation equations based on nominal counts and lengths. | Trace-to-Spec-v1 | Cost equations evaluated dynamically in [qto.ts](../packages/domain/src/qto.ts#L100) |
