# Requirements Traceability Matrix - Part 71
**Subject:** AEC Content & DesignCenter (Chapter 50)
**Coverage:** AEC Content in DesignCenter, Custom Content Tools, AEC Content Settings, Block Library Search, Command Tools

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-71-001 | Chapter 50 > AEC Content > DesignCenter | The system shall display block definitions and style templates in a DesignCenter-compatible file explorer. | Trace-to-Spec-v1 | Layer panel folder tree navigation implemented inside [LayerPanel.tsx](../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-71-002 | Chapter 50 > AEC Content > Custom Tools | The system shall support creating custom content tools by dragging block objects from the plan layout. | Trace-to-Spec-v1 | Not implemented |
| REQ-71-003 | Chapter 50 > AEC Content > Settings | The system shall maintain default directories for user-defined symbols and custom templates. | Trace-to-Spec-v1 | Custom project folders paths configured in [Workspace.tsx](../apps/web/src/features/workspace/Workspace.tsx) |
| REQ-71-004 | Chapter 50 > AEC Content > Block Search | The system shall support searching the block library dynamically by name keywords. | Trace-to-Spec-v1 | File name search implemented inside import dialogues in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-71-005 | Chapter 50 > AEC Content > Commands | The system shall support command tools that execute pre-defined command sequences upon insertion. | Trace-to-Spec-v1 | Active command tool state callbacks registered in [tools.ts](../apps/web/src/lib/tools.ts) |
