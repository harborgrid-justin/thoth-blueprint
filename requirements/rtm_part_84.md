# Requirements Traceability Matrix - Part 84
**Subject:** Project Navigator Files & Wing Divisions (Chapter 6, Part 3)
**Coverage:** ProjectNavigator Tabs, Level Elevations Math, Division Horizontal Offsets, Sheet Set Database, eTransmit Packages, Template Sync, Numbering Sequence, Index Generator, Fields Update, Archives Zip, Categories Checklist, Sheet Indexes, Folder Paths, Field Overrides, Plot Indicators, Publish Sets, Boundary Verification, Backup Log, XML Validation, Drag-and-Drop Sequencing

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-84-001 | Chapter 6 > Drawing Management > Navigator Tabs | The system shall organize project file explorer menus into Project, Constructs, Views, and Sheets tabs. | Trace-to-Spec-v1 | Separated panels tabs structured inside [Workspace.tsx](../apps/web/src/features/workspace/Workspace.tsx) |
| REQ-84-002 | Chapter 6 > Drawing Management > Elevations Math | The system shall compute floor elevations dynamically from stacking level settings. | Trace-to-Spec-v1 | Stacking level heights offsets calculated in [spatial.ts](../packages/domain/src/spatial.ts) |
| REQ-84-003 | Chapter 6 > Drawing Management > Horizontal Offsets | The system shall support wing division offsets to shift plan view drawing contents dynamically. | Trace-to-Spec-v1 | Alignments horizontal offsets translation computed in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-84-004 | Chapter 6 > Drawing Management > Sheet Set DB | The system shall maintain an index xml database of standard sheet layouts (Sheet Set manager). | Trace-to-Spec-v1 | Orderly sheet lists database structures managed in [sheet.ts](../packages/domain/src/sheet.ts#L15) |
| REQ-84-005 | Chapter 6 > Drawing Management > eTransmit | The system shall package drawing projects and their referenced files (xrefs, images) into zip archives (eTransmit). | Trace-to-Spec-v1 | Zip file packaging export options configured in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-84-006 | Chapter 6 > Drawing Management > Template Sync | The system shall support synchronizing drawing sheet sets with central XML project templates. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-007 | Chapter 6 > Drawing Management > Numbering Sequence | The system shall support automated sheets numbering sequence updates when layouts are added. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-008 | Chapter 6 > Drawing Management > Index Generator | The system shall automatically compile drawing sheet sets lists into project sheet index pages. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-009 | Chapter 6 > Drawing Management > Fields Update | The system shall support global synchronization of custom metadata fields across all sheets layouts. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-010 | Chapter 6 > Drawing Management > Archives Zip | The system shall support packaging sheet sets into zipped archive files for sharing. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-011 | Chapter 6 > Drawing Management > Categories Checklist | The system shall maintain metadata categories checklists to standardize sheet properties. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-012 | Chapter 6 > Drawing Management > Sheet Indexes | The system shall support database search indexing to quickly look up sheets by sheet name. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-013 | Chapter 6 > Drawing Management > Folder Paths | The system shall support configuring network shared directories paths for project databases. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-014 | Chapter 6 > Drawing Management > Field Overrides | The system shall support manual text overrides on sheet layouts title block fields. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-015 | Chapter 6 > Drawing Management > Plot Indicators | The system shall support plotting status warning indicators showing modified, unplotted drawing sheets. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-016 | Chapter 6 > Drawing Management > Publish Sets | The system shall support creating customizable print subsets configurations profiles for batch publishing. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-017 | Chapter 6 > Drawing Management > Boundary Verification | The system shall validate that viewport configurations match sheet paper margins bounds. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-018 | Chapter 6 > Drawing Management > Backup Log | The system shall support automated log files backups during project standard updates. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-019 | Chapter 6 > Drawing Management > XML Validation | The system shall support validating sheet sets XML database files schemas on project startup. | Trace-to-Spec-v1 | Not implemented |
| REQ-84-020 | Chapter 6 > Drawing Management > Drag-and-Drop Sequencing | The system shall support interactive drag-and-drop sequencing in the Sheet Set Manager explorer tab. | Trace-to-Spec-v1 | Not implemented |

