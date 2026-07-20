# Requirements Traceability Matrix - Part 40
**Subject:** Callouts, Details, and Sheet Indexing (Chapter 48)
**Coverage:** Detail Callouts, Model Space Viewports, Sheet Hyperlink Association, Sheet Indexing, Title Blocks, Space-Bounded Elevations

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-40-001 | Chapter 48 > Callouts > Detail Callouts | The system shall support placing detail callout markers containing title, scale, and target sheet reference fields. | Trace-to-Spec-v1 | Callout annotation models and labels rendered in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-40-002 | Chapter 48 > Callouts > Model Space Views | The system shall support defining layout view boundaries from a callout outline. | Trace-to-Spec-v1 | Bound view box regions mapped in [planproduction.ts](../packages/domain/src/planproduction.ts#L41) |
| REQ-40-003 | Chapter 48 > Callouts > Hyperlink | The system shall support double-clicking a callout marker to navigate directly to the target sheet view layout. | Trace-to-Spec-v1 | Interactive viewport focus triggers implemented in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-40-004 | Chapter 48 > Callouts > Sheet Indexing | The system shall maintain an index of standard layout sheets with automatic numbering sequence synchronization. | Trace-to-Spec-v1 | Dynamic sheet sequencing and numbering calculated in [sheet.ts](../packages/domain/src/sheet.ts#L15) |
| REQ-40-005 | Chapter 48 > Callouts > Title Blocks | The system shall automatically resolve project fields (Project Name, Phase, Sheet Number) dynamically in Title Blocks. | Trace-to-Spec-v1 | Title block fields compiled in sheet layouts inside [PlatSheetDialog.tsx](../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-40-006 | Chapter 48 > Callouts > Space Boundaries | The system shall support selecting Space elements to define boundary limits when placing interior elevations callouts. | Trace-to-Spec-v1 | Workspace spaces geometries bounds queried in [planproduction.ts](../packages/domain/src/planproduction.ts) |

