# Requirements Traceability Matrix - Part 94
**Subject:** Drawing Compare Revision Filters (Chapter 9, Part 2)
**Coverage:** Visual Revision Filters, Properties Variations, Revision Styles Saving, Unchanged Elements Toggles, Layer Standards Comparison

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-94-001 | Chapter 9 > Drawing Compare > Visual Filter | The system shall support custom Visual Filters to isolate additions, deletions, or modifications. | Trace-to-Spec-v1 | Element visibility filter switches handled in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-94-002 | Chapter 9 > Drawing Compare > Variations | The system shall flag and display geometry modifications and custom attributes changes between revisions. | Trace-to-Spec-v1 | Geometry changes evaluated dynamically in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-94-003 | Chapter 9 > Drawing Compare > Styles | The system shall support saving compare styles configurations detailing markup colors. | Trace-to-Spec-v1 | Compare styles colors stored in UI state in [uiStore.ts](../apps/web/src/store/uiStore.ts) |
| REQ-94-004 | Chapter 9 > Drawing Compare > Unchanged | The system shall support toggling visibility for unchanged background elements during compare sessions. | Trace-to-Spec-v1 | Component opacity levels managed in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-94-005 | Chapter 9 > Drawing Compare > Layers Standard | The system shall compare layer configurations between drawings to report name changes. | Trace-to-Spec-v1 | Layer definitions check evaluated in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
