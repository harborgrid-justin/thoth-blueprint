# Requirements Traceability Matrix - Part 81
**Subject:** Space Associative Boundaries & Setbacks (Chapter 39, Part 3)
**Coverage:** Boundary Verification, Manual/Automatic Update Switches, Nested Voids Deductions, Deactivating Associativity, Property Set Formulas, Merging Spaces, Manual Space Divisions

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-81-001 | Chapter 39 > Spaces > Boundary Check | The system shall verify that enclosing boundary objects have 'Bound Spaces' set to Yes before generating associative spaces. | Trace-to-Spec-v1 | Evaluated via intersection algorithms in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-81-002 | Chapter 39 > Spaces > Updates Switch | The system shall support toggling between Automatic and Manual updates for associative spaces. | Trace-to-Spec-v1 | Update flags managed inside [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-81-003 | Chapter 39 > Spaces > Voids Deduction | The system shall deduct fully enclosed boundary objects (e.g. columns, utility shafts) from space area. | Trace-to-Spec-v1 | Solved by subtracting nested closed polygon areas in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-81-004 | Chapter 39 > Spaces > Deactivate Links | The system shall support converting an associative space to a non-associative, freely grip-editable space. | Trace-to-Spec-v1 | De-referencing geometry links handled in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-81-005 | Chapter 39 > Spaces > Property Sets | The system shall calculate property values (perimeter, volumes) dynamically using custom Property Set formulas. | Trace-to-Spec-v1 | Cost estimation equations resolved in [qto.ts](../packages/domain/src/qto.ts#L100) |
| REQ-81-006 | Chapter 39 > Spaces > Merge Space | The system shall support merging adjacent associative spaces when their dividing boundary entity is deleted using the Space Update command. | Trace-to-Spec-v1 | Managed in workspace update operations in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-81-007 | Chapter 39 > Spaces > Manual Division | The system shall support manually dividing an associative space by adding boundary objects when automatic update is deactivated, updating on user request. | Trace-to-Spec-v1 | Update execution triggered inside [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
| REQ-81-008 | Chapter 39 > Spaces > Ceiling Volumes | The system shall compute space 3D volumes dynamically using ceiling slab height offsets. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-009 | Chapter 39 > Spaces > Offset Boundaries | The system shall support Net, Usable, and Gross offset boundary calculation rules (e.g. wall center, inside face, outside face). | Trace-to-Spec-v1 | Not implemented |
| REQ-81-010 | Chapter 39 > Spaces > Zoning Grids | The system shall support subdividing space geometry into layout zoning cells grids. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-011 | Chapter 39 > Spaces > Style Overrides | The system shall support style-level overrides to ignore bounding wall settings for specific spaces. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-012 | Chapter 39 > Spaces > Classification Tags | The system shall support classification tags for occupancy codes, facility designations, and department fields. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-013 | Chapter 39 > Spaces > Thermal Zones | The system shall support grouping spaces into designated thermal zone clusters for energy analysis. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-014 | Chapter 39 > Spaces > Sync Alerts | The system shall prompt visual alerts when boundary modifications cause space coordinates to become out of sync. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-015 | Chapter 39 > Spaces > Auto Numbering | The system shall support auto-numbering room labels sequentially when placing space objects. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-016 | Chapter 39 > Spaces > Ventilation Checks | The system shall validate ventilation rate requirements based on occupancy classification and space area properties. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-017 | Chapter 39 > Spaces > Grip Editing | The system shall provide stretch grip handles to translate manual space boundaries vertices. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-018 | Chapter 39 > Spaces > Overlap Audits | The system shall calculate space overlap intersections and flag area collisions between zoning spaces. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-019 | Chapter 39 > Spaces > Floor Offsets | The system shall support vertical baseline offsets for floor layers relative to local datum elevations. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-020 | Chapter 39 > Spaces > Ceiling Grids | The system shall anchor ceiling grid templates dynamically inside space boundaries geometries. | Trace-to-Spec-v1 | Not implemented |
| REQ-81-021 | Chapter 39 > Spaces > Color Schemes | The system shall generate color-coded layout display sets based on space parameters (e.g. occupancy type). | Trace-to-Spec-v1 | Not implemented |
| REQ-81-022 | Chapter 39 > Spaces > Egress Audits | The system shall run occupant loading density checks against exit door counts. | Trace-to-Spec-v1 | Not implemented |


