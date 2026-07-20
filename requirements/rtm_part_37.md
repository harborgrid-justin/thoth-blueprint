# Requirements Traceability Matrix - Part 37
**Subject:** Schedules, Point Lists, and Material Cost Estimates (Chapter 49)
**Coverage:** Schedule Table Styles, Property Columns, Alphanumeric Sorting, Classification Filtering, Data Export (CSV, XML), Tag Insertion Option, Tag Attribute Format

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-37-001 | Chapter 49 > Schedules > Style | The system shall support Schedule Table Styles detailing header names, grid lines, and cell margins. | Trace-to-Spec-v1 | Structured tables rendered in [QtoPanel.tsx](../apps/web/src/features/workspace/QtoPanel.tsx) |
| REQ-37-002 | Chapter 49 > Schedules > Columns | The system shall support customizable columns including Point Number, Easting, Northing, Elevation, and Description. | Trace-to-Spec-v1 | Cost item tables and quantity sheets parsed in [qto.ts](../packages/domain/src/qto.ts#L42) |
| REQ-37-003 | Chapter 49 > Schedules > Sorting | The system shall support sorting table rows alphabetically or numerically by any selected column. | Trace-to-Spec-v1 | Sorted dynamically inside list rendering components in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-37-004 | Chapter 49 > Schedules > Filtering | The system shall support filtering elements included in schedule tables by layer, style classification, or raw description. | Trace-to-Spec-v1 | Point groups query evaluations resolved in [descriptionKeys.ts](../packages/domain/src/descriptionKeys.ts#L43) |
| REQ-37-005 | Chapter 49 > Schedules > Export | The system shall support exporting schedule table records to external formats (CSV or XML). | Trace-to-Spec-v1 | Mapped to [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) data exports |
| REQ-37-006 | Chapter 49 > Schedules > Tag Dialog Switch | The system shall support an option to toggle (Display Edit Property Data Dialog During Tag Insertion) to speed up automatic property tag additions. | Trace-to-Spec-v1 | User options toggle settings tracked in workspace state in [uiStore.ts](../apps/web/src/store/uiStore.ts) |
| REQ-37-007 | Chapter 49 > Schedules > Attribute Formatting | The system shall format schedule tag attributes automatically by combining the property set definition and property definition name keys. | Trace-to-Spec-v1 | Naming schemas and keys parsed dynamically inside [qto.ts](../packages/domain/src/qto.ts#L80) |

