# Requirements Traceability Matrix - Part 07
**Subject:** Survey Tutorials â€” Setup & Import (Chapter 6, Part 1)
**Coverage:** Survey Database Setup, Equipment, Linework Code Sets, Field Book Import, Figures (Lines 2240â€“2777)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-07-001 | Survey > Database | The system shall support creating and managing survey databases storing survey network components (control points, setups, observations, figures). | Trace-to-Spec-v1 | Not implemented |
| REQ-07-002 | Survey > Equipment Database | The system shall maintain Equipment Databases storing parameters of physical survey instruments (EDM accuracy, prism constants, rod lengths). | Trace-to-Spec-v1 | Not implemented |
| REQ-07-003 | Survey > Figure Prefix Database | The system shall support Figure Prefix Databases that map prefix codes to styles, layers, and breakline properties for automatic figure styling. | Trace-to-Spec-v1 | Not implemented |
| REQ-07-004 | Survey > Settings | The system shall support configuring survey database settings (angle units, distance units, coordinate zone, precision, angle type). | Trace-to-Spec-v1 | Display readouts, precision, bearing angle formats, and coordinates managed in [PreferencesDialog.tsx](../../../apps/web/src/features/preferences/PreferencesDialog.tsx) & [prefsStore.ts](../../../apps/web/src/store/prefsStore.ts) |
| REQ-07-005 | Survey > Survey Styles | The system shall support configuring survey network, figure, marker, and error ellipse display styles. | Trace-to-Spec-v1 | Survey label styles and display preferences are controlled in [prefsStore.ts](../../../apps/web/src/store/prefsStore.ts) |
| REQ-07-006 | Survey > Linework Code Sets | The system shall support creating Linework Code Sets with special codes (Begin, End, Curve, Close, Plus Offset) for automatic figure generation during import. | Trace-to-Spec-v1 | Not implemented |
| REQ-07-007 | Survey > Field Book Import | The system shall import Field Book (.fbk) files containing raw angle and distance measurements to create survey networks and figures. | Trace-to-Spec-v1 | Not implemented |
| REQ-07-008 | Survey > Import Events | The system shall log import events to permit re-importing, modifying, or deleting distinct datasets without affecting other imported data. | Trace-to-Spec-v1 | Reference overlays session imports database managed in [interopStore.ts](../../../apps/web/src/store/interopStore.ts#L35-L52) |
| REQ-07-009 | Survey > Process Linework | The system shall support reprocessing linework after corrections to regenerate figures from corrected survey data. | Trace-to-Spec-v1 | Not implemented |
| REQ-07-010 | Survey > Insert/Remove Figures | The system shall support inserting survey figures into drawings and removing them from drawings independently from the survey database. | Trace-to-Spec-v1 | Not implemented |
| REQ-07-011 | Survey > Figure Editor | The system shall provide a Figures Editor vista for modifying figure properties (style, layer, breakline flag) in a tabular grid. | Trace-to-Spec-v1 | Not implemented |
| REQ-07-012 | Survey > Viewing Data | The system shall support viewing survey points and figures in plan view with configurable zoom and display options. | Trace-to-Spec-v1 | Canvas grid, coordinate/bearing overlays, and zoom/pan actions supported in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx), [TopBar.tsx](../../../apps/web/src/features/workspace/TopBar.tsx#L90-L143) & [canvasStore.ts](../../../apps/web/src/store/canvasStore.ts) |

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


