# Requirements Traceability Matrix - Part 100
**Subject:** Spaces Area & Zoning Calculations (Chapter 39, Part 4)
**Coverage:** Area Types (Net/Usable/Gross), Translation Update Sync, Voids Deductions, Zoning Groups, Cost Formulas Links

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-100-001 | Chapter 39 > Spaces > Area Calculation | The system shall calculate space Net, Usable, and Gross areas dynamically from boundary wall offsets. | Trace-to-Spec-v1 | Polygon offsets and areas computed in [geometry.ts](../../../packages/domain/src/geometry.ts#L45) |
| REQ-100-002 | Chapter 39 > Spaces > Update Sync | The system shall refresh space geometry and area calculations reactively when boundary walls translation coordinates are modified. | Trace-to-Spec-v1 | Mapped to store state changes listener in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts) |
| REQ-100-003 | Chapter 39 > Spaces > Voids Deductions | The system shall automatically subtract enclosed void shapes from space calculations. | Trace-to-Spec-v1 | Area math and boundary intersections evaluated in [geometry.ts](../../../packages/domain/src/geometry.ts) |
| REQ-100-004 | Chapter 39 > Spaces > Zoning | The system shall support grouping spaces into custom Zoning classifications (Residential, Commercial). | Trace-to-Spec-v1 | Point and area classifications mapped in [descriptionKeys.ts](../../../packages/domain/src/descriptionKeys.ts) |
| REQ-100-005 | Chapter 39 > Spaces > Property Sets | The system shall calculate project totals and cost sheets using Property Set formulas linked to spaces. | Trace-to-Spec-v1 | QTO cost calculations compiled inside [qto.ts](../../../packages/domain/src/qto.ts#L100) |

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


