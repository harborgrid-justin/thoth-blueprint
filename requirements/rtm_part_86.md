# Requirements Traceability Matrix - Part 86
**Subject:** Quick Slice (Chapter 16)
**Coverage:** Slice Plane Selection, Slicing Geometries, Slice View Generation, Visual Style Overrides, Slice Refreshes

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-86-001 | Chapter 16 > Quick Slice > Selection | The system shall support placing vertical or horizontal Quick Slice planes to clip drawings display. | Trace-to-Spec-v1 | Viewport slicing planes managed in rendering options in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-86-002 | Chapter 16 > Quick Slice > Slicing | The system shall slice through 3D meshes along cut planes to expose internal sections. | Trace-to-Spec-v1 | Slicing geometries along station offsets computed in [profile.ts](../packages/domain/src/profile.ts) |
| REQ-86-003 | Chapter 16 > Quick Slice > View | The system shall project sliced profiles onto 2D plan layout viewports. | Trace-to-Spec-v1 | Cross section profiles drawn dynamically in [ProfileSectionDialog.tsx](../apps/web/src/features/survey/ProfileSectionDialog.tsx) |
| REQ-86-004 | Chapter 16 > Quick Slice > Overrides | The system shall apply outline drawing overrides to sliced edges (e.g. thick lines for cuts). | Trace-to-Spec-v1 | Stroke widths and colors styles configured in [ProfileSectionDialog.tsx](../apps/web/src/features/survey/ProfileSectionDialog.tsx#L125) |
| REQ-86-005 | Chapter 16 > Quick Slice > Auto-Refresh | The system shall automatically update slice views when primary 3D structures change. | Trace-to-Spec-v1 | Updated reactively inside state listeners in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
