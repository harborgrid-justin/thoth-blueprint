# Requirements Traceability Matrix - Part 28
**Subject:** Associative Space Geometry & Lot Boundaries - Part 1 (Chapter 39, Part 1)
**Coverage:** Associative Space Boundaries, Auto-Update on Geometry Edits, Net/Gross Area Calculations, Boundary Grip Edits, Offset Rules

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-28-001 | Chapter 39 > Spaces > Associative Boundaries | The system shall support associating space lot entities to enclosing linear boundaries (walls, boundaries). | Trace-to-Spec-v1 | Bound objects checks and intersection solved in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-28-002 | Chapter 39 > Spaces > Auto-Update | The system shall automatically update space lot geometries and labels when surrounding boundary objects are modified. | Trace-to-Spec-v1 | Handled via reactivity hooks inside [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-28-003 | Chapter 39 > Spaces > Area Calculation | The system shall calculate plan area (net, usable, gross) for closed space/zoning shapes. | Trace-to-Spec-v1 | Shape area calculated via `measuredArea` in [geometry.ts](../packages/domain/src/geometry.ts#L80) |
| REQ-28-004 | Chapter 39 > Spaces > Grip Editing | The system shall support modifying space boundaries manually via interactive vertex grip manipulation. | Trace-to-Spec-v1 | Vertex reposition handles supported in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L367) |
| REQ-28-005 | Chapter 39 > Spaces > Offset Rules | The system shall support offset rule styles (e.g. wall center, inside face, custom setback offsets) for space areas. | Trace-to-Spec-v1 | Setbacks offset calculations implemented in [geometry.ts](../packages/domain/src/geometry.ts) |
