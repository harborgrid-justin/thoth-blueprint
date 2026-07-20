# Requirements Traceability Matrix - Part 35
**Subject:** AEC Dimensions & Plat Survey Measurements (Chapter 43)
**Coverage:** Dimension Styles, Associative Boundary Offsets, Bearing Angles DMS Formatting, Survey Segment Lengths, Dimension Layouts, Snap Points Dimensioning

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-35-001 | Chapter 43 > AEC Dimensions > Styles | The system shall support AEC Dimension Styles setting text height, units display, and prefix symbols. | Trace-to-Spec-v1 | Dimensions styling variables defined in [labeling.ts](../packages/domain/src/labeling.ts#L12) |
| REQ-35-002 | Chapter 43 > AEC Dimensions > Associative | The system shall update AEC Dimensions automatically when referenced site boundary vertex points move. | Trace-to-Spec-v1 | Dynamic dimensions updates resolved on canvas draw in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L380) |
| REQ-35-003 | Chapter 43 > AEC Dimensions > DMS | The system shall support formatting bearing angles in Degrees-Minutes-Seconds (DMS) (e.g. N 45° 30' 15" E). | Trace-to-Spec-v1 | DMS angle format functions implemented in [geometry.ts](../packages/domain/src/geometry.ts#L45) |
| REQ-35-004 | Chapter 43 > AEC Dimensions > Segments | The system shall calculate plan boundary segment lengths and horizontal offsets dynamically. | Trace-to-Spec-v1 | Length and offset calculations computed in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-35-005 | Chapter 43 > AEC Dimensions > Layouts | The system shall render dimension styles correctly on paper-space sheet viewports and final prints. | Trace-to-Spec-v1 | Dimensions rendering layout resolved inside [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-35-006 | Chapter 43 > AEC Dimensions > Snap Points | The system shall support dimensioning specific geometry nodes including line endpoints, arc midpoints, circle centers, and quadrants. | Trace-to-Spec-v1 | Intersection points snapping and projections calculated in [geometry.ts](../packages/domain/src/geometry.ts) |
