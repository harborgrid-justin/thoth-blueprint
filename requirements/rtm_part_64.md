# Requirements Traceability Matrix - Part 64
**Subject:** Mask Blocks (Chapter 37)
**Coverage:** Mask Block Creation, Dynamic Background Path Clipping, Symbol Anchoring, Viewport Visibility Overrides, Boundary Refreshes, Properties Location Controls

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-64-001 | Chapter 37 > Mask Blocks > Creation | The system shall support creating Mask Blocks to hide background linework behind drawing symbols. | Trace-to-Spec-v1 | Dotted outlines clipping computed inside [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-64-002 | Chapter 37 > Mask Blocks > Clipping | The system shall dynamically clip background paths (such as alignment lines or walls) crossing mask boundaries. | Trace-to-Spec-v1 | Intersections clipping checks evaluated in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-64-003 | Chapter 37 > Mask Blocks > Anchoring | The system shall anchor the mask block boundaries to its host symbol, keeping them synced on translation. | Trace-to-Spec-v1 | Coordinates translations synced inside [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-64-004 | Chapter 37 > Mask Blocks > Display Overrides | The system shall support displaying the hidden details when switching to 3D representation models. | Trace-to-Spec-v1 | View-dependent overrides toggled inside three.js in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-64-005 | Chapter 37 > Mask Blocks > Updates | The system shall automatically refresh mask clipping boundaries whenever background geometry is edited. | Trace-to-Spec-v1 | Reactively compiled on workspace updates in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-64-006 | Chapter 37 > Mask Blocks > Location Properties | The system shall support overriding mask block insertion coordinates, rotation angles, and normal vectors relative to WCS/UCS inside the properties palette. | Trace-to-Spec-v1 | Not implemented |

