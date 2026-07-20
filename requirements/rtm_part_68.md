# Requirements Traceability Matrix - Part 68
**Subject:** Annotation and Keynoting Tools (Chapter 47)
**Coverage:** Keynote Database Integration, Associative Keynote Tags, Keynote Legends, Sheet Linkage, Specific Filters

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-68-001 | Chapter 47 > Keynotes > Database | The system shall support loading and parsing keynote databases detailing item codes and descriptions. | Trace-to-Spec-v1 | Pay items parser logic implemented in [qto.ts](../packages/domain/src/qto.ts#L80) |
| REQ-68-002 | Chapter 47 > Keynotes > Tags | The system shall support placing associative keynote tags linked to specific element categories. | Trace-to-Spec-v1 | Category styles metadata mapped in [elementMeta.ts](../apps/web/src/lib/elementMeta.ts) |
| REQ-68-003 | Chapter 47 > Keynotes > Legends | The system shall compile a Keynote Legend table summarizing all notes placed in the current layout. | Trace-to-Spec-v1 | Quantity takeout list summarized in cost schedules inside [QtoPanel.tsx](../apps/web/src/features/workspace/QtoPanel.tsx) |
| REQ-68-004 | Chapter 47 > Keynotes > Sheets | The system shall link keynote references to sheet indexing databases. | Trace-to-Spec-v1 | Cost item quantities compiled across sheet layouts inside [QtoPanel.tsx](../apps/web/src/features/workspace/QtoPanel.tsx) |
| REQ-68-005 | Chapter 47 > Keynotes > Filtering | The system shall filter legends and takeoffs to display only components present on the active sheet layout. | Trace-to-Spec-v1 | Mapped to sheet-specific cost takeoffs inside [QtoPanel.tsx](../apps/web/src/features/workspace/QtoPanel.tsx) |
