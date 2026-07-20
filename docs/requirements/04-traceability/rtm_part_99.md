# Requirements Traceability Matrix - Part 99
**Subject:** Curtain Walls Grids & Nesting (Chapter 21, Part 3)
**Coverage:** Nested Grid Subdivisions, Frame Alignments Overrides, Mullion Priorities, Infill Panel Offsets, 3D Render Display, Grid Splits, Custom Frame Indexes, Corner Mullion Profiles, Curved Path Alignments, Object Embedding, Expansion Joints, Structural Anchoring, Thermal Properties, Panel Takeoffs QTO

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-99-001 | Chapter 21 > Curtain Walls > Nested Grids | The system shall support nesting curtain wall grid cells to partition sub-grid designs. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-002 | Chapter 21 > Curtain Walls > Frame Alignments | The system shall support overriding default frame alignments boundaries at grids corners. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-003 | Chapter 21 > Curtain Walls > Mullions Priority | The system shall enforce intersection priority rules when vertical and horizontal mullions overlap. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-004 | Chapter 21 > Curtain Walls > Panel Offsets | The system shall support setting infill panel thickness and offsets relative to baseline curves. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-005 | Chapter 21 > Curtain Walls > 3D Render | The system shall display frames, mullions, and glazing elements dynamically in 3D realistic viewports. | Trace-to-Spec-v1 | Rendered inside three.js scene graphics compiler in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-99-006 | Chapter 21 > Curtain Walls > Grid Splits | The system shall support horizontal and vertical grid division splits by fixed distance, manual coordinates, or uniform divisions count. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-007 | Chapter 21 > Curtain Walls > Index Overrides | The system shall support assigning custom profiles to frame edges and specific vertical/horizontal mullion indices. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-008 | Chapter 21 > Curtain Walls > Corner Mullions | The system shall support custom structural corner profiles (L-corner, V-corner) at grid angle intersections. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-009 | Chapter 21 > Curtain Walls > Curved Layouts | The system shall support facetting curtain walls along curved path footprints dynamically. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-010 | Chapter 21 > Curtain Walls > Object Embedding | The system shall support inserting custom door or window objects directly into grid cells, overwriting infills. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-011 | Chapter 21 > Curtain Walls > Expansion Joints | The system shall support setting custom expansion joint offsets between panel frames. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-012 | Chapter 21 > Curtain Walls > Hardware Anchors | The system shall support computing coordinate anchor points for structural glazing clips accessories. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-013 | Chapter 21 > Curtain Walls > Structural Anchoring | The system shall compute structural ties layouts between curtain frames and columns. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-014 | Chapter 21 > Curtain Walls > Thermal Break | The system shall maintain R-value and thermal break metadata properties directly on curtain wall styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-015 | Chapter 21 > Curtain Walls > Panels Takeoffs | The system shall compile panel lists schedules counting panel dimensions, materials, and locations for QTO sheets. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-016 | Chapter 21 > Curtain Walls > Grid Templates | The system shall support importing curtain grid division layouts from standard XML template databases. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-017 | Chapter 21 > Curtain Walls > Panel Materials | The system shall support overriding individual grid panel infill materials (e.g. metal louvers, stone panels). | Trace-to-Spec-v1 | Not implemented |
| REQ-99-018 | Chapter 21 > Curtain Walls > Wind-Load Checks | The system shall validate curtain wall frame structural designs against structural wind pressure tables. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-019 | Chapter 21 > Curtain Walls > Mullion Miters | The system shall support miter cut joints at horizontal and vertical mullion intersections. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-020 | Chapter 21 > Curtain Walls > Sealant Volume | The system shall compute structural silicone sealant joints volume requirements for cost estimates. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-021 | Chapter 21 > Curtain Walls > Acoustic STC | The system shall store Sound Transmission Class acoustic ratings directly on curtain wall styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-022 | Chapter 21 > Curtain Walls > Mullion Rotations | The system shall support longitudinal rotation angle offsets on individual mullion components. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-023 | Chapter 21 > Curtain Walls > Spider Fittings | The system shall support modeling structural spider clip connections at frameless panel intersections. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-024 | Chapter 21 > Curtain Walls > Deflection Limits | The system shall run structural deflection checks on framing spans under design loads. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-025 | Chapter 21 > Curtain Walls > Door Clearances | The system shall validate that embedded swing door leaves have clearance space within wall frames. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-026 | Chapter 21 > Curtain Walls > Air Insulation | The system shall support vacuum air gap thickness specifications on double-glazed panels styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-027 | Chapter 21 > Curtain Walls > Panel Anchors | The system shall model anchor ties locating embedded precast panels to slab edges. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-028 | Chapter 21 > Curtain Walls > Fritted Glass | The system shall support rendering fritted glass texture patterns overrides on selected glazing panels. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-029 | Chapter 21 > Curtain Walls > Glass Radii | The system shall flag warning indicators when curved paths violate minimum glass panel bend radii limits. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-030 | Chapter 21 > Curtain Walls > DWG Export | The system shall support exporting curtain wall elevation coordinates to vector layout DWG drawings. | Trace-to-Spec-v1 | Not implemented |



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


