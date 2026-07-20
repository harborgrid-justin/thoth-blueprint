# Requirements Traceability Matrix - Part 85
**Subject:** Schedule Tables Sorting & Columns (Chapter 49, Part 2)
**Coverage:** Column Headers, Alphanumeric Sorting, Property Set Columns, Classification Filters, CSV Export

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-85-001 | Chapter 49 > Schedules > Columns Headers | The system shall display custom column headers inside QTO and material schedule tables. | Trace-to-Spec-v1 | Structured tables headers rendered in [QtoPanel.tsx](../apps/web/src/features/workspace/QtoPanel.tsx) |
| REQ-85-002 | Chapter 49 > Schedules > Alphanumeric Sort | The system shall sort schedule tables rows alphabetically or numerically by any column header. | Trace-to-Spec-v1 | Sorted rows listings evaluated inside list renderers in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-85-003 | Chapter 49 > Schedules > Property Set Columns | The system shall support property set columns dynamically displaying element dimensions (areas, lengths). | Trace-to-Spec-v1 | Cost item quantities calculated dynamically in [qto.ts](../packages/domain/src/qto.ts#L42) |
| REQ-85-004 | Chapter 49 > Schedules > Classification Filters | The system shall support classification filters to only include specific element types in a table. | Trace-to-Spec-v1 | Style filters query rules checked inside [descriptionKeys.ts](../packages/domain/src/descriptionKeys.ts#L43) |
| REQ-85-005 | Chapter 49 > Schedules > CSV Export | The system shall support downloading schedule tables as CSV files. | Trace-to-Spec-v1 | CSV download helpers configured in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
