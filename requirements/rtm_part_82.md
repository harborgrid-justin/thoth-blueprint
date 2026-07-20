# Requirements Traceability Matrix - Part 82
**Subject:** Outer Boundary Clipping & Mask Blocks Updates (Chapter 37, Part 2)
**Coverage:** Boundary Clipping, Translation Sync, Multiple Mask Blocks, Model/Sheet Visibility, Dynamic Updates

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-82-001 | Chapter 37 > Mask Blocks > Boundary | The system shall determine mask clipping boundaries using the outer envelope of the mask block. | Trace-to-Spec-v1 | Envelope bounds checked using `bounds` in [geometry.ts](../packages/domain/src/geometry.ts#L30) |
| REQ-82-002 | Chapter 37 > Mask Blocks > Translation | The system shall translate mask boundaries dynamically when the anchored symbol block is moved. | Trace-to-Spec-v1 | Coordinates recalculated reactively in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-82-003 | Chapter 37 > Mask Blocks > Multiple Masks | The system shall support attaching multiple mask blocks to a single background element. | Trace-to-Spec-v1 | Not implemented |
| REQ-82-004 | Chapter 37 > Mask Blocks > Visibility | The system shall hide background elements in 2D sheets while keeping them visible in 3D realistic viewports. | Trace-to-Spec-v1 | Render representations configured in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-82-005 | Chapter 37 > Mask Blocks > Refresh | The system shall automatically recalculate mask clipping intersections whenever background paths are modified. | Trace-to-Spec-v1 | Reactively recompiled on state edits inside [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
