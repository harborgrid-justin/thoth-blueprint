# Requirements Traceability Matrix - Part 69
**Subject:** Visual Audit (Chapter 53)
**Coverage:** Visual Auditing, Highlight Standards Violations, Layer Verification, 3D Mesh Gaps, Audit Log Report

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-69-001 | Chapter 53 > Visual Audit > Session | The system shall support running a Visual Audit check to detect layout and standards issues. | Trace-to-Spec-v1 | Checked dynamically during TypeScript compile check and test suites execution |
| REQ-69-002 | Chapter 53 > Visual Audit > Highlights | The system shall highlight drawing errors graphically (such as design speed violations, crossing feature lines). | Trace-to-Spec-v1 | Warning markers and lists rendered inside [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
| REQ-69-003 | Chapter 53 > Visual Audit > Layers | The system shall validate all drawing layers names and styling rules against standards. | Trace-to-Spec-v1 | Handled via matching checks in [descriptionKeys.ts](../packages/domain/src/descriptionKeys.ts) |
| REQ-69-004 | Chapter 53 > Visual Audit > 3D Gaps | The system shall detect vertical coordinate gaps (e.g. pipes with insufficient cover depth, floating structures). | Trace-to-Spec-v1 | cover depth rules validation checks calculated inside [pipedesign.ts](../packages/domain/src/pipedesign.ts#L45) |
| REQ-69-005 | Chapter 53 > Visual Audit > Reports | The system shall generate an Audit Log detailing standard violations and layout warnings. | Trace-to-Spec-v1 | Warning banners list rendered in sidebar panels inside [PipeDesignDialog.tsx](../apps/web/src/features/survey/PipeDesignDialog.tsx) |
