# Requirements Traceability Matrix - Part 99
**Subject:** Curtain Walls Grids & Nesting (Chapter 21, Part 3)
**Coverage:** Nested Grid Subdivisions, Frame Alignments Overrides, Mullion Priorities, Infill Panel Offsets, 3D Render Display, Grid Splits, Custom Frame Indexes, Corner Mullion Profiles, Curved Path Alignments, Object Embedding, Expansion Joints, Structural Anchoring, Thermal Properties, Panel Takeoffs QTO

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-99-001 | Chapter 21 > Curtain Walls > Nested Grids | The system shall support nesting curtain wall grid cells to partition sub-grid designs. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-002 | Chapter 21 > Curtain Walls > Frame Alignments | The system shall support overriding default frame alignments boundaries at grids corners. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-003 | Chapter 21 > Curtain Walls > Mullions Priority | The system shall enforce intersection priority rules when vertical and horizontal mullions overlap. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-004 | Chapter 21 > Curtain Walls > Panel Offsets | The system shall support setting infill panel thickness and offsets relative to baseline curves. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-005 | Chapter 21 > Curtain Walls > 3D Render | The system shall display frames, mullions, and glazing elements dynamically in 3D realistic viewports. | Trace-to-Spec-v1 | Rendered inside three.js scene graphics compiler in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-99-006 | Chapter 21 > Curtain Walls > Grid Splits | The system shall support horizontal and vertical grid division splits by fixed distance, manual coordinates, or uniform divisions count. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-007 | Chapter 21 > Curtain Walls > Index Overrides | The system shall support assigning custom profiles to frame edges and specific vertical/horizontal mullion indices. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-008 | Chapter 21 > Curtain Walls > Corner Mullions | The system shall support custom structural corner profiles (L-corner, V-corner) at grid angle intersections. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-009 | Chapter 21 > Curtain Walls > Curved Layouts | The system shall support facetting curtain walls along curved path footprints dynamically. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-0010 | Chapter 21 > Curtain Walls > Object Embedding | The system shall support inserting custom door or window objects directly into grid cells, overwriting infills. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-011 | Chapter 21 > Curtain Walls > Expansion Joints | The system shall support setting custom expansion joint offsets between panel frames. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-012 | Chapter 21 > Curtain Walls > Hardware Anchors | The system shall support computing coordinate anchor points for structural glazing clips accessories. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-013 | Chapter 21 > Curtain Walls > Structural Anchoring | The system shall compute structural ties layouts between curtain frames and columns. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-014 | Chapter 21 > Curtain Walls > Thermal Break | The system shall maintain R-value and thermal break metadata properties directly on curtain wall styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-99-015 | Chapter 21 > Curtain Walls > Panels Takeoffs | The system shall compile panel lists schedules counting panel dimensions, materials, and locations for QTO sheets. | Trace-to-Spec-v1 | Not implemented |

