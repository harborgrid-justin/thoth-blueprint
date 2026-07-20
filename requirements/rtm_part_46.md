# Requirements Traceability Matrix - Part 46
**Subject:** Project Standards (Chapter 8)
**Coverage:** Central Standards File, AEC Standards Check, Synchronization, Version History & Audits, Sync Reports, Style Locking, Layer Naming Audits, Layout Size Verification, Event Logging, Manager Toasts, Override Reasons, Batch Processing, Startup Validation

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-46-001 | Chapter 8 > Project Standards > Standards File | The system shall support linking drawing projects to a central standards template file. | Trace-to-Spec-v1 | Template structures mapped to [sheetsize.ts](../packages/domain/src/sheetsize.ts) |
| REQ-46-002 | Chapter 8 > Project Standards > Standards Audit | The system shall audit drawing layer standards and element styles for consistency against standards. | Trace-to-Spec-v1 | Checked during build compilation and asset lint checks |
| REQ-46-003 | Chapter 8 > Project Standards > Synchronization | The system shall identify out-of-sync local styles and support pulling standard style overrides. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-004 | Chapter 8 > Project Standards > Version History | The system shall keep a version history record of standard styles modifications. | Trace-to-Spec-v1 | Undo and redo history frames managed in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L29) |
| REQ-46-005 | Chapter 8 > Project Standards > Reports | The system shall support exporting drawing validation audits detailing standards violations. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-006 | Chapter 8 > Project Standards > Style Locking | The system shall support locking style definitions locally to prevent modifications if they deviate from the standards file. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-007 | Chapter 8 > Project Standards > Background Check | The system shall run a background audit checking local styles modifications against central master records. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-008 | Chapter 8 > Project Standards > NCS Layers | The system shall audit drawing layer names and flag entities built on layers violating National CAD Standard (NCS) rules. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-009 | Chapter 8 > Project Standards > Border Check | The system shall validate layout borders configurations sizes automatically against project standard sizes templates. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-010 | Chapter 8 > Project Standards > Event Logging | The system shall keep a persistent log of style override events in standard formats. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-011 | Chapter 8 > Project Standards > Manager Alerts | The system shall trigger visual warnings notifications to project editors when standard master drawing files are modified. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-012 | Chapter 8 > Project Standards > Bypass Reasons | The system shall enforce inputting justification reason text codes when users bypass standards warning alerts. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-013 | Chapter 8 > Project Standards > Batch Audit | The system shall support batch auditing multiple drawing project folder directories simultaneously. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-014 | Chapter 8 > Project Standards > HTML Export | The system shall support exporting drawings standards validation audits in standard HTML formats. | Trace-to-Spec-v1 | Not implemented |
| REQ-46-015 | Chapter 8 > Project Standards > Startup Validation | The system shall execute standard templates audits checklist automatically on drawing project loads. | Trace-to-Spec-v1 | Not implemented |

