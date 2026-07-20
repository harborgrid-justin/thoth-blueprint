# Requirements Traceability Matrix - Part 67
**Subject:** Fields (Chapter 45)
**Coverage:** Dynamic Metadata Fields, Block Property Links, Format Rules, Sheet Set Variables, Automatic Refresh

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-67-001 | Chapter 45 > Fields > Dynamic Fields | The system shall support dynamic fields inside text labels that lookup property metadata values. | Trace-to-Spec-v1 | Template placeholder strings resolved in [labeling.ts](../packages/domain/src/labeling.ts#L30) |
| REQ-67-002 | Chapter 45 > Fields > Block Links | The system shall support linking label fields directly to object attributes (e.g. area of a parcel, coordinates of a point). | Trace-to-Spec-v1 | Area and coordinates variables evaluated dynamically in label compilers in [labeling.ts](../packages/domain/src/labeling.ts) |
| REQ-67-003 | Chapter 45 > Fields > Formats | The system shall support custom string formatting configurations (e.g. decimal precision, area unit suffixes). | Trace-to-Spec-v1 | Unit suffix rules mapped in [geometry.ts](../packages/domain/src/geometry.ts#L20) |
| REQ-67-004 | Chapter 45 > Fields > Sheet Set Variables | The system shall support sheet set fields displaying Sheet Number, Project Title, and Scale in title blocks. | Trace-to-Spec-v1 | Mapped to sheet metadata in [PlatSheetDialog.tsx](../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-67-005 | Chapter 45 > Fields > Refresh | The system shall update text field values automatically on drawing save, rebuild, or layout plotting events. | Trace-to-Spec-v1 | Updated reactively inside state listeners in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
