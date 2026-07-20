# Requirements Traceability Matrix - Part 84
**Subject:** Project Navigator Files & Wing Divisions (Chapter 6, Part 3)
**Coverage:** ProjectNavigator Tabs, Level Elevations Math, Division Horizontal Offsets, Sheet Set Database, eTransmit Packages

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-84-001 | Chapter 6 > Drawing Management > Navigator Tabs | The system shall organize project file explorer menus into Project, Constructs, Views, and Sheets tabs. | Trace-to-Spec-v1 | Separated panels tabs structured inside [Workspace.tsx](../apps/web/src/features/workspace/Workspace.tsx) |
| REQ-84-002 | Chapter 6 > Drawing Management > Elevations Math | The system shall compute floor elevations dynamically from stacking level settings. | Trace-to-Spec-v1 | Stacking level heights offsets calculated in [spatial.ts](../packages/domain/src/spatial.ts) |
| REQ-84-003 | Chapter 6 > Drawing Management > Horizontal Offsets | The system shall support wing division offsets to shift plan view drawing contents dynamically. | Trace-to-Spec-v1 | Alignments horizontal offsets translation computed in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-84-004 | Chapter 6 > Drawing Management > Sheet Set DB | The system shall maintain an index xml database of standard sheet layouts (Sheet Set manager). | Trace-to-Spec-v1 | Orderly sheet lists database structures managed in [sheet.ts](../packages/domain/src/sheet.ts#L15) |
| REQ-84-005 | Chapter 6 > Drawing Management > eTransmit | The system shall package drawing projects and their referenced files (xrefs, images) into zip archives (eTransmit). | Trace-to-Spec-v1 | Zip file packaging export options configured in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
