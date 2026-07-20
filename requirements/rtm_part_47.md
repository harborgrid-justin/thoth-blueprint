# Requirements Traceability Matrix - Part 47
**Subject:** Drawing Compare (Chapter 9)
**Coverage:** Revision Comparisons, Color-coded Markups, Changes Review List, Visual Difference Filters, Markup Exports

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-47-001 | Chapter 9 > Drawing Compare > Comparison | The system shall compare two drawings to identify geometric and attribute differences. | Trace-to-Spec-v1 | Element list comparison checks resolved in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-47-002 | Chapter 9 > Drawing Compare > Colors | The system shall render revision markups using color-coding (e.g. green for additions, red for deletions). | Trace-to-Spec-v1 | Mapped to customized colors in [elementMeta.ts](../apps/web/src/lib/elementMeta.ts) |
| REQ-47-003 | Chapter 9 > Drawing Compare > Changes List | The system shall display a list of all detected drawing changes for step-by-step review. | Trace-to-Spec-v1 | Sidebar change inspectors parsed inside [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
| REQ-47-004 | Chapter 9 > Drawing Compare > Filters | The system shall support visual filters to show only additions, deletions, or modified objects. | Trace-to-Spec-v1 | Element visibility filter switches handled in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-47-005 | Chapter 9 > Drawing Compare > Export | The system shall support exporting compared drawing markups as a composite reference drawing. | Trace-to-Spec-v1 | Mapped to [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) export options |
