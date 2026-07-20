# Requirements Traceability Matrix - Part 27
**Subject:** Conceptual Site Design & Massing (Chapter 15)
**Coverage:** Extrusion/Revolution Mass Elements, 3D ACIS Solids Conversion, Facet Resolution (FACETDEV), Centroid Insertion, Boolean Operations, Polyline Sweeps, Sliced Contours, Shape Conversions, Subtractive Modifiers, History Trees, Smoothing Controls, Volume Takeoffs, Shape Presets, Materials Mapping

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-27-001 | Chapter 15 > Massing > Extrusion Profiles | The system shall support creating extruded massing elements by projecting 2D profiles vertically. | Trace-to-Spec-v1 | Extruded shapes modeled via [buildScene.ts](../../../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-27-002 | Chapter 15 > Massing > Revolution Profiles | The system shall support creating revolved massing elements by rotating 2D profiles about a local axis. | Trace-to-Spec-v1 | Modeled in [buildScene.ts](../../../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-27-003 | Chapter 15 > Massing > 3D Solids Convert | The system shall support converting external 3D solids (ACIS format) into editable free-form mesh objects. | Trace-to-Spec-v1 | Handled via [meshIo.ts](../../../apps/web/src/features/interop/meshIo.ts) |
| REQ-27-004 | Chapter 15 > Massing > Facet Resolution | The system shall provide settings to adjust facet resolution variables (FACETDEV) to smooth curved mesh edges. | Trace-to-Spec-v1 | Tessellation segments controlled in 3D build configurations in [buildScene.ts](../../../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-27-005 | Chapter 15 > Massing > Centroid Insertion | The system shall automatically calculate the geometric centroid of profiles to define the mass element insertion point. | Trace-to-Spec-v1 | Centroid coordinates calculated via `centroid` in [geometry.ts](../../../packages/domain/src/geometry.ts#L45) |
| REQ-27-006 | Chapter 15 > Massing > Boolean Operations | The system shall support real-time boolean operations (Union, Difference, Intersection) between adjacent mass elements inside a Mass Group. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-007 | Chapter 15 > Massing > Polyline Sweeps | The system shall support sweeping custom closed polylines along vertical or angled 3D baseline paths to create complex massings. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-008 | Chapter 15 > Massing > Sliced Contours | The system shall automatically compute and render contour slice curves when mass elements intersect viewport horizontal cut planes. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-009 | Chapter 15 > Massing > Shape Conversions | The system shall support converting standard wall, slab, or roof geometries directly into editable free-form mass elements. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-010 | Chapter 15 > Massing > Subtractive Modifiers | The system shall support subtractive modifier objects that subtract volumes from selected mass element bodies. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-011 | Chapter 15 > Massing > History Trees | The system shall maintain an interactive Mass Group history tree to manage the hierarchy of boolean element modifiers. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-012 | Chapter 15 > Massing > Smoothing Controls | The system shall support surface tessellation density parameters to control smoothing levels for curved faces. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-013 | Chapter 15 > Massing > Volume Takeoffs | The system shall compute total volume and surface area properties dynamically for QTO takeoff calculations. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-014 | Chapter 15 > Massing > Shape Presets | The system shall provide default mass element shape templates including Cylinder, Box, Gable, Dome, and Arch. | Trace-to-Spec-v1 | Not implemented |
| REQ-27-015 | Chapter 15 > Massing > Materials Mapping | The system shall support mapping standard visual materials, hatch patterns, and textures overrides to massing elements. | Trace-to-Spec-v1 | Not implemented |


---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](file:///f:/AutoCAD%20Competitor/docs/requirements/README.md)
- [Master Requirements Traceability Matrix (RTM)](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/traceability-matrix.md)
- [Requirements Coverage Report](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/unimplemented_requirements.md)
- [Frontend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/frontend-requirements.md)
- [Backend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/backend-requirements.md)
- [Domain Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/domain-requirements.md)
- [Interoperability Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/03-nonfunctional/nonfunctional-requirements.md)


