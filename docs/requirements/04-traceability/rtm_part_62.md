# Requirements Traceability Matrix - Part 62
**Subject:** Anchors (Chapter 32)
**Coverage:** Node Anchors, Curve Anchors, Wall Anchors, Release Anchors, Leader Anchoring

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-62-001 | Chapter 32 > Anchors > Node Anchors | The system shall support Node Anchors that attach objects to structural grids or coordinate markers. | Trace-to-Spec-v1 | Coordinate snapping values linked inside [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx#L161) |
| REQ-62-002 | Chapter 32 > Anchors > Curve Anchors | The system shall support Curve Anchors locking objects to sloped station offsets along baseline curves. | Trace-to-Spec-v1 | Alignments geometry links resolved in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts) |
| REQ-62-003 | Chapter 32 > Anchors > Wall Anchors | The system shall support Wall Anchors keeping openings, doors, and windows embedded inside walls. | Trace-to-Spec-v1 | Not implemented |
| REQ-62-004 | Chapter 32 > Anchors > Release | The system shall support releasing or detaching anchored elements to make them independent. | Trace-to-Spec-v1 | Handled during selection updates and copy operations in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts) |
| REQ-62-005 | Chapter 32 > Anchors > Leaders | The system shall support linking label leaders to point anchors, moving dynamically when the point updates. | Trace-to-Spec-v1 | Auto-update label elevations mapped in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts#L80-L91) |

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


