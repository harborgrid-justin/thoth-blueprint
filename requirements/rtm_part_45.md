# Requirements Traceability Matrix - Part 45
**Subject:** Renovation (Chapter 7)
**Coverage:** Renovation Mode, Status Assignment (Existing/New/Demolished), Visual Style Overrides, Layer Rules, Design Rules, Auto Classification, QTO Segregation, Multi-plan Outputs, Cleanup Restrictions, Audit Warnings

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-45-001 | Chapter 7 > Renovation > Active Mode | The system shall support a Renovation Mode toggle to capture drawing changes for renovation plans. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-002 | Chapter 7 > Renovation > Statuses | The system shall support categorizing elements as Existing, New, or Demolished. | Trace-to-Spec-v1 | Mapped to object phase status fields in [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
| REQ-45-003 | Chapter 7 > Renovation > Visual Overrides | The system shall apply visual styles overrides (e.g. red dashed for demolition) automatically. | Trace-to-Spec-v1 | Style overrides evaluated dynamically during rendering in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-45-004 | Chapter 7 > Renovation > Layer Rules | The system shall allocate objects to renovation-specific layers based on status (e.g. prefixing layers with 'D-' for demo). | Trace-to-Spec-v1 | Not implemented |
| REQ-45-005 | Chapter 7 > Renovation > Design Rules | The system shall enforce design rules preventing structural modifications to locked Existing elements. | Trace-to-Spec-v1 | Element locking and modification blocker evaluated in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-45-006 | Chapter 7 > Renovation > Auto Classification | The system shall automatically classify newly created drawing objects into the active Renovation category. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-007 | Chapter 7 > Renovation > Takeoff Segregation | The system shall segregate quantity takeoffs and material cost sheets based on Existing, New, and Demolished statuses. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-008 | Chapter 7 > Renovation > Multi-plan Outputs | The system shall support producing separate sheet layout prints (Demolition Plan vs. Construction Plan) from a single drawing model using display set overrides. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-009 | Chapter 7 > Renovation > Cleanup Restrictions | The system shall disable automatic wall join and intersection cleanup between New walls and Demolished walls. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-010 | Chapter 7 > Renovation > Audit Warnings | The system shall support visual status badges on selected elements and trigger validation audit warnings for renovation structural violations. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-011 | Chapter 7 > Renovation > Bulk Overrides | The system shall support command-line inputs to change the renovation status of selected objects in bulk. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-012 | Chapter 7 > Renovation > Prefixes Config | The system shall support customizing layer prefix templates formats (e.g. prefix vs suffix) inside renovation configuration files. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-013 | Chapter 7 > Renovation > Demolition Styles | The system shall support distinct dashed and dotted linetypes overrides for demolished elements. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-014 | Chapter 7 > Renovation > Volume Multipliers | The system shall support applying material waste factor multipliers to QTO calculations based on element renovation category. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-015 | Chapter 7 > Renovation > Layout Wizard | The system shall provide a sheet generation wizard to automatically extract and arrange demolition views. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-016 | Chapter 7 > Renovation > Cleanup Exclusions | The system shall provide options to exclude cleanup joins on walls between different phases. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-017 | Chapter 7 > Renovation > Structural Openings | The system shall flag warning indicators when structural beams span over demolished opening bounds. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-018 | Chapter 7 > Renovation > Phase Slider HUD | The system shall support an interactive status bar HUD slider to toggle elements visibility by phase. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-019 | Chapter 7 > Renovation > Style Catalogs | The system shall support publishing renovation style configurations to central tool catalogs (.atc files). | Trace-to-Spec-v1 | Not implemented |
| REQ-45-020 | Chapter 7 > Renovation > Label Variables | The system shall support appending dynamic annotation suffix variables (e.g. (E) or (N)) to element labels. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-021 | Chapter 7 > Renovation > Template Overrides | The system shall support importing renovation visual style overrides from external drawing templates (.dwt files). | Trace-to-Spec-v1 | Not implemented |
| REQ-45-022 | Chapter 7 > Renovation > Demolished Hatches | The system shall support distinct fill hatches overrides for demolished concrete components. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-023 | Chapter 7 > Renovation > Existing Fills | The system shall support solid fill shade overrides representing existing masonry facades. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-024 | Chapter 7 > Renovation > Validation Logs | The system shall support exporting validation warnings and audit logs to external text files. | Trace-to-Spec-v1 | Not implemented |
| REQ-45-025 | Chapter 7 > Renovation > Plot Styles | The system shall support color plotting styles files (CTB/STB) mapping phase statuses to custom line colors. | Trace-to-Spec-v1 | Not implemented |


