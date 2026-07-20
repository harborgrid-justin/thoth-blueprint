# Requirements Traceability Matrix - Part 32
**Subject:** Grids and Survey Coordinate Layouts (Chapter 34)
**Coverage:** Rectangular & Radial Grids, Grid Spacing, Intersection Labeling, Grid Rotation, Snap to Intersection

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-32-001 | Chapter 34 > Grids > Coordinate Grids | The system shall support creating rectangular and radial Coordinate Grids to assist survey positioning. | Trace-to-Spec-v1 | Guide grids configuration structured in [spatial.ts](../packages/domain/src/spatial.ts) |
| REQ-32-002 | Chapter 34 > Grids > Spacing | The system shall support setting custom grid cell spacing and concentric radial divisions. | Trace-to-Spec-v1 | Elevation grid cell parameters configured in [terrain.ts](../packages/domain/src/terrain.ts#L81) |
| REQ-32-003 | Chapter 34 > Grids > Labeling | The system shall support alphanumeric labeling systems along grid columns and row headers. | Trace-to-Spec-v1 | Grid labels rendered via SVG overlay in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-32-004 | Chapter 34 > Grids > Alignment | The system shall support rotating coordinate grids to align with survey benchmarks or magnetic declination. | Trace-to-Spec-v1 | Rotation transformations computed via `SpatialContext` in [spatial.ts](../packages/domain/src/spatial.ts#L30) |
| REQ-32-005 | Chapter 34 > Grids > Intersection Snap | The system shall support snapping points and architectural column anchors to grid line intersections. | Trace-to-Spec-v1 | Vertex snapping logic implemented in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L161) |
