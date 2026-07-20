# Requirements Traceability Matrix - Part 52
**Subject:** Walls (Chapter 20)
**Coverage:** Wall Styles (Composite Components), Justification (Inside/Outside Direction), Wall Endcaps, Cleanup Groups, Convert Polylines to Walls, Cleanup Overrides, Endcaps Catalog, Component Wrapping, Face Modifiers, Wall Sweeps, Layer Offsets, Group Exclusions, Opening Interference, Stud Centerlines, Fire Ratings, Acoustic Data, Layer QTO, Foundation Sync, Facet Segments, Layer Allocation

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-52-001 | Chapter 20 > Walls > Styles | The system shall support Wall Styles with multiple components (e.g., studs, GWB, masonry) having individual widths. | Trace-to-Spec-v1 | Roadway assemblies sub-elements (Lanes, Sidewalks) mapped in [assembly.ts](../../../packages/domain/src/assembly.ts) |
| REQ-52-002 | Chapter 20 > Walls > Direction | The system shall track interior and exterior wall faces dynamically using component indexing relative to direction. | Trace-to-Spec-v1 | Curve direction and offset computations checked in [geometry.ts](../../../packages/domain/src/geometry.ts) |
| REQ-52-003 | Chapter 20 > Walls > Endcaps | The system shall support customizable Wall Endcaps for wall start and end terminations. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-004 | Chapter 20 > Walls > Cleanup Groups | The system shall provide Wall Cleanup Groups to automatically clean wall intersections and corners. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-005 | Chapter 20 > Walls > Convert Objects | The system shall support converting drawing 2D polylines into 3D Wall elements. | Trace-to-Spec-v1 | Polylines mapped as wall footprint paths during assembly sweeps in [corridor.ts](../../../packages/domain/src/corridor.ts) |
| REQ-52-006 | Chapter 20 > Walls > Cleanup Overrides | The system shall support manual cleanup overrides at corners using interactive grip handles. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-007 | Chapter 20 > Walls > Endcaps Catalog | The system shall maintain a standard catalog library of custom wall start/end cap profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-008 | Chapter 20 > Walls > Component Wrapping | The system shall support wrapping specific wall components (e.g., brick veneer, insulation) around door and window openings. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-009 | Chapter 20 > Walls > Face Modifiers | The system shall support applying 3D solid profiles as face modifiers to subtract or add volume from walls. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-010 | Chapter 20 > Walls > Wall Sweeps | The system shall support sweeping wall styles vertically or horizontally along custom alignment baselines. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-011 | Chapter 20 > Walls > Layer Offsets | The system shall support setting independent top and bottom vertical height offsets for each wall component layer. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-012 | Chapter 20 > Walls > Group Exclusions | The system shall prevent wall cleanups and corner merges between walls belonging to different cleanup groups. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-013 | Chapter 20 > Walls > Opening Interference | The system shall audit wall layouts and flag overlapping doors, windows, or structural openings. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-014 | Chapter 20 > Walls > Stud Centerlines | The system shall generate layout coordinates centerlines for structural wall framing stud layouts. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-015 | Chapter 20 > Walls > Fire Ratings | The system shall store fire rating metadata (e.g. 1-hr, 2-hr) and validate that openings fire ratings match. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-016 | Chapter 20 > Walls > Acoustic Data | The system shall store Sound Transmission Class (STC) ratings directly on wall style definitions. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-017 | Chapter 20 > Walls > Layer QTO | The system shall calculate surface areas and material volumes independently for each wall component layer. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-018 | Chapter 20 > Walls > Foundation Sync | The system shall support automatically scaling foundation footing widths in response to wall thickness updates. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-019 | Chapter 20 > Walls > Facet Segments | The system shall support adjusting facet resolutions settings to segment curved wall boundaries cleanly in 3D views. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-020 | Chapter 20 > Walls > Layer Allocation | The system shall support allocating wall styles to standardized layers automatically based on CAD style keys. | Trace-to-Spec-v1 | Not implemented |


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


