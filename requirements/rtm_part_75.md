# Requirements Traceability Matrix - Part 75
**Subject:** Layer Key Styles & Overrides (Chapter 10, Part 2)
**Coverage:** Layer Key Styles, LY File Imports, Suffix/Prefix Key Overrides, New Layer Notification Setup, Reconciling Layers

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-75-001 | Chapter 10 > Layer Keys > Styles | The system shall map drawing categories to target layer standard codes using Layer Key Styles. | Trace-to-Spec-v1 | Style rules template assignments configured centrally in [descriptionKeys.ts](../packages/domain/src/descriptionKeys.ts#L49) |
| REQ-75-002 | Chapter 10 > Layer Keys > LY Import | The system shall support importing custom Layer Keys definitions directly from external LY files. | Trace-to-Spec-v1 | Mapped to JSON preferences loader in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-75-003 | Chapter 10 > Layer Keys > Overrides | The system shall support layer key overrides allowing custom prefixes (e.g. zone codes) to modify standard layers. | Trace-to-Spec-v1 | Prepend layer naming overrides resolved in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L416) |
| REQ-75-004 | Chapter 10 > Layer Keys > Notification | The system shall check layer databases on commands execution (e.g. Plot, Save) to notify users of new layers. | Trace-to-Spec-v1 | Event alerts triggered inside [Workspace.tsx](../apps/web/src/features/workspace/Workspace.tsx) |
| REQ-75-005 | Chapter 10 > Layer Keys > Reconciling | The system shall provide a tool to reconcile new layers, clearing alerts indicators. | Trace-to-Spec-v1 | Layer list status state cleared inside [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
