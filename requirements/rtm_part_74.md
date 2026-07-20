# Requirements Traceability Matrix - Part 74
**Subject:** Drawing Settings & Cut Planes (Chapter 4, Part 2)
**Coverage:** Global Cut Planes, Object-Specific Overrides, Drawing Setup, Legacy Save Options, 2D AutoCAD Exporter

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-74-001 | Chapter 4 > Drawing Setup > Global Cut Plane | The system shall maintain global cut plane elevation settings to filter vertical object cross section slices. | Trace-to-Spec-v1 | Z-limits slices handled inside rendering passes in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-74-002 | Chapter 4 > Drawing Setup > Cut Plane Overrides | The system shall support object-specific cut plane overrides to display individual tall objects outside global range. | Trace-to-Spec-v1 | Mapped to component visibility toggles in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-74-003 | Chapter 4 > Drawing Setup > Scales Link | The system shall update text sizes and dimensions dynamically when viewport drawing scale changes. | Trace-to-Spec-v1 | Dynamic dimensions scaled proportionally in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-74-004 | Chapter 4 > Drawing Setup > Legacy Save | The system shall support saving drawings with proxy graphic representations for older versions compatibility. | Trace-to-Spec-v1 | Not implemented |
| REQ-74-005 | Chapter 4 > Drawing Setup > AutoCAD Export | The system shall support converting custom 3D elements into standard 2D flat drawing lines (AutoCAD Export). | Trace-to-Spec-v1 | Flattening 3D geometry onto 2D canvas layouts computed via SVG exporter in [pdfExport.ts](../apps/web/src/features/sheets/pdfExport.ts) |
