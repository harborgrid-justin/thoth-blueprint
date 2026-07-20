# Requirements Traceability Matrix - Part 34
**Subject:** Multi-View Blocks & Custom Survey Symbols (Chapter 38)
**Coverage:** Multi-View Blocks (MVB), View-Dependent Representation, 2D/3D Symbol Placement, Scale & Rotation, Description Linkage, Scale Overrides, Labeling Fields, Creation Wizard, Standard Catalogs, CSI Divisions, Coordinate Rotations, Elevation Offsets, Count Schedules, Boundary Clipping, Default Layers, Alignment Offsets, Symbol Transparency, Multi-View Splits, Selection Highlights, PDF Vector Exports

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-34-001 | Chapter 38 > MVB > Block Creation | The system shall support creating Multi-View Blocks that pack multiple drawing representations. | Trace-to-Spec-v1 | Element icons and 3D geometries mapped in [elementMeta.ts](../../../apps/web/src/lib/elementMeta.ts) |
| REQ-34-002 | Chapter 38 > MVB > View Representations | The system shall display different visual blocks depending on the active viewport (e.g. 2D Plan vs 3D Model view). | Trace-to-Spec-v1 | 2D symbols rendered in [PlanningCanvas.tsx](../../../apps/web/src/features/canvas/PlanningCanvas.tsx) and 3D shapes in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-34-003 | Chapter 38 > MVB > Survey Symbols | The system shall support standard survey symbols (trees, benchmarks, utilities) mapped to coordinate positions. | Trace-to-Spec-v1 | Point kinds note, tree, spot mapped in [elementFactory.ts](../../../apps/web/src/lib/elementFactory.ts#L10) |
| REQ-34-004 | Chapter 38 > MVB > Scaling & Rotation | The system shall support configuring scale factors and rotation angles for placed block symbols. | Trace-to-Spec-v1 | Managed as attributes in element properties in [PropertiesPanel.tsx](../../../apps/web/src/features/workspace/PropertiesPanel.tsx) |
| REQ-34-005 | Chapter 38 > MVB > Description Assignment | The system shall support linking raw description keys to override multi-view block displays automatically. | Trace-to-Spec-v1 | Mapped in [descriptionKeys.ts](../../../packages/domain/src/descriptionKeys.ts) and applied in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts#L416) |
| REQ-34-006 | Chapter 38 > MVB > Scale Overrides | The system shall support assigning different block representations automatically based on active viewport zoom levels. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-007 | Chapter 38 > MVB > Labeling Fields | The system shall support embedding dynamic text label fields in block layouts linking to object metadata. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-008 | Chapter 38 > MVB > Creation Wizard | The system shall provide an assistant wizard to pack standard 2D block shapes and 3D geometry meshes into custom MVB files. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-009 | Chapter 38 > MVB > Standard Catalogs | The system shall support publishing MVB styles to central catalog libraries (.atc files) for sharing. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-010 | Chapter 38 > MVB > CSI Divisions | The system shall support filtering MVB libraries lists by standard Construction Specifications Institute (CSI) classification divisions. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-011 | Chapter 38 > MVB > Coordinate Rotations | The system shall support locking block rotation angles relative to WCS or UCS alignment vectors. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-012 | Chapter 38 > MVB > Elevation Offsets | The system shall support grounding block vertical elevations dynamically to meet terrain contours levels. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-013 | Chapter 38 > MVB > Count Schedules | The system shall compile QTO schedules listing total block counts categorized by block style. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-014 | Chapter 38 > MVB > Boundary Clipping | The system shall support dynamic outline boundary clipping masks to hide overlapping background lines. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-015 | Chapter 38 > MVB > Default Layers | The system shall assign newly placed blocks to target layers automatically based on CAD styling keys. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-016 | Chapter 38 > MVB > Alignment Offsets | The system shall support locking block placement offsets along horizontal alignments. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-017 | Chapter 38 > MVB > Symbol Transparency | The system shall support opacity adjustments on block layers displays. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-018 | Chapter 38 > MVB > Multi-View Splits | The system shall support rendering plan-view and elevation-view block details concurrently. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-019 | Chapter 38 > MVB > Selection Highlights | The system shall highlight active block elements on canvas when corresponding schedules rows are selected. | Trace-to-Spec-v1 | Not implemented |
| REQ-34-020 | Chapter 38 > MVB > PDF Vector Exports | The system shall support exporting drawings with MVBs to high-accuracy vector PDF sheet layouts. | Trace-to-Spec-v1 | Not implemented |


---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](file:///f:/AutoCAD%20Competitor/docs/requirements/README.md)
- [Master Requirements Traceability Matrix (RTM)](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/traceability-matrix.md)
- [Requirements Coverage Report](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/unimplemented_requirements.md)
- [Frontend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/frontend-requirements.md)
- [Backend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/backend-requirements.md)
- [Domain Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/domain-requirements.md)
- [Interoperability Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/03-nonfunctional/nonfunctional-requirements.md)


