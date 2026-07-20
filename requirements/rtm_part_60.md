# Requirements Traceability Matrix - Part 60
**Subject:** Roofs (Chapter 29)
**Coverage:** Roof Styles (Gable/Hip/Shed), Sloped Outlines, Footprint Boundary, Overhang & Soffits, Thicknesses, 3D Rendering, Edit Edges/Faces Configuration

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-60-001 | Chapter 29 > Roofs > Styles | The system shall support Roof Styles defining sloped pitch (gable, hip, shed) and plate heights. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-002 | Chapter 29 > Roofs > Footprint | The system shall support creating roofs by selecting closed wall footprints or polylines. | Trace-to-Spec-v1 | Mapped to closed spatial boundary elements in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L82) |
| REQ-60-003 | Chapter 29 > Roofs > Overhangs | The system shall support setting custom overhang distances, fascia dimensions, and soffit options. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-004 | Chapter 29 > Roofs > Thickness | The system shall support setting roof slab thickness parameters and structural cuts. | Trace-to-Spec-v1 | Slab thickness parameters supported in structural build configurations in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-60-005 | Chapter 29 > Roofs > 3D Model | The system shall display sloped roofs in the 3D model with realistic slate/shingle colors. | Trace-to-Spec-v1 | Rendered in three.js scene graphics in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-60-006 | Chapter 29 > Roofs > Face Slopes | The system shall support editing individual face slopes dynamically using the Edit Edges/Faces context tool. | Trace-to-Spec-v1 | Not implemented |

