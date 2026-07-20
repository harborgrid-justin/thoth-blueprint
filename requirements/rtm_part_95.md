# Requirements Traceability Matrix - Part 95
**Subject:** Layout Curves Division Station Grids (Chapter 33, Part 2)
**Coverage:** Concentric Grid Divisions, Radial Offset Calculations, Subdivisions Alignments, Anchored Point Updates, SVG Baselines

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-95-001 | Chapter 33 > Layout Curves > Concentric Grids | The system shall support concentric divisions along curved alignments for radial grading boundaries. | Trace-to-Spec-v1 | Alignments station division nodes resolved in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-95-002 | Chapter 33 > Layout Curves > Radial Offsets | The system shall calculate radial coordinates offsets projecting perpendicularly from layout curves. | Trace-to-Spec-v1 | Perpendicular Normal calculations computed in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-95-003 | Chapter 33 > Layout Curves > Subdivisions | The system shall support division splits along layout paths based on total count divisions. | Trace-to-Spec-v1 | Station divisions count mapped in [resolveAlignment](../packages/domain/src/geometry.ts#L200) |
| REQ-95-004 | Chapter 33 > Layout Curves > Point Updates | The system shall update anchored point elevations dynamically when sloped profiles update. | Trace-to-Spec-v1 | Points heights synced in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L80-L91) |
| REQ-95-005 | Chapter 33 > Layout Curves > SVG Display | The system shall render layout paths and concentric subdivisions in plan view viewports. | Trace-to-Spec-v1 | Rendered in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
