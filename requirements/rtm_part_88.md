# Requirements Traceability Matrix - Part 88
**Subject:** Napkin Sketch (Chapter 18)
**Coverage:** Napkin Sketch Tool, Loose Hand-drawn Line styles, Wiggle/Overshoot Parameters, Viewport Layouts application, Sketch Exports, Sketch Presets, Corner Overshoot, Scale-adjusted Wiggle, Hand Shading, Outline Simplification

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-88-001 | Chapter 18 > Napkin Sketch > Tool | The system shall support a Napkin Sketch tool to format vector lines with a hand-drawn style. | Trace-to-Spec-v1 | Not implemented |
| REQ-88-002 | Chapter 18 > Napkin Sketch > Styles | The system shall apply loose pencil/charcoal line strokes styles to plan boundaries. | Trace-to-Spec-v1 | SVG stroke dashboard filters applied in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-88-003 | Chapter 18 > Napkin Sketch > Parameters | The system shall support setting line wiggle (hand jitter) and corner overshoot length scale options. | Trace-to-Spec-v1 | Not implemented |
| REQ-88-004 | Chapter 18 > Napkin Sketch > Viewports | The system shall support applying sketch style filters to designated paper-space viewports. | Trace-to-Spec-v1 | Rendering filters configured inside layout sheets in [PlatSheetDialog.tsx](../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-88-005 | Chapter 18 > Napkin Sketch > Export | The system shall support exporting sketched views to PDF or PNG image files. | Trace-to-Spec-v1 | PDF sheet printing options mapped in [pdfExport.ts](../apps/web/src/features/sheets/pdfExport.ts) |
| REQ-88-006 | Chapter 18 > Napkin Sketch > Presets | The system shall support standard sketch presets for Pencil, Ink, Charcoal, and Loose Sketch styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-88-007 | Chapter 18 > Napkin Sketch > Corner Overshoot | The system shall support deforming lines to overshoot slightly beyond intersections to mimic hand-drafted drawings. | Trace-to-Spec-v1 | Not implemented |
| REQ-88-008 | Chapter 18 > Napkin Sketch > Wiggle Scaling | The system shall automatically scale wiggle factors based on active viewport plot scale parameters. | Trace-to-Spec-v1 | Not implemented |
| REQ-88-009 | Chapter 18 > Napkin Sketch > Hand Shading | The system shall generate loose hand-drawn hatch overlays to simulate manual shading fills. | Trace-to-Spec-v1 | Not implemented |
| REQ-88-010 | Chapter 18 > Napkin Sketch > Outline Simplification | The system shall simplify drawing polylines vertices automatically to yield high-performance jitter wiggles. | Trace-to-Spec-v1 | Not implemented |

