# Requirements Traceability Matrix - Part 89
**Subject:** Hidden Line Projection (Chapter 42)
**Coverage:** Hidden Line Projection, Obscured Boundaries, Dotted Background Lines, Elevation Viewports, Projection Updates

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-89-001 | Chapter 42 > Hidden Line > Projection | The system shall compute obscurities to calculate hidden lines in 3D projection viewports. | Trace-to-Spec-v1 | Handled via depth buffering checks inside [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-89-002 | Chapter 42 > Hidden Line > Obscured Lines | The system shall hide background boundaries and model intersections that sit behind closer meshes. | Trace-to-Spec-v1 | Solved by rendering engines depth sorting in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-89-003 | Chapter 42 > Hidden Line > Dashed Fills | The system shall support drawing obscured hidden lines with customizable dashed or greyed-out styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-89-004 | Chapter 42 > Hidden Line > Viewports | The system shall support generating flattened hidden line drawings from 3D elevations. | Trace-to-Spec-v1 | Vector projection outputs generated in [pdfExport.ts](../apps/web/src/features/sheets/pdfExport.ts) |
| REQ-89-005 | Chapter 42 > Hidden Line > Refresh | The system shall automatically recompile projected lines when drawing models change. | Trace-to-Spec-v1 | Reactively updated inside store actions in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
