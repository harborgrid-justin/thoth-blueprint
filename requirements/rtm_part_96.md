# Requirements Traceability Matrix - Part 96
**Subject:** Multi-View Blocks Display Overrides (Chapter 38, Part 2)
**Coverage:** 2D Plan Blocks, 3D Model Blocks, View-Dependent Overrides, Section Blocks, Cost Formulas Links

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-96-001 | Chapter 38 > MVB > Plan Blocks | The system shall display designated 2D block symbols for plan view sheets. | Trace-to-Spec-v1 | Element icons and paths rendered inside [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-96-002 | Chapter 38 > MVB > Model Blocks | The system shall display designated 3D mesh geometry representations for isometric realistic model viewports. | Trace-to-Spec-v1 | mesh models built inside [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) and displayed in three.js |
| REQ-96-003 | Chapter 38 > MVB > Parameter Overrides | The system shall support view-dependent scale factors and rotation angle parameter overrides. | Trace-to-Spec-v1 | Managed as attributes in element properties in [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
| REQ-96-004 | Chapter 38 > MVB > Section Blocks | The system shall support assigning 2D profile outlines for cross section sliced elevations. | Trace-to-Spec-v1 | Sliced cross sections representations computed inside [ProfileSectionDialog.tsx](../apps/web/src/features/survey/ProfileSectionDialog.tsx) |
| REQ-96-005 | Chapter 38 > MVB > Cost Takeoffs | The system shall compile cost equations based on multi-view block counts in QTO sheets. | Trace-to-Spec-v1 | QTO cost calculations evaluated dynamically in [qto.ts](../packages/domain/src/qto.ts#L100) |
