# Requirements Traceability Matrix - Part 36
**Subject:** Elevation Labels & Spot Topography Markers (Chapter 44)
**Coverage:** Elevation Label Styles, Leader Line Configurations, Dynamic Terrain Spot Elevation, Prefix/Suffix Values, Label Compile Resolution, Coordinate System Shift

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-36-001 | Chapter 44 > Elevation Labels > Styles | The system shall support customizable Elevation Label Styles for drawing and displaying elevations. | Trace-to-Spec-v1 | Style definition inheritance modeled in [labeling.ts](../packages/domain/src/labeling.ts#L10) |
| REQ-36-002 | Chapter 44 > Elevation Labels > Leaders | The system shall support leader lines connecting the label text to the point benchmark coordinate. | Trace-to-Spec-v1 | Renders leaders and arrow pointers in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-36-003 | Chapter 44 > Elevation Labels > Dynamic | The system shall automatically update elevation label text to match the underlying digital terrain elevation. | Trace-to-Spec-v1 | Solved via `elevationAt` interpolation in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L820) |
| REQ-36-004 | Chapter 44 > Elevation Labels > Prefix/Suffix | The system shall support custom prefix and suffix values (e.g., "FG " for Finished Grade, "EG " for Existing Ground). | Trace-to-Spec-v1 | Formatted using template compile engine in [labeling.ts](../packages/domain/src/labeling.ts#L30) |
| REQ-36-005 | Chapter 44 > Elevation Labels > Mapping | The system shall assign elevation labels to the target survey or design layers automatically based on styles. | Trace-to-Spec-v1 | Evaluated via matching rules in [descriptionKeys.ts](../packages/domain/src/descriptionKeys.ts#L22) |
| REQ-36-006 | Chapter 44 > Elevation Labels > Coordinate Shift | The system shall automatically recalculate the displayed label value when the active coordinate system (WCS vs UCS) origin changes. | Trace-to-Spec-v1 | Coordinates tracking and UCS offsets computed dynamically in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L816) |

