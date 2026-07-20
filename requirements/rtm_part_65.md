# Requirements Traceability Matrix - Part 65
**Subject:** Sections (Chapter 40)
**Coverage:** Section Line Generation, 2D Plan Projection Views, Cutting Plane Subdivisions, Material Hatch Fills, Real-Time Section Updates

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-65-001 | Chapter 40 > Sections > Section Lines | The system shall support creating 2D and 3D Section Lines across alignments and site elements. | Trace-to-Spec-v1 | Alignments station cross sections computed in [profile.ts](../packages/domain/src/profile.ts#L45) |
| REQ-65-002 | Chapter 40 > Sections > Projection | The system shall generate 2D elevation views projecting terrain and corridor profiles along section planes. | Trace-to-Spec-v1 | Cross sections profiles mapped and plotted in [ProfileSectionDialog.tsx](../apps/web/src/features/survey/ProfileSectionDialog.tsx) |
| REQ-65-003 | Chapter 40 > Sections > Subdivisions | The system shall support setting subdivision distances along section cuts to limit display depth. | Trace-to-Spec-v1 | Station interval offsets and widths handled in [profile.ts](../packages/domain/src/profile.ts) |
| REQ-65-004 | Chapter 40 > Sections > Fills | The system shall fill sliced structural elements with material-specific hatch patterns. | Trace-to-Spec-v1 | Rendering cross section patterns resolved in [ProfileSectionDialog.tsx](../apps/web/src/features/survey/ProfileSectionDialog.tsx#L125) |
| REQ-65-005 | Chapter 40 > Sections > Auto-Update | The system shall support auto-updating section views when primary model geometry is modified. | Trace-to-Spec-v1 | Recompiled reactively inside [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts) on state updates |
