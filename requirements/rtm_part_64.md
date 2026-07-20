# Requirements Traceability Matrix - Part 64
**Subject:** Mask Blocks (Chapter 37)
**Coverage:** Mask Block Creation, Dynamic Background Path Clipping, Symbol Anchoring, Viewport Visibility Overrides, Boundary Refreshes, Properties Location Controls, Polyline Boundaries, Intersection Trimming, Viewport Exclusions, Edge Segmentations, Automated Layering, Transparency Shading, Scale Constraints, Group Attachments, Profiles Catalog, Printing Exclusions

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-64-001 | Chapter 37 > Mask Blocks > Creation | The system shall support creating Mask Blocks to hide background linework behind drawing symbols. | Trace-to-Spec-v1 | Dotted outlines clipping computed inside [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-64-002 | Chapter 37 > Mask Blocks > Clipping | The system shall dynamically clip background paths (such as alignment lines or walls) crossing mask boundaries. | Trace-to-Spec-v1 | Intersections clipping checks evaluated in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-64-003 | Chapter 37 > Mask Blocks > Anchoring | The system shall anchor the mask block boundaries to its host symbol, keeping them synced on translation. | Trace-to-Spec-v1 | Coordinates translations synced inside [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-64-004 | Chapter 37 > Mask Blocks > Display Overrides | The system shall support displaying the hidden details when switching to 3D representation models. | Trace-to-Spec-v1 | View-dependent overrides toggled inside three.js in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-64-005 | Chapter 37 > Mask Blocks > Updates | The system shall automatically refresh mask clipping boundaries whenever background geometry is edited. | Trace-to-Spec-v1 | Reactively compiled on workspace updates in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-64-006 | Chapter 37 > Mask Blocks > Location Properties | The system shall support overriding mask block insertion coordinates, rotation angles, and normal vectors relative to WCS/UCS inside the properties palette. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-007 | Chapter 37 > Mask Blocks > Polyline Boundaries | The system shall support converting closed drawing polylines into custom mask block clipping boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-008 | Chapter 37 > Mask Blocks > Intersection Trimming | The system shall automatically trim background lines, arcs, and fills crossing mask block boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-009 | Chapter 37 > Mask Blocks > Viewport Exclusions | The system shall support overriding mask block visibility settings within individual layout viewports. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-010 | Chapter 37 > Mask Blocks > Edge Segmentations | The system shall support edge segmentations settings to increase contour fidelity on curved mask boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-011 | Chapter 37 > Mask Blocks > Automated Layering | The system shall place mask block geometries on unique hidden layers automatically based on CAD style keys. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-012 | Chapter 37 > Mask Blocks > Transparency Shading | The system shall support applying transparency overrides shading to background lines inside mask boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-013 | Chapter 37 > Mask Blocks > Scale Constraints | The system shall scale mask block boundaries proportionally when host block reference scales change. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-014 | Chapter 37 > Mask Blocks > Group Attachments | The system shall support attaching single mask blocks to multiple group combinations of symbols. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-015 | Chapter 37 > Mask Blocks > Profiles Catalog | The system shall maintain standard profile templates for mask outlines inside reusable catalogs libraries. | Trace-to-Spec-v1 | Not implemented |
| REQ-64-016 | Chapter 37 > Mask Blocks > Printing Exclusions | The system shall support options to exclude mask block boundary outlines from plotted prints outputs. | Trace-to-Spec-v1 | Not implemented |


