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
| REQ-37-008 | Chapter 49 > Schedules > Header Styles | The system shall support Schedule Table Styles detailing header fonts, text alignments, and border styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-009 | Chapter 49 > Schedules > Column Formulas | The system shall support evaluating custom algebraic formulas to calculate column values (e.g. Area * Cost). | Trace-to-Spec-v1 | Not implemented |
| REQ-37-010 | Chapter 49 > Schedules > Classifications | The system shall support filtering elements in a schedule table based on hierarchical classification definitions. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-011 | Chapter 49 > Schedules > Multi-Column Sort | The system shall support sorting table rows based on multiple column sorting keys. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-012 | Chapter 49 > Schedules > Excel Export | The system shall support exporting structured schedules directly to Microsoft Excel XML formats. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-013 | Chapter 49 > Schedules > Reactive Updates | The system shall automatically update schedule values in real time when referenced plan elements geometry updates. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-014 | Chapter 49 > Schedules > Title Block Sync | The system shall support linking sheet title block properties to project database fields automatically. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-015 | Chapter 49 > Schedules > Text Wrapping | The system shall support automatic row height wrapping calculations for multi-line schedule cells. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-016 | Chapter 49 > Schedules > Value Validation | The system shall audit schedule tables and highlight elements with missing property sets. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-017 | Chapter 49 > Schedules > Subtotals | The system shall support dynamic subtotal rows calculating values grouped by element type or layer. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-018 | Chapter 49 > Schedules > Style Templates | The system shall support importing standard schedule formats templates from external style libraries. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-019 | Chapter 49 > Schedules > Definition Verification | The system shall validate that target property sets exist in the drawing before rendering schedule tables. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-020 | Chapter 49 > Schedules > Plan Highlighting | The system shall highlight the corresponding graphic element in the active canvas viewport when a schedule table row is selected. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-021 | Chapter 49 > Schedules > Auto Layering | The system shall automatically allocate newly generated schedule tables onto standard drawing layers based on style settings. | Trace-to-Spec-v1 | Not implemented |
| REQ-37-022 | Chapter 49 > Schedules > CSV Format | The system shall support exporting table fields in comma-separated values (CSV) formats with customizable delimiters. | Trace-to-Spec-v1 | Not implemented |


