# Requirements Traceability Matrix - Part 35
**Subject:** AEC Dimensions & Plat Survey Measurements (Chapter 43)
**Coverage:** Dimension Styles, Associative Boundary Offsets, Bearing Angles DMS Formatting, Survey Segment Lengths, Dimension Layouts, Snap Points Dimensioning, Chains Stacking, Dual Units, Slope Annotations, Extension Line Suppression, Text Alignments, Baseline Spacing, Spot Coordinates, Arrow Styles, Dynamic Suffixes, Curve Lengths

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-35-001 | Chapter 43 > AEC Dimensions > Styles | The system shall support AEC Dimension Styles setting text height, units display, and prefix symbols. | Trace-to-Spec-v1 | Dimensions styling variables defined in [labeling.ts](../../../packages/domain/src/labeling.ts#L12) |
| REQ-35-002 | Chapter 43 > AEC Dimensions > Associative | The system shall update AEC Dimensions automatically when referenced site boundary vertex points move. | Trace-to-Spec-v1 | Dynamic dimensions updates resolved on canvas draw in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx#L380) |
| REQ-35-003 | Chapter 43 > AEC Dimensions > DMS | The system shall support formatting bearing angles in Degrees-Minutes-Seconds (DMS) (e.g. N 45Â° 30' 15" E). | Trace-to-Spec-v1 | DMS angle format functions implemented in [geometry.ts](../../../packages/domain/src/geometry.ts#L45) |
| REQ-35-004 | Chapter 43 > AEC Dimensions > Segments | The system shall calculate plan boundary segment lengths and horizontal offsets dynamically. | Trace-to-Spec-v1 | Length and offset calculations computed in [geometry.ts](../../../packages/domain/src/geometry.ts) |
| REQ-35-005 | Chapter 43 > AEC Dimensions > Layouts | The system shall render dimension styles correctly on paper-space sheet viewports and final prints. | Trace-to-Spec-v1 | Dimensions rendering layout resolved inside [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-35-006 | Chapter 43 > AEC Dimensions > Snap Points | The system shall support dimensioning specific geometry nodes including line endpoints, arc midpoints, circle centers, and quadrants. | Trace-to-Spec-v1 | Intersection points snapping and projections calculated in [geometry.ts](../../../packages/domain/src/geometry.ts) |
| REQ-35-007 | Chapter 43 > AEC Dimensions > Chains Stacking | The system shall support stacking multi-level dimension chains automatically at set offset distances. | Trace-to-Spec-v1 | Not implemented |
| REQ-35-008 | Chapter 43 > AEC Dimensions > Dual Units | The system shall support concurrent dual-unit displays (e.g., metric values in brackets adjacent to imperial values). | Trace-to-Spec-v1 | Not implemented |
| REQ-35-009 | Chapter 43 > AEC Dimensions > Slope Annotations | The system shall support calculating and displaying slope ratios or grades (e.g., 2% or 4:1) along measured segments. | Trace-to-Spec-v1 | Not implemented |
| REQ-35-010 | Chapter 43 > AEC Dimensions > Line Suppression | The system shall support suppressing display of extension lines to prevent overlay clutter. | Trace-to-Spec-v1 | Not implemented |
| REQ-35-011 | Chapter 43 > AEC Dimensions > Text Alignments | The system shall support aligning annotation text horizontal, parallel, or perpendicular to measured segments. | Trace-to-Spec-v1 | Not implemented |
| REQ-35-012 | Chapter 43 > AEC Dimensions > Baseline Spacing | The system shall validate baseline spacing gaps to maintain uniform layout appearance. | Trace-to-Spec-v1 | Not implemented |
| REQ-35-013 | Chapter 43 > AEC Dimensions > Spot Coordinates | The system shall support placing spot coordinates markers detailing Northing and Easting values. | Trace-to-Spec-v1 | Not implemented |
| REQ-35-014 | Chapter 43 > AEC Dimensions > Arrow Styles | The system shall support arrowhead display overrides including structural ticks, dots, and architectural fills. | Trace-to-Spec-v1 | Not implemented |
| REQ-35-015 | Chapter 43 > AEC Dimensions > Dynamic Suffixes | The system shall support dynamic annotation suffixes template parameters (e.g., O.C., Typ.). | Trace-to-Spec-v1 | Not implemented |
| REQ-35-016 | Chapter 43 > AEC Dimensions > Curve Lengths | The system shall calculate and label arc path lengths along curved boundaries automatically. | Trace-to-Spec-v1 | Not implemented |


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


