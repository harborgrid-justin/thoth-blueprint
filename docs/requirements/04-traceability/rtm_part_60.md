# Requirements Traceability Matrix - Part 60
**Subject:** Roofs (Chapter 29)
**Coverage:** Roof Styles (Gable/Hip/Shed), Sloped Outlines, Footprint Boundary, Overhang & Soffits, Thicknesses, 3D Rendering, Edit Edges/Faces Configuration, Gable Conversion, Trim Extrusions, Dormer Openings, Drainage Limits, Framing Layout, Seam Flashings, Composite Layers, Voids Deductions QTO

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-60-001 | Chapter 29 > Roofs > Styles | The system shall support Roof Styles defining sloped pitch (gable, hip, shed) and plate heights. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-002 | Chapter 29 > Roofs > Footprint | The system shall support creating roofs by selecting closed wall footprints or polylines. | Trace-to-Spec-v1 | Mapped to closed spatial boundary elements in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts#L82) |
| REQ-60-003 | Chapter 29 > Roofs > Overhangs | The system shall support setting custom overhang distances, fascia dimensions, and soffit options. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-004 | Chapter 29 > Roofs > Thickness | The system shall support setting roof slab thickness parameters and structural cuts. | Trace-to-Spec-v1 | Slab thickness parameters supported in structural build configurations in [buildScene.ts](../../../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-60-005 | Chapter 29 > Roofs > 3D Model | The system shall display sloped roofs in the 3D model with realistic slate/shingle colors. | Trace-to-Spec-v1 | Rendered in three.js scene graphics in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-60-006 | Chapter 29 > Roofs > Face Slopes | The system shall support editing individual face slopes dynamically using the Edit Edges/Faces context tool. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-007 | Chapter 29 > Roofs > Gable Conversion | The system shall support converting hip roof edges dynamically to vertical gable wall profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-008 | Chapter 29 > Roofs > Trim Extrusions | The system shall support extruding custom fascia boards and soffit trim profiles along roof edges. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-009 | Chapter 29 > Roofs > Dormer Openings | The system shall support cutting main roof structures automatically at intersections with dormer roofs. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-010 | Chapter 29 > Roofs > Drainage Limits | The system shall validate roof drainage slope angles against minimum criteria (e.g. 1/4" per foot). | Trace-to-Spec-v1 | Not implemented |
| REQ-60-011 | Chapter 29 > Roofs > Framing Layout | The system shall support calculating rafter and truss insertion coordinate points layouts. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-012 | Chapter 29 > Roofs > Seam Flashings | The system shall calculate total seam lengths of valleys and hips for flashings cost estimates. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-013 | Chapter 29 > Roofs > Composite Layers | The system shall support multi-layer composite thickness definitions (plywood, insulation, shingles). | Trace-to-Spec-v1 | Not implemented |
| REQ-60-014 | Chapter 29 > Roofs > Voids Deductions | The system shall subtract chimney and skylight openings from roof area material calculations in QTO sheets. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-015 | Chapter 29 > Roofs > Gravel Stops | The system shall support sweeping custom gravel stops profiles along flat roof boundary outlines. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-016 | Chapter 29 > Roofs > Pitch Overrides | The system shall support manual slope ratio overrides on individual roof planes faces. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-017 | Chapter 29 > Roofs > Skylight Voids | The system shall support automatic slab void cutting when placing skylight window objects. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-018 | Chapter 29 > Roofs > Soffit Vents | The system shall support modeling soffit ventilation slots details within eave profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-019 | Chapter 29 > Roofs > Overhang Offsets | The system shall support custom horizontal overhang offsets measured from wall outer faces. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-020 | Chapter 29 > Roofs > Snow Loads | The system shall store design snow load capacities attributes on roof style parameters. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-021 | Chapter 29 > Roofs > Surface QTO | The system shall calculate actual tile or shingle counts based on slope area and spacing specifications. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-022 | Chapter 29 > Roofs > Wall Syncs | The system shall automatically adjust eave line elevations in response to hosting wall heights modifications. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-023 | Chapter 29 > Roofs > Drainage Crickets | The system shall support modeling drainage crickets to divert rainwater behind chimneys. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-024 | Chapter 29 > Roofs > Rafter Ties | The system shall generate placement coordinates for collar ties and structural rafter ties. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-025 | Chapter 29 > Roofs > Valley Intersections | The system shall calculate intersection paths of sloped roof planes to determine valley paths. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-026 | Chapter 29 > Roofs > Insulation R-Value | The system shall store thermal R-value specifications directly on roof style definitions. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-027 | Chapter 29 > Roofs > Mansard Templates | The system shall support multi-pitch mansard roof configurations templates. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-028 | Chapter 29 > Roofs > Parapet Connections | The system shall support anchoring roof boundaries to surrounding parapet walls. | Trace-to-Spec-v1 | Not implemented |
| REQ-60-029 | Chapter 29 > Roofs > Framing Export | The system shall support exporting rafter framing layouts to wood manufacturing formats. | Trace-to-Spec-v1 | Not implemented |




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


