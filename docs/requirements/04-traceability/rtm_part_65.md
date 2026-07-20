# Requirements Traceability Matrix - Part 65
**Subject:** Sections (Chapter 40)
**Coverage:** Section Line Generation, 2D Plan Projection Views, Cutting Plane Subdivisions, Material Hatch Fills, Real-Time Section Updates, Split Profiles, Cross Section Sheets, Data Bands, PVI Spreadsheet, Superelevation Profiles, Label Masks, Point Projections, Offset Overlays, Mass Haul QTO, Longitudinal Sweeps

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-65-001 | Chapter 40 > Sections > Section Lines | The system shall support creating 2D and 3D Section Lines across alignments and site elements. | Trace-to-Spec-v1 | Alignments station cross sections computed in [profile.ts](../../../packages/domain/src/profile.ts#L45) |
| REQ-65-002 | Chapter 40 > Sections > Projection | The system shall generate 2D elevation views projecting terrain and corridor profiles along section planes. | Trace-to-Spec-v1 | Cross sections profiles mapped and plotted in [ProfileSectionDialog.tsx](../../../apps/web/src/features/survey/ProfileSectionDialog.tsx) |
| REQ-65-003 | Chapter 40 > Sections > Subdivisions | The system shall support setting subdivision distances along section cuts to limit display depth. | Trace-to-Spec-v1 | Station interval offsets and widths handled in [profile.ts](../../../packages/domain/src/profile.ts) |
| REQ-65-004 | Chapter 40 > Sections > Fills | The system shall fill sliced structural elements with material-specific hatch patterns. | Trace-to-Spec-v1 | Rendering cross section patterns resolved in [ProfileSectionDialog.tsx](../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L125) |
| REQ-65-005 | Chapter 40 > Sections > Auto-Update | The system shall support auto-updating section views when primary model geometry is modified. | Trace-to-Spec-v1 | Recompiled reactively inside [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts) on state updates |
| REQ-65-006 | Chapter 40 > Sections > Split Profiles | The system shall support splitting vertical profile grids dynamically at layout sheet boundaries when elevation differences exceed viewport height limits. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-007 | Chapter 40 > Sections > Cross Section Sheets | The system shall support automated generation of section sheets arranging multiple cross-section grids on standardized sheet formats. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-008 | Chapter 40 > Sections > Data Bands | The system shall support customizable section data bands detailing station offsets, profiles elevations, and relative slopes beneath section views. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-009 | Chapter 40 > Sections > PVI Spreadsheet | The system shall support a tabular grid spreadsheet to raise, lower, or flatten Profile Vertical Intersection (PVI) stations. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-010 | Chapter 40 > Sections > Superelevation Profiles | The system shall support plotting superelevation rate diagrams dynamically inside profile grid views. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-011 | Chapter 40 > Sections > Label Masks | The system shall support overlay masks to automatically mask background grid lines under profile annotation labels. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-012 | Chapter 40 > Sections > Point Projections | The system shall support projecting independent plan survey points (e.g. structures, hydrants) onto transverse cross section views. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-013 | Chapter 40 > Sections > Offset Overlays | The system shall support projecting parallel offset alignments profiles as overlapping lines on standard profile views. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-014 | Chapter 40 > Sections > Mass Haul QTO | The system shall calculate cumulative cut-fill volumes along profiles and display mass haul diagram sheets. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-015 | Chapter 40 > Sections > Longitudinal Sweeps | The system shall support an interactive longitudinal camera drive-through animation following profile centerline paths. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-016 | Chapter 40 > Sections > Label Overrides | The system shall support manual text string overrides on individual section views labels. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-017 | Chapter 40 > Sections > Multi-Surface Overlays | The system shall support overlaying existing ground and finished design profiles concurrently on the same section view. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-018 | Chapter 40 > Sections > Sheet Title Blocks | The system shall compile sheet layout headers dynamically from project properties databases. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-019 | Chapter 40 > Sections > Grid Clipping | The system shall support clipping profile grid lines above design surfaces profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-020 | Chapter 40 > Sections > Bridge Projections | The system shall support rendering bridge pier columns and deck profiles projected onto section views. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-021 | Chapter 40 > Sections > Pipe Crossings | The system shall compute crossing clearances between drainage pipe networks and section centerlines. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-022 | Chapter 40 > Sections > Viewport Wizard | The system shall provide an assistant wizard to layout plan-profile viewport splits automatically. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-023 | Chapter 40 > Sections > Grade Break Filters | The system shall support masking filters to omit minor grade break labels and prevent text overlaps. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-024 | Chapter 40 > Sections > Balance Lines | The system shall support drawing zero-volume balance lines on mass haul diagrams. | Trace-to-Spec-v1 | Not implemented |
| REQ-65-025 | Chapter 40 > Sections > LandXML Export | The system shall support exporting profile view station coordinates to LandXML file formats. | Trace-to-Spec-v1 | Not implemented |



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


