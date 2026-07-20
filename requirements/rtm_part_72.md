# Requirements Traceability Matrix - Part 72
**Subject:** Detail Component & Keynote Database Migration (Chapter 56)
**Coverage:** Database Schema Migration, Keynote Tables, Overwrite Protection, Format Conversions (MDB/JSON), Migration Audits, Component Selector UI, Label Prefixes, Sizes Lookup Validation, Material Lengths QTO, Hatch Scale Sync, Template Sync, Insertion Anchors, Database Query Indexing, Broken Reference Alerts, PDF Vector Exports, Catalog Paths Config, Custom Component Creator, Schema Health Validators, Group Attachments, Lineweight Plot Overrides

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-72-001 | Chapter 56 > Database > Schema Migration | The system shall support migrating detail components catalog databases to newer file format schemas. | Trace-to-Spec-v1 | Catalog configurations imported and parsed inside [partbuilder.ts](../packages/domain/src/partbuilder.ts) |
| REQ-72-002 | Chapter 56 > Database > Keynote Tables | The system shall update standard keynote database tables (AEC Keynotes) while preserving custom user codes. | Trace-to-Spec-v1 | Pay items and formulas parsed dynamically in [qto.ts](../packages/domain/src/qto.ts#L80) |
| REQ-72-003 | Chapter 56 > Database > Overwrite Protection | The system shall inspect and check the modified flags column to prevent overwriting user-modified records on upgrade. | Trace-to-Spec-v1 | Local storage configurations check inside [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-72-004 | Chapter 56 > Database > Format Conversion | The system shall support converting legacy MDB (Access) keynote databases into web-compatible JSON databases. | Trace-to-Spec-v1 | Mapped to JSON importer in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-72-005 | Chapter 56 > Database > Migration Audits | The system shall validate migrated record keys to ensure no conflicts exist with default system IDs. | Trace-to-Spec-v1 | Checked during build compilation and lint checks |
| REQ-72-006 | Chapter 56 > Database > Component Selector UI | The system shall provide an interactive side panel selector tree menu to browse component databases catalogs. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-007 | Chapter 56 > Database > Label Prefixes | The system shall support customizable prefix variables codes for automatically generating keynote tags labels. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-008 | Chapter 56 > Database > Sizes Lookup Validation | The system shall validate placed components dimensions dimensions directly against database lookup standards values. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-009 | Chapter 56 > Database > Material Lengths QTO | The system shall calculate composite material lengths and perimeter metrics for selected details. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-010 | Chapter 56 > Database > Hatch Scale Sync | The system shall automatically scale detail hatch spacing based on sheet viewport configurations. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-011 | Chapter 56 > Database > Template Sync | The system shall support synchronizing drawing component libraries from central corporate template folders. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-012 | Chapter 56 > Database > Insertion Anchors | The system shall support snapping detail components coordinates to target alignment lines. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-013 | Chapter 56 > Database > Database Query Indexing | The system shall maintain search query keyword indexes to accelerate database search operations. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-014 | Chapter 56 > Database > Broken Reference Alerts | The system shall trigger validation warning indicators on details containing missing database links. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-015 | Chapter 56 > Database > PDF Vector Exports | The system shall support exporting drawings with complex components to high-fidelity vector PDF files. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-016 | Chapter 56 > Database > Catalog Paths Config | The system shall support configuring network shared directories paths for detailing component libraries databases. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-017 | Chapter 56 > Database > Custom Component Creator | The system shall support tools to convert drawing 2D polylines into reusable detailing profiles components. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-018 | Chapter 56 > Database > Schema Health Validators | The system shall execute schema health validation audits on catalog databases on drawing startup. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-019 | Chapter 56 > Database > Group Attachments | The system shall support locking structural detail components as combined grouping arrays. | Trace-to-Spec-v1 | Not implemented |
| REQ-72-020 | Chapter 56 > Database > Lineweight Plot Overrides | The system shall support color-to-lineweight overrides mapping for component details. | Trace-to-Spec-v1 | Not implemented |

