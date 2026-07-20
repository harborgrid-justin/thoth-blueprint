# Requirements Traceability Matrix - Part 87
**Subject:** Object Viewer (Chapter 17)
**Coverage:** Isolated Object Viewer, Orbit/Pan/Zoom Navigation, Visual Styles Selection, Perspective/Parallel Toggles, Preset View Angles

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-87-001 | Chapter 17 > Object Viewer > Isolated Window | The system shall provide an Object Viewer modal to inspect selected elements in an isolated viewport. | Trace-to-Spec-v1 | Isolated 3D viewers rendered inside [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-87-002 | Chapter 17 > Object Viewer > Navigation | The system shall support orbiting, panning, and zooming camera navigation inside the viewer. | Trace-to-Spec-v1 | OrbitControls camera navigation handled inside [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-87-003 | Chapter 17 > Object Viewer > Styles | The system shall support setting visual styles (Wireframe, Conceptual, Realistic) inside the viewer. | Trace-to-Spec-v1 | Visual styles options configured inside [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-87-004 | Chapter 17 > Object Viewer > Projection | The system shall support toggling between perspective and parallel orthographic projection. | Trace-to-Spec-v1 | Camera types configured inside [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-87-005 | Chapter 17 > Object Viewer > Preset Views | The system shall support preset views (Top, Isometric) to quickly align the object viewer camera. | Trace-to-Spec-v1 | View angles presets handled in [canvasStore.ts](../apps/web/src/store/canvasStore.ts) |
