# Requirements Traceability Matrix - Part 66
**Subject:** Elevations (Chapter 41)
**Coverage:** Elevation Boundary Boxes, Plan Projection Views, Depth Subdivisions, Material Shading, Elevation Labels Integration

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-66-001 | Chapter 41 > Elevations > Boundaries | The system shall support defining Elevation boundary boxes to specify the range of projection views. | Trace-to-Spec-v1 | Area boundaries mapped in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-66-002 | Chapter 41 > Elevations > Projections | The system shall generate 2D side projection views of the 3D site structures model. | Trace-to-Spec-v1 | Profile models plotted inside [ProfileSectionDialog.tsx](../apps/web/src/features/survey/ProfileSectionDialog.tsx) |
| REQ-66-003 | Chapter 41 > Elevations > Depth Ranges | The system shall support subdivisions to style foreground, midground, and background elements differently. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-004 | Chapter 41 > Elevations > Shading | The system shall apply material colors and lighting shadows to generated elevation views. | Trace-to-Spec-v1 | Ambient lighting and shade styles applied inside [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-66-005 | Chapter 41 > Elevations > Labels | The system shall support placing associative elevation labels on elevation views. | Trace-to-Spec-v1 | Dynamic benchmark text labels compiled in [labeling.ts](../packages/domain/src/labeling.ts) |
