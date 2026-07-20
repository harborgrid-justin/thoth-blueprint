# Requirements Traceability Matrix - Part 93
**Subject:** Reference AEC Objects (Chapter 54)
**Coverage:** Reference Objects Xrefs, External Link Updates, Sub-component Queries, Viewport Layer Overrides, Repathing References

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-93-001 | Chapter 54 > Reference > Xrefs | The system shall support linking external drawing files as background reference overlays (xrefs). | Trace-to-Spec-v1 | Overlay underlay images and mesh loaders compiled in [ImportExportMenu.tsx](../../../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-93-002 | Chapter 54 > Reference > Link Updates | The system shall notify the user when a linked external reference file has been modified. | Trace-to-Spec-v1 | Handled via toast alerts on import updates in [Workspace.tsx](../../../apps/web/src/features/workspace/Workspace.tsx) |
| REQ-93-003 | Chapter 54 > Reference > Sub-components | The system shall support querying elevations and layers details of objects nested inside xref overlays. | Trace-to-Spec-v1 | Cursor snapped elevation tracking from grids active in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx#L820) |
| REQ-93-004 | Chapter 54 > Reference > Layer Overrides | The system shall support overriding visibility and color properties of xref drawing layers in viewports. | Trace-to-Spec-v1 | Layer-level overrides evaluated dynamically inside [LayerPanel.tsx](../../../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-93-005 | Chapter 54 > Reference > Repathing | The system shall support automatically repathing relative and absolute paths for broken external links. | Trace-to-Spec-v1 | Project navigator folder pathing resolved inside [Workspace.tsx](../../../apps/web/src/features/workspace/Workspace.tsx) |

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


