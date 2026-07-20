# Requirements Traceability Matrix - Part 58
**Subject:** Openings (Chapter 26)
**Coverage:** Wall Openings, Rectangular/Arched Shapes, Dimensions & Sill Offsets, Wall Anchor Links, Plan Boundary Displays

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-58-001 | Chapter 26 > Openings > Styles | The system shall support Wall Openings with standard rectangular, circular, or custom profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-002 | Chapter 26 > Openings > Sizing | The system shall support configuring opening width, height, and sill offsets relative to base levels. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-003 | Chapter 26 > Openings > Wall Anchors | The system shall support anchoring openings in walls, dynamically updating openings locations when walls move. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-004 | Chapter 26 > Openings > Editing | The system shall support interactive grid positioning and drag grips to resize openings inside wall views. | Trace-to-Spec-v1 | Grip edits and cursor coordinates processed in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-58-005 | Chapter 26 > Openings > Plan view | The system shall render opening overhead lines or dotted headers on plan sheets. | Trace-to-Spec-v1 | Not implemented |
