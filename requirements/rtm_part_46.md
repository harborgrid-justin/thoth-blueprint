# Requirements Traceability Matrix - Part 46
**Subject:** Project Standards (Chapter 8)
**Coverage:** Central Standards File, AEC Standards Check, Synchronization, Version History & Audits, Sync Reports

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-46-001 | Chapter 8 > Project Standards > Standards File | The system shall support linking drawing projects to a central standards template file. | Trace-to-Spec-v1 | Template structures mapped to [sheetsize.ts](../packages/domain/src/sheetsize.ts) |
| REQ-46-002 | Chapter 8 > Project Standards > Standards Audit | The system shall audit drawing layer standards and element styles for consistency against standards. | Trace-to-Spec-v1 | Checked during build compilation and asset lint checks |
| REQ-46-003 | Chapter 8 > Project Standards > Synchronization | The system shall identify out-of-sync local styles and support pulling standard style overrides. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-004 | Chapter 8 > Project Standards > Version History | The system shall keep a version history record of standard styles modifications. | Trace-to-Spec-v1 | Undo and redo history frames managed in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L29) |
| REQ-46-005 | Chapter 8 > Project Standards > Reports | The system shall support exporting drawing validation audits detailing standards violations. | Trace-to-Spec-v1 | Not implemented |
