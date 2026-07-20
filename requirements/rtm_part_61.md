# Requirements Traceability Matrix - Part 61
**Subject:** Structural Members (Chapter 31)
**Coverage:** Column & Beam Styles (Steel/Concrete/Timber), Grid Placements, Offsets & Rotations, Trim & Split Rules, 3D AISC Shapes

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-61-001 | Chapter 31 > Structural > Styles | The system shall support Structural Member Styles modeling columns, beams, and braces. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-002 | Chapter 31 > Structural > Plids | The system shall support placing columns at coordinate intersections of layouts grids. | Trace-to-Spec-v1 | Snapping logic to layout lines intersections in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L161) |
| REQ-61-003 | Chapter 31 > Structural > Justification | The system shall support configuring vertical offset, horizontal justification, and rotations. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-004 | Chapter 31 > Structural > Trimming | The system shall support trimming and split cuts on structural members overlapping boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-005 | Chapter 31 > Structural > AISC Shapes | The system shall extrude standard shapes (AISC I-beams, hollow tubes) in the 3D model. | Trace-to-Spec-v1 | Custom structural shapes swept in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
