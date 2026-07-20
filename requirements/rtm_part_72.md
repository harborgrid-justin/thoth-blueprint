# Requirements Traceability Matrix - Part 72
**Subject:** Detail Component & Keynote Database Migration (Chapter 56)
**Coverage:** Database Schema Migration, Keynote Tables, Overwrite Protection, Format Conversions (MDB/JSON), Migration Audits

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-72-001 | Chapter 56 > Database > Schema Migration | The system shall support migrating detail components catalog databases to newer file format schemas. | Trace-to-Spec-v1 | Catalog configurations imported and parsed inside [partbuilder.ts](../packages/domain/src/partbuilder.ts) |
| REQ-72-002 | Chapter 56 > Database > Keynote Tables | The system shall update standard keynote database tables (AEC Keynotes) while preserving custom user codes. | Trace-to-Spec-v1 | Pay items and formulas parsed dynamically in [qto.ts](../packages/domain/src/qto.ts#L80) |
| REQ-72-003 | Chapter 56 > Database > Overwrite Protection | The system shall inspect and check the modified flags column to prevent overwriting user-modified records on upgrade. | Trace-to-Spec-v1 | Local storage configurations check inside [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-72-004 | Chapter 56 > Database > Format Conversion | The system shall support converting legacy MDB (Access) keynote databases into web-compatible JSON databases. | Trace-to-Spec-v1 | Mapped to JSON importer in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-72-005 | Chapter 56 > Database > Migration Audits | The system shall validate migrated record keys to ensure no conflicts exist with default system IDs. | Trace-to-Spec-v1 | Checked during build compilation and lint checks |
