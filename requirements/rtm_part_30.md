# Requirements Traceability Matrix - Part 30
**Subject:** Slabs and Roof Slabs for Driveways & Flat Pavements (Chapter 30)
**Coverage:** Hardscape Pavements, Slab Thickness, Slope Drainage Adjustment, Slab Edge Styles, 3D Rendering

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-30-001 | Chapter 30 > Slabs > Hardscape Creation | The system shall support creating hardscape slabs and pavement zones from closed 2D boundaries. | Trace-to-Spec-v1 | Handled via [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L82) as spatial elements |
| REQ-30-002 | Chapter 30 > Slabs > Thickness | The system shall support configuring slab thickness and elevation offsets relative to the terrain grid. | Trace-to-Spec-v1 | Extrusion thickness and z-offsets modeled in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-30-003 | Chapter 30 > Slabs > Slope | The system shall support applying cross slopes and longitudinal drainage slopes to slab elements. | Trace-to-Spec-v1 | Adjusted via target elevation properties in [GradingSolverDialog.tsx](../apps/web/src/features/survey/GradingSolverDialog.tsx) |
| REQ-30-004 | Chapter 30 > Slabs > Edge Styles | The system shall support configuring Slab Edge Styles to represent curbs, chamfers, or gutter edges. | Trace-to-Spec-v1 | Mapped to [assembly.ts](../packages/domain/src/assembly.ts#L10) curb dimensions |
| REQ-30-005 | Chapter 30 > Slabs > 3D Model | The system shall display hardscape slabs in the 3D viewer with correct material textures and elevations. | Trace-to-Spec-v1 | Rendered in three.js inside [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
