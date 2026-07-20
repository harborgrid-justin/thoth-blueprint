# Requirements Traceability Matrix - Part 58
**Subject:** Openings (Chapter 26)
**Coverage:** Wall Openings, Rectangular/Arched Shapes, Dimensions & Sill Offsets, Wall Anchor Links, Plan Boundary Displays, Custom Profiles, Wrapping Layers, Lintel Assemblies, Trim Profiles, Stretch Grips, Clearance Validator, Subtraction Templates, Fire Dampers, Elevation Tags, Cost Schedules, Shape Presets, Reinforcement Framing, Transparency Overrides, Layout Anchors, Thermal Envelope Calculations

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-58-001 | Chapter 26 > Openings > Styles | The system shall support Wall Openings with standard rectangular, circular, or custom profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-002 | Chapter 26 > Openings > Sizing | The system shall support configuring opening width, height, and sill offsets relative to base levels. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-003 | Chapter 26 > Openings > Wall Anchors | The system shall support anchoring openings in walls, dynamically updating openings locations when walls move. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-004 | Chapter 26 > Openings > Editing | The system shall support interactive grid positioning and drag grips to resize openings inside wall views. | Trace-to-Spec-v1 | Grip edits and cursor coordinates processed in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-58-005 | Chapter 26 > Openings > Plan view | The system shall render opening overhead lines or dotted headers on plan sheets. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-006 | Chapter 26 > Openings > Custom Profiles | The system shall support converting closed 2D polylines into custom opening cutout profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-007 | Chapter 26 > Openings > Wrapping Layers | The system shall support wrapping specific wall components (e.g. plaster, paint) around opening jambs. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-008 | Chapter 26 > Openings > Lintel Assemblies | The system shall support placing structural concrete or steel lintels above wall openings. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-009 | Chapter 26 > Openings > Trim Profiles | The system shall support customizable jamb and header trim molding profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-010 | Chapter 26 > Openings > Stretch Grips | The system shall provide visual stretch handles on openings to adjust dimensions directly in 3D. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-011 | Chapter 26 > Openings > Clearance Validator | The system shall flag warnings if openings are placed too close to wall corners or adjacent joints. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-012 | Chapter 26 > Openings > Subtraction Templates | The system shall support dynamic subtraction templates to carve voids out of composite slabs. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-013 | Chapter 26 > Openings > Fire Dampers | The system shall support placing automatic fire damper graphic symbols in duct openings. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-014 | Chapter 26 > Openings > Elevation Tags | The system shall support labelling sill and header elevations relative to finished floor datum elevations. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-015 | Chapter 26 > Openings > Cost Schedules | The system shall automatically inventory and compile openings shapes, dimensions, and types into schedules. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-016 | Chapter 26 > Openings > Shape Presets | The system shall provide default shape presets including rectangular, circular, gothic, and arched openings. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-017 | Chapter 26 > Openings > Reinforcement Framing | The system shall map structural header framing layouts (king/jack studs) around opening boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-018 | Chapter 26 > Openings > Transparency Overrides | The system shall support controlling transparency overrides display settings for openings in 3D models. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-019 | Chapter 26 > Openings > Layout Anchors | The system shall support anchoring openings horizontally to target wall grids. | Trace-to-Spec-v1 | Not implemented |
| REQ-58-020 | Chapter 26 > Openings > Thermal Envelope Calculations | The system shall subtract opening areas from envelope area calculations for energy loss computations. | Trace-to-Spec-v1 | Not implemented |

