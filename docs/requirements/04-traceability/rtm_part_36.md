# Requirements Traceability Matrix - Part 36
**Subject:** Elevation Labels & Spot Topography Markers (Chapter 44)
**Coverage:** Elevation Label Styles, Leader Line Configurations, Dynamic Terrain Spot Elevation, Prefix/Suffix Values, Label Compile Resolution, Coordinate System Shift, Symbol Styles, Custom Prefixes, Out-of-Sync Warnings, Rounding Precision, Slope Alignments, Leader Lands, Baseline Overrides, Viewport Scaling, Tabular Exports

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-36-001 | Chapter 44 > Elevation Labels > Styles | The system shall support customizable Elevation Label Styles for drawing and displaying elevations. | Trace-to-Spec-v1 | Style definition inheritance modeled in [labeling.ts](../../../packages/domain/src/labeling.ts#L10) |
| REQ-36-002 | Chapter 44 > Elevation Labels > Leaders | The system shall support leader lines connecting the label text to the point benchmark coordinate. | Trace-to-Spec-v1 | Renders leaders and arrow pointers in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-36-003 | Chapter 44 > Elevation Labels > Dynamic | The system shall automatically update elevation label text to match the underlying digital terrain elevation. | Trace-to-Spec-v1 | Solved via `elevationAt` interpolation in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx#L820) |
| REQ-36-004 | Chapter 44 > Elevation Labels > Prefix/Suffix | The system shall support custom prefix and suffix values (e.g., "FG " for Finished Grade, "EG " for Existing Ground). | Trace-to-Spec-v1 | Formatted using template compile engine in [labeling.ts](../../../packages/domain/src/labeling.ts#L30) |
| REQ-36-005 | Chapter 44 > Elevation Labels > Mapping | The system shall assign elevation labels to the target survey or design layers automatically based on styles. | Trace-to-Spec-v1 | Evaluated via matching rules in [descriptionKeys.ts](../../../packages/domain/src/descriptionKeys.ts#L22) |
| REQ-36-006 | Chapter 44 > Elevation Labels > Coordinate Shift | The system shall automatically recalculate the displayed label value when the active coordinate system (WCS vs UCS) origin changes. | Trace-to-Spec-v1 | Coordinates tracking and UCS offsets computed dynamically in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx#L816) |
| REQ-36-007 | Chapter 44 > Elevation Labels > Symbol Styles | The system shall support customizable label symbol graphics including target crosses, elevation triangles, and bordered text boxes. | Trace-to-Spec-v1 | Not implemented |
| REQ-36-008 | Chapter 44 > Elevation Labels > Custom Prefixes | The system shall support dynamic prefix formatting templates (e.g., EL. or F.F.L.). | Trace-to-Spec-v1 | Not implemented |
| REQ-36-009 | Chapter 44 > Elevation Labels > Out-of-Sync Warnings | The system shall trigger validation warning highlights on labels when their reference surfaces are deleted or offset. | Trace-to-Spec-v1 | Not implemented |
| REQ-36-010 | Chapter 44 > Elevation Labels > Rounding Precision | The system shall support rounding displayed elevation values to custom precision thresholds (e.g., nearest 0.05 units). | Trace-to-Spec-v1 | Not implemented |
| REQ-36-011 | Chapter 44 > Elevation Labels > Slope Alignments | The system shall automatically align spot elevation labels to the slope pitch of referenced planes (e.g., roof slopes). | Trace-to-Spec-v1 | Not implemented |
| REQ-36-012 | Chapter 44 > Elevation Labels > Leader Lands | The system shall support leader lines with customizable landing lengths and knee offsets. | Trace-to-Spec-v1 | Not implemented |
| REQ-36-013 | Chapter 44 > Elevation Labels > Baseline Overrides | The system shall support applying a vertical offset datum (e.g., sea level datum shift) to raw coordinate elevations. | Trace-to-Spec-v1 | Not implemented |
| REQ-36-014 | Chapter 44 > Elevation Labels > Viewport Scaling | The system shall scale label text sizes dynamically based on active paper-space viewport plot scales. | Trace-to-Spec-v1 | Not implemented |
| REQ-36-015 | Chapter 44 > Elevation Labels > Tabular Exports | The system shall support logging and exporting all drawing spot elevations to tabular CSV files. | Trace-to-Spec-v1 | Not implemented |



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


