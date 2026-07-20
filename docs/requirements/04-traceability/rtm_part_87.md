# Requirements Traceability Matrix - Part 87
**Subject:** Object Viewer (Chapter 17)
**Coverage:** Isolated Object Viewer, Orbit/Pan/Zoom Navigation, Visual Styles Selection, Perspective/Parallel Toggles, Preset View Angles

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-87-001 | Chapter 17 > Object Viewer > Isolated Window | The system shall provide an Object Viewer modal to inspect selected elements in an isolated viewport. | Trace-to-Spec-v1 | Isolated 3D viewers rendered inside [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-87-002 | Chapter 17 > Object Viewer > Navigation | The system shall support orbiting, panning, and zooming camera navigation inside the viewer. | Trace-to-Spec-v1 | OrbitControls camera navigation handled inside [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-87-003 | Chapter 17 > Object Viewer > Styles | The system shall support setting visual styles (Wireframe, Conceptual, Realistic) inside the viewer. | Trace-to-Spec-v1 | Visual styles options configured inside [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-87-004 | Chapter 17 > Object Viewer > Projection | The system shall support toggling between perspective and parallel orthographic projection. | Trace-to-Spec-v1 | Camera types configured inside [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-87-005 | Chapter 17 > Object Viewer > Preset Views | The system shall support preset views (Top, Isometric) to quickly align the object viewer camera. | Trace-to-Spec-v1 | View angles presets handled in [canvasStore.ts](../../../apps/web/src/store/canvasStore.ts) |

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


