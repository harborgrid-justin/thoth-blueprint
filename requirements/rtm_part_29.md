# Requirements Traceability Matrix - Part 29
**Subject:** Space Separators, Deductions & Zoning Zones - Part 2 (Chapter 39, Part 2)
**Coverage:** Space Separator Tool, Inner Ring Area Deductions, Zoning Groups, Enclosed Interferences, Property Set Data

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-29-001 | Chapter 39 > Spaces > Space Separator | The system shall support a virtual Space Separator tool to split spaces without physical wall geometry. | Trace-to-Spec-v1 | Handled via multi-point draft lines in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-29-002 | Chapter 39 > Spaces > Area Deductions | The system shall deduct inner rings (e.g. easement zones, structural column voids) from the calculated space area. | Trace-to-Spec-v1 | Solved by subtracting nested polygon areas in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-29-003 | Chapter 39 > Spaces > Zoning Groups | The system shall support grouping spaces into hierarchical Zoning Zones for development rule tracking. | Trace-to-Spec-v1 | Managed as layers or classification items in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-29-004 | Chapter 39 > Spaces > Interference | The system shall flag spatial interferences where space polygons overlap or exceed boundary margins. | Trace-to-Spec-v1 | Overlap intersections calculated using polygon bounds check in [geometry.ts](../packages/domain/src/geometry.ts#L60) |
| REQ-29-005 | Chapter 39 > Spaces > Property Sets | The system shall support attaching custom Property Set definitions to space objects for cataloging (e.g. occupancy, zone use). | Trace-to-Spec-v1 | Mapped to extended attributes inside [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
