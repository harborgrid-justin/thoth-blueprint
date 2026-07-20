# Requirements Traceability Matrix - Part 97
**Subject:** Slabs & Roof Slabs Edge Styles (Chapter 30, Part 2)
**Coverage:** Miter Slab Edges, Plumb/Square Fascia Cuts, Gutter Offset Limits, 3D Edge Materials, Cost Formulas Links

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-97-001 | Chapter 30 > Slabs > Mitering | The system shall support mitering slab edge styles intersections at corners. | Trace-to-Spec-v1 | Corner offsets calculated in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-97-002 | Chapter 30 > Slabs > Fascia Cuts | The system shall support plumb or square cut profiles for overhang fascia edges. | Trace-to-Spec-v1 | Not implemented |
| REQ-97-003 | Chapter 30 > Slabs > Gutter Offsets | The system shall support gutter offsets dimensions parameters on edge styles templates. | Trace-to-Spec-v1 | Mapped to [assembly.ts](../packages/domain/src/assembly.ts#L10) curb dimensions |
| REQ-97-004 | Chapter 30 > Slabs > Edge Material | The system shall display edge styles materials and colors inside 3D viewports. | Trace-to-Spec-v1 | Rendered in three.js scene graphics in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-97-005 | Chapter 30 > Slabs > Edge Cost Takeoffs | The system shall compile cost estimates equations based on slab edge perimeter lengths. | Trace-to-Spec-v1 | Cost equations evaluated in [qto.ts](../packages/domain/src/qto.ts) |
