# Requirements Traceability Matrix - Part 63
**Subject:** Detail Drafting Tools (Chapter 35)
**Coverage:** Detail Components Insertion, Sizing Nominals, Auto-Hatching, Detail Masking boundaries, Cost Estimates Formulas

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-63-001 | Chapter 35 > Details > Component Database | The system shall support placing 2D details directly from component databases. | Trace-to-Spec-v1 | Symbol assets definitions lookup parsed in [elementMeta.ts](../../../apps/web/src/lib/elementMeta.ts) |
| REQ-63-002 | Chapter 35 > Details > Nominal Sizing | The system shall support nominal sizing catalogs matching standard manufactured parts sizes. | Trace-to-Spec-v1 | Parametric cylinder and vaults diameter/depth limits matching in [partbuilder.ts](../../../packages/domain/src/partbuilder.ts#L45-L75) |
| REQ-63-003 | Chapter 35 > Details > Detail Hatching | The system shall automatically fill detail components with standard material hatches (concrete, wood, steel). | Trace-to-Spec-v1 | Fills patterns rendered dynamically inside SVG sheets in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-63-004 | Chapter 35 > Details > Masking | The system shall support masking boundaries to hide background elements behind details. | Trace-to-Spec-v1 | Visual boundary masking supported under [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-63-005 | Chapter 35 > Details > QTO Formulas | The system shall calculate cost estimation equations based on nominal counts and lengths. | Trace-to-Spec-v1 | Cost equations evaluated dynamically in [qto.ts](../../../packages/domain/src/qto.ts#L100) |

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


