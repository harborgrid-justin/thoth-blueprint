# Requirements Traceability Matrix - Part 41
**Subject:** The Workspace (Chapter 2)
**Coverage:** Application Ribbon, Context Menus, Tool Palettes Registry, Properties Palette, Command Line HUD, Grip-based Dimensions

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-41-001 | Chapter 2 > Workspace > Ribbon | The system shall provide a Top Bar / Ribbon menu for selecting design modes, dialogs, and panels. | Trace-to-Spec-v1 | Ribbon header tabs and dialogue buttons layout in [TopBar.tsx](../apps/web/src/features/workspace/TopBar.tsx) |
| REQ-41-002 | Chapter 2 > Workspace > Context Menus | The system shall display context actions for drawing elements based on the current selection. | Trace-to-Spec-v1 | Element selection filters and action panels rendered inside [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
| REQ-41-003 | Chapter 2 > Workspace > Tool Palettes | The system shall provide tool registries grouping drawing tools (select, point, polyline, waterdrop). | Trace-to-Spec-v1 | Active tools defined in [tools.ts](../apps/web/src/lib/tools.ts) and toolbars in [Workspace.tsx](../apps/web/src/features/workspace/Workspace.tsx) |
| REQ-41-004 | Chapter 2 > Workspace > Properties Palette | The system shall display object dimensions, styles, and layer settings in an inspector palette. | Trace-to-Spec-v1 | Fields editor forms implemented inside [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx#L10-L55) |
| REQ-41-005 | Chapter 2 > Workspace > Command Line | The system shall support command keyboard shortcuts and status bar coordinate/elevation displays. | Trace-to-Spec-v1 | Coordinates tracking and HUD text display implemented in [CanvasHud.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L816) |
| REQ-41-006 | Chapter 2 > Workspace > Grip Editing | The system shall provide draggable visual handles (grips) on elements for interactive scaling and vertex moving. | Trace-to-Spec-v1 | Polyline vertex edit nodes and centerline handles drawn in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L367) |
