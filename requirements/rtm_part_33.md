# Requirements Traceability Matrix - Part 33
**Subject:** Profiles and Custom Section Outlines (Chapter 36)
**Coverage:** 2D Profile Definitions, Centroid Alignments, Void Deductions, Assembly Sweep Templates, Property Set Data

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-33-001 | Chapter 36 > Profiles > Polyline Definitions | The system shall support defining custom 2D Profiles from closed drawing polylines for extrusion templates. | Trace-to-Spec-v1 | Standard shapes and polygons parsed in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-33-002 | Chapter 36 > Profiles > Centroid Insertion | The system shall automatically calculate the profile centroid to define the insertion point when swept along paths. | Trace-to-Spec-v1 | Profile centroid resolved using `centroid` in [geometry.ts](../packages/domain/src/geometry.ts#L45) |
| REQ-33-003 | Chapter 36 > Profiles > Voids | The system shall support nested inner boundaries within the outer profile to define hollow voids (e.g. pipe conduits). | Trace-to-Spec-v1 | Voids in shapes parsed as polygon rings in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-33-004 | Chapter 36 > Profiles > Assembly Sweeps | The system shall support using profile definitions as templates for corridor assemblies and structural columns. | Trace-to-Spec-v1 | Sweep shapes mapped to [assembly.ts](../packages/domain/src/assembly.ts#L10) components |
| REQ-33-005 | Chapter 36 > Profiles > Properties | The system shall support associating design classification and material catalog metadata with profile shapes. | Trace-to-Spec-v1 | Property catalog metadata linked to features in [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
