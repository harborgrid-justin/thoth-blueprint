# Requirements Traceability Matrix - Part 43
**Subject:** Drawing Management - Project Navigator & File Structure (Chapter 6, Part 1)
**Coverage:** Project Browser, Project Navigator Palette, Levels (Building Elevations), Divisions (Building Wings), Multi-user File Control

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-43-001 | Chapter 6 > Drawing Management > Browser | The system shall support creating and switching drawing project directories (Project Browser). | Trace-to-Spec-v1 | Project selector dropdown list built in [TopBar.tsx](../apps/web/src/features/workspace/TopBar.tsx) |
| REQ-43-002 | Chapter 6 > Drawing Management > Navigator | The system shall provide a Project Navigator sidebar listing files, layouts, and sheets. | Trace-to-Spec-v1 | Layer and folder hierarchy rendered in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-43-003 | Chapter 6 > Drawing Management > Levels | The system shall support setting up Levels (elevation heights) to stack drawing geometries. | Trace-to-Spec-v1 | Managed as vertical coordinate values in [spatial.ts](../packages/domain/src/spatial.ts) |
| REQ-43-004 | Chapter 6 > Drawing Management > Divisions | The system shall support wing Divisions to separate building plan layouts horizontally. | Trace-to-Spec-v1 | Element categories and classification groupings mapped in [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-43-005 | Chapter 6 > Drawing Management > Locking | The system shall enforce file write locking when drawings are edited in a multi-user network path. | Trace-to-Spec-v1 | Not implemented |
