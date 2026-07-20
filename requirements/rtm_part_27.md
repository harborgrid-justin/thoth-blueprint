# Requirements Traceability Matrix - Part 27
**Subject:** Conceptual Site Design & Massing (Chapter 15)
**Coverage:** Extrusion/Revolution Mass Elements, 3D ACIS Solids Conversion, Facet Resolution (FACETDEV), Centroid Insertion

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-27-001 | Chapter 15 > Massing > Extrusion Profiles | The system shall support creating extruded massing elements by projecting 2D profiles vertically. | Trace-to-Spec-v1 | Extruded shapes modeled via [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-27-002 | Chapter 15 > Massing > Revolution Profiles | The system shall support creating revolved massing elements by rotating 2D profiles about a local axis. | Trace-to-Spec-v1 | Modeled in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-27-003 | Chapter 15 > Massing > 3D Solids Convert | The system shall support converting external 3D solids (ACIS format) into editable free-form mesh objects. | Trace-to-Spec-v1 | Handled via [meshIo.ts](../apps/web/src/features/interop/meshIo.ts) |
| REQ-27-004 | Chapter 15 > Massing > Facet Resolution | The system shall provide settings to adjust facet resolution variables (FACETDEV) to smooth curved mesh edges. | Trace-to-Spec-v1 | Tessellation segments controlled in 3D build configurations in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-27-005 | Chapter 15 > Massing > Centroid Insertion | The system shall automatically calculate the geometric centroid of profiles to define the mass element insertion point. | Trace-to-Spec-v1 | Centroid coordinates calculated via `centroid` in [geometry.ts](../packages/domain/src/geometry.ts#L45) |
