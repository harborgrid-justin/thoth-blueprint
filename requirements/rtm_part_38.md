# Requirements Traceability Matrix - Part 38
**Subject:** Drawing Templates, Scale, and Unit Systems (Chapter 4)
**Coverage:** Drawing Templates (.dwt), Unit Systems (Imperial/Metric), Annotation Scale settings, NCS Layer Standards, Drawing Setup

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-38-001 | Chapter 4 > Setup > Templates | The system shall support loading and creating site plans from DWT templates containing standard configurations. | Trace-to-Spec-v1 | Template sizes and layout boxes defined in [sheetsize.ts](../packages/domain/src/sheetsize.ts) |
| REQ-38-002 | Chapter 4 > Setup > Unit Systems | The system shall support switching between Imperial (feet) and Metric (meters) unit systems. | Trace-to-Spec-v1 | Units context supported in [spatial.ts](../packages/domain/src/spatial.ts#L10) and conversions in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-38-003 | Chapter 4 > Setup > Annotation Scales | The system shall support setting annotation scales that control font height and symbol scaling dynamically. | Trace-to-Spec-v1 | Font dimensions and text height ratios scale dynamically in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx) |
| REQ-38-004 | Chapter 4 > Setup > Layer Standards | The system shall support importing National CAD Standard (NCS) layer standards on drawing initialization. | Trace-to-Spec-v1 | Default layers loaded in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L140-L160) |
| REQ-38-005 | Chapter 4 > Setup > Options | The system shall maintain project options and editor settings persisted in drawing metadata. | Trace-to-Spec-v1 | PERSIST metadata key-value storage properties implemented in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) |
