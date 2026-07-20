# Requirements Traceability Matrix - Part 34
**Subject:** Multi-View Blocks & Custom Survey Symbols (Chapter 38)
**Coverage:** Multi-View Blocks (MVB), View-Dependent Representation, 2D/3D Symbol Placement, Scale & Rotation, Description Linkage

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-34-001 | Chapter 38 > MVB > Block Creation | The system shall support creating Multi-View Blocks that pack multiple drawing representations. | Trace-to-Spec-v1 | Element icons and 3D geometries mapped in [elementMeta.ts](../apps/web/src/lib/elementMeta.ts) |
| REQ-34-002 | Chapter 38 > MVB > View Representations | The system shall display different visual blocks depending on the active viewport (e.g. 2D Plan vs 3D Model view). | Trace-to-Spec-v1 | 2D symbols rendered in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) and 3D shapes in [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-34-003 | Chapter 38 > MVB > Survey Symbols | The system shall support standard survey symbols (trees, benchmarks, utilities) mapped to coordinate positions. | Trace-to-Spec-v1 | Point kinds note, tree, spot mapped in [elementFactory.ts](../apps/web/src/lib/elementFactory.ts#L10) |
| REQ-34-004 | Chapter 38 > MVB > Scaling & Rotation | The system shall support configuring scale factors and rotation angles for placed block symbols. | Trace-to-Spec-v1 | Managed as attributes in element properties in [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
| REQ-34-005 | Chapter 38 > MVB > Description Assignment | The system shall support linking raw description keys to override multi-view block displays automatically. | Trace-to-Spec-v1 | Mapped in [descriptionKeys.ts](../packages/domain/src/descriptionKeys.ts) and applied in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L416) |
