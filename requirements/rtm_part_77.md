# Requirements Traceability Matrix - Part 77
**Subject:** AEC Content Settings & Catalog Libraries (Chapter 50, Part 2)
**Coverage:** Library Sorting, Catalog Installation Files, Linked Palettes, Directory Path Configurations, Drag & Drop Block Registries

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-77-001 | Chapter 50 > AEC Content > Library Sorting | The system shall support sorting tool catalogs inside the library explorer alphabetically or by custom groupings. | Trace-to-Spec-v1 | Layer list folder items sorting evaluated in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-77-002 | Chapter 50 > AEC Content > Installation Files | The system shall support loading catalog installation files (.xml) to register third-party symbols catalogs. | Trace-to-Spec-v1 | XML catalogs parsed and registered dynamically in [partbuilder.ts](../packages/domain/src/partbuilder.ts) |
| REQ-77-003 | Chapter 50 > AEC Content > Linked Palettes | The system shall check for updates to linked palettes on drawing load. | Trace-to-Spec-v1 | Not implemented |
| REQ-77-004 | Chapter 50 > AEC Content > Path Configurations | The system shall maintain default system path configurations for standard catalog and symbol library folders. | Trace-to-Spec-v1 | Environment paths structured in App Data directory in [Workspace.tsx](../apps/web/src/features/workspace/Workspace.tsx) |
| REQ-77-005 | Chapter 50 > AEC Content > Drag & Drop | The system shall support dropping block definitions from DesignCenter directly onto drawing layouts. | Trace-to-Spec-v1 | Implemented via file drop listeners in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
