# Requirements Traceability Matrix - Part 92
**Subject:** Converting Objects to 3D Solids (Chapter 52)
**Coverage:** AEC to AutoCAD Solids conversion, ACIS SAT Exports, Curved Facet Fidelity, Topology Simplification, Solids Inspector

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-92-001 | Chapter 52 > Converting > Solids Convert | The system shall support converting custom 3D mesh components into AutoCAD-compatible 3D solid geometries. | Trace-to-Spec-v1 | Mapped to mesh objects exports in [blueprintExport.ts](../apps/web/src/features/interop/blueprintExport.ts#L100) |
| REQ-92-002 | Chapter 52 > Converting > ACIS Exports | The system shall support exporting site models to standard ACIS (SAT) files formats. | Trace-to-Spec-v1 | COLLADA (DAE) format export supported in [blueprintExport.ts](../apps/web/src/features/interop/blueprintExport.ts#L100) |
| REQ-92-003 | Chapter 52 > Converting > Curves Fidelity | The system shall maintain smooth curved tessellations on solids boundary edges. | Trace-to-Spec-v1 | Tessellation segments controlled in three.js scene compiler in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-92-004 | Chapter 52 > Converting > Simplification | The system shall simplify mesh topologies by combining adjacent coplanar faces before exporting. | Trace-to-Spec-v1 | Simplified mesh geometry optimized inside [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-92-005 | Chapter 52 > Converting > Properties | The system shall display converted 3D solid volumes and dimensions in properties dialogs. | Trace-to-Spec-v1 | Dimensions listed dynamically inside [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx#L88) |
