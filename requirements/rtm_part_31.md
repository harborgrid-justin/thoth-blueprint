# Requirements Traceability Matrix - Part 31
**Subject:** Layout Curves and Baseline Site Alignments (Chapter 33)
**Coverage:** Layout Curves, Division Nodes, Object Anchoring, Dynamic Updates on Path Modification, Station Offset Projections

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-31-001 | Chapter 33 > Layout Curves > Paths | The system shall support designing linear Layout Curves comprising line segments and tangent circular arcs. | Trace-to-Spec-v1 | Alignment horizontal baselines modeled in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-31-002 | Chapter 33 > Layout Curves > Division Nodes | The system shall support dividing layout curves into station nodes based on fixed intervals or count divisions. | Trace-to-Spec-v1 | Handled via station calculations in [resolveAlignment](../packages/domain/src/geometry.ts#L200) |
| REQ-31-003 | Chapter 33 > Layout Curves > Anchoring | The system shall support anchoring objects (e.g. spots, survey markers, trees) to a specific station offset on a curve. | Trace-to-Spec-v1 | Mapped to [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L82) with station reference properties |
| REQ-31-004 | Chapter 33 > Layout Curves > Updates | The system shall dynamically update the position of anchored objects when layout curve geometry is modified. | Trace-to-Spec-v1 | Resolved dynamically on geometry changes in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
| REQ-31-005 | Chapter 33 > Layout Curves > Offsets | The system shall project coordinates as station and perpendicular offset values relative to a layout curve. | Trace-to-Spec-v1 | Computed via alignment projection helpers in [geometry.ts](../packages/domain/src/geometry.ts) |
