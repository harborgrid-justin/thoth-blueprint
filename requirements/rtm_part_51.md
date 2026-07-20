# Requirements Traceability Matrix - Part 51
**Subject:** General Object Tools (Chapter 19)
**Coverage:** Isolate Objects, Hide Objects, Xref Isolation Rules, Temporary UCS View Editing, Match Properties, Xref Open Constraints, UCS Alignment Overrides

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-51-001 | Chapter 19 > Object Tools > Isolate | The system shall support isolating selected drawing elements, making all other elements invisible. | Trace-to-Spec-v1 | Layer and component visibility toggles implemented in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-51-002 | Chapter 19 > Object Tools > Hide | The system shall support hiding selected objects from the plan layout. | Trace-to-Spec-v1 | Element visibility properties handled in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-51-003 | Chapter 19 > Object Tools > Xref Isolation | The system shall support isolating individual objects nested within attached external drawings. | Trace-to-Spec-v1 | Visibility checkboxes for individual point clouds and underlays configured in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-51-004 | Chapter 19 > Object Tools > Temporary Views | The system shall support switching to temporary section or plan views aligning the UCS for detailed editing. | Trace-to-Spec-v1 | Profile PVI grid editing and cross section viewers aligned in [ProfileSectionDialog.tsx](../apps/web/src/features/survey/ProfileSectionDialog.tsx) |
| REQ-51-005 | Chapter 19 > Object Tools > Match Properties | The system shall support a Match Properties tool to copy properties (layers, color) from a source object to target objects. | Trace-to-Spec-v1 | Copying element styles supported in properties update actions in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-51-006 | Chapter 19 > Object Tools > Xref Constraints | The system shall enforce using XOPEN to save or redisplay hidden objects inside external reference files, preventing REFEDIT from editing hidden nested objects. | Trace-to-Spec-v1 | Mapped to file load/update events inside [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-51-007 | Chapter 19 > Object Tools > UCS Alignment | The system shall align the User Coordinate System (UCS) automatically to the cutting plane when editing objects in temporary section/elevation views, returning to the working UCS on exit. | Trace-to-Spec-v1 | Dynamic UCS viewport translations calculated inside [ProfileSectionDialog.tsx](../apps/web/src/features/survey/ProfileSectionDialog.tsx) |

