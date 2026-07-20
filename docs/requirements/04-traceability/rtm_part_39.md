# Requirements Traceability Matrix - Part 39
**Subject:** Layer Standards & Viewport Site Property Overrides (Chapter 10)
**Coverage:** Layer Key Styles, Viewport Layer Overrides, Layer States, Layer Group Filters, New Layer Notification

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-39-001 | Chapter 10 > Layers > Layer Key Styles | The system shall map design elements automatically to predefined layers matching layer standards codes. | Trace-to-Spec-v1 | Layer assignments resolved using Description Keys in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts#L416) |
| REQ-39-002 | Chapter 10 > Layers > Viewport Overrides | The system shall support overriding layer properties (color, visibility) in layout paper-space viewports. | Trace-to-Spec-v1 | Mapped to viewport visibility properties in [canvasStore.ts](../../../apps/web/src/store/canvasStore.ts) |
| REQ-39-003 | Chapter 10 > Layers > Layer States | The system shall support saving, editing, and restoring drawing Layer States (on/off, frozen/thawed, locked). | Trace-to-Spec-v1 | Layer toggles and state states saved in workspace store in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts#L140) |
| REQ-39-004 | Chapter 10 > Layers > Notification | The system shall notify the user when new layers are added to referenced external drawings (xrefs). | Trace-to-Spec-v1 | Handled via toast alerts on import events in [ImportExportMenu.tsx](../../../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-39-005 | Chapter 10 > Layers > Group Filters | The system shall support filtering drawing layers into custom group folders using wildcard pattern naming rules. | Trace-to-Spec-v1 | Layer list filtering evaluated dynamically inside [LayerPanel.tsx](../../../apps/web/src/features/workspace/LayerPanel.tsx) |

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


