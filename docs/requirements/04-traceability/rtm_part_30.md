# Requirements Traceability Matrix - Part 30
**Subject:** Slabs and Roof Slabs for Driveways & Flat Pavements (Chapter 30)
**Coverage:** Hardscape Pavements, Slab Thickness, Slope Drainage Adjustment, Slab Edge Styles, 3D Rendering, Drainage Slope Verification, Expansion Joints, Curb Alignments, Vertex Simplification, Composite Slabs QTO

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-30-001 | Chapter 30 > Slabs > Hardscape Creation | The system shall support creating hardscape slabs and pavement zones from closed 2D boundaries. | Trace-to-Spec-v1 | Handled via [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts#L82) as spatial elements |
| REQ-30-002 | Chapter 30 > Slabs > Thickness | The system shall support configuring slab thickness and elevation offsets relative to the terrain grid. | Trace-to-Spec-v1 | Extrusion thickness and z-offsets modeled in [buildScene.ts](../../../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-30-003 | Chapter 30 > Slabs > Slope | The system shall support applying cross slopes and longitudinal drainage slopes to slab elements. | Trace-to-Spec-v1 | Adjusted via target elevation properties in [GradingSolverDialog.tsx](../../../apps/web/src/features/survey/GradingSolverDialog.tsx) |
| REQ-30-004 | Chapter 30 > Slabs > Edge Styles | The system shall support configuring Slab Edge Styles to represent curbs, chamfers, or gutter edges. | Trace-to-Spec-v1 | Mapped to [assembly.ts](../../../packages/domain/src/assembly.ts#L10) curb dimensions |
| REQ-30-005 | Chapter 30 > Slabs > 3D Model | The system shall display hardscape slabs in the 3D viewer with correct material textures and elevations. | Trace-to-Spec-v1 | Rendered in three.js inside [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-30-006 | Chapter 30 > Slabs > Slope Auditing | The system shall support slope audits verifying slab cross-slopes conform to maximum limit standards (e.g. ADA max 2% cross-slope). | Trace-to-Spec-v1 | Not implemented |
| REQ-30-007 | Chapter 30 > Slabs > Expansion Joints | The system shall support custom concrete expansion joints division lines with gap spacing parameters. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-008 | Chapter 30 > Slabs > Curb Anchors | The system shall support anchoring curb profiles dynamically along curved slab boundaries outlines. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-009 | Chapter 30 > Slabs > Vertex Simplifier | The system shall simplify imported contour vertices automatically to construct slab footprint meshes. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-010 | Chapter 30 > Slabs > Composite Slabs | The system shall support multi-component composite pavements (e.g. asphalt, aggregate base course, subgrade) for structural QTO metrics. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-011 | Chapter 30 > Slabs > Edge Sweeps | The system shall support sweeping custom slab edge profiles (e.g. step-downs, chamfers) along slab boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-012 | Chapter 30 > Slabs > Opening Voids | The system shall support subtracting nested closed boundary polygons from slab areas. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-013 | Chapter 30 > Slabs > Thickness Overrides | The system shall support configuring separate concrete, insulation, and bedding thicknesses overrides. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-014 | Chapter 30 > Slabs > Drainage Labels | The system shall compute and label drainage slope contours and flow direction vectors on slab elements. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-015 | Chapter 30 > Slabs > Step Elevations | The system shall support modeling vertical step heights offsets on slab contours. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-016 | Chapter 30 > Slabs > Wall Boundary Offsets | The system shall automatically extend slab edges to meet referencing wall inner or outer faces. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-017 | Chapter 30 > Slabs > Area QTO | The system shall compile QTO schedules listing slab surface areas, perimeters, and volumes. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-018 | Chapter 30 > Slabs > Rebar Reinforcement | The system shall support modeling rebar spacing grids patterns and calculating steel reinforcing weights. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-019 | Chapter 30 > Slabs > Joist Anchors | The system shall generate placement anchors coordinates for framing joists attachments. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-020 | Chapter 30 > Slabs > Standard Layers | The system shall automatically place newly generated slabs on standard layers based on CAD style keys. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-021 | Chapter 30 > Slabs > Step Joints | The system shall support modeling transition thickness step joints along slab internal boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-022 | Chapter 30 > Slabs > Inlet Depressions | The system shall support modeling slab depressions around drainage collection points. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-023 | Chapter 30 > Slabs > Fascia Sweeps | The system shall support sweeping wood or concrete fascia boards along slab edge profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-024 | Chapter 30 > Slabs > Load Capacities | The system shall store design live and dead structural load limit capacities directly on slab style definitions. | Trace-to-Spec-v1 | Not implemented |
| REQ-30-025 | Chapter 30 > Slabs > Concrete Keyways | The system shall support modeling vertical and horizontal shear key joints at slab construction joints. | Trace-to-Spec-v1 | Not implemented |



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


