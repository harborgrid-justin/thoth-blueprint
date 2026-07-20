# Requirements Traceability Matrix - Part 49
**Subject:** Materials (Chapter 13)
**Coverage:** Material Definitions, Surface Hatch Patterns, 3D Render Textures, Section Material Boundaries, Material QTO Quantities, Material Display Components, Face-Specific Hatching

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-49-001 | Chapter 13 > Materials > Definitions | The system shall support Material Definitions specifying surface hatchings, textures, and rendering colors. | Trace-to-Spec-v1 | Element categories and matching materials color values defined in [elementMeta.ts](../../../apps/web/src/lib/elementMeta.ts) |
| REQ-49-002 | Chapter 13 > Materials > Hatch Patterns | The system shall display designated hatch patterns on plan layouts based on object material definitions. | Trace-to-Spec-v1 | SVG pattern fills rendered dynamically in canvas layouts in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-49-003 | Chapter 13 > Materials > Render Textures | The system shall map 3D render textures and opacities to materials for realistic mesh views. | Trace-to-Spec-v1 | three.js material shaders configured in [buildScene.ts](../../../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-49-004 | Chapter 13 > Materials > Sections | The system shall display sectional hatching inside cut profiles of corridors and grading regions. | Trace-to-Spec-v1 | Material cuts fills and profiles hatch boundaries drawn in [ProfileSectionDialog.tsx](../../../apps/web/src/features/survey/ProfileSectionDialog.tsx) |
| REQ-49-005 | Chapter 13 > Materials > QTO | The system shall calculate material quantities (weight, volume, surface area) for cost estimation schedules. | Trace-to-Spec-v1 | Mapped to quantity cost formulas and QTO calculations in [qto.ts](../../../packages/domain/src/qto.ts) |
| REQ-49-006 | Chapter 13 > Materials > Display Components | The system shall support system-defined material display components: Linework (2D plan outlines), Plan Hatch, 3D Body (mesh structures), and Surface Hatch. | Trace-to-Spec-v1 | Styling attributes mapped in [elementMeta.ts](../../../apps/web/src/lib/elementMeta.ts) and canvas drawing paths |
| REQ-49-007 | Chapter 13 > Materials > Face Hatching | The system shall support setting which specific faces of an object (e.g., front, left side) display the surface hatch within the material definition. | Trace-to-Spec-v1 | Surface rendering face constraints resolved inside three.js in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |


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


