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

