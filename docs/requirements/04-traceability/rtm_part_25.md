# Requirements Traceability Matrix - Part 25
**Subject:** Plan Production Tutorials & Index (Chapter 20 + Index/Tutorial Folders)
**Coverage:** Viewports, View Frames, Match Lines, Plan/Profile Sheets, Section Sheets, Tutorial Folder Locations, Index (Lines 12729â€“13127)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-25-001 | Plan Production > Viewports | The system shall support configuring custom sheet layout viewports that align plan and profile views for plotted output. | Trace-to-Spec-v1 | Scaled paper-space viewport coordinate windows are modeled in [sheetview.ts](../../../packages/domain/src/sheetview.ts#L39) and displayed in [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx#L107-L123) |
| REQ-25-002 | Plan Production > Viewport Configuration | The system shall support setting viewport scale, standard sizes, and layer visibility for plan production. | Trace-to-Spec-v1 | Viewport kinds, custom sizes, scale values, and rotations are configurable in [sheetview.ts](../../../packages/domain/src/sheetview.ts#L39) |
| REQ-25-003 | Plan Production > View Frames | The system shall support generating View Frames along alignments to split the corridor into page-sized segments. | Trace-to-Spec-v1 | `../../../packages/domain/src/planproduction.ts#L41` (`generateViewFrames` grid segmenting) |
| REQ-25-004 | Plan Production > Match Lines | The system shall support generating Match Lines between adjacent view frames to show overlap regions. | Trace-to-Spec-v1 | `../../../packages/domain/src/planproduction.ts#L20` (`PlanMatchLine`) |
| REQ-25-005 | Plan Production > View Frame Group | The system shall organize view frames into View Frame Groups with configurable station ranges and naming. | Trace-to-Spec-v1 | `../../../packages/domain/src/planproduction.ts#L28` (`ViewFrameGroup`) |
| REQ-25-006 | Plan Production > Sheet Templates | The system shall support selecting layout sheet templates (DWT files) for plan and profile sheet generation. | Trace-to-Spec-v1 | Drawing sheet layout data, sizes, disciplines, and orientation properties are structured in [sheet.ts](../../../packages/domain/src/sheet.ts) |
| REQ-25-007 | Plan Production > Create Sheets | The system shall automate the creation of Sheet Sets based on defined view frames, populating plan and profile viewports. | Trace-to-Spec-v1 | `../../../packages/domain/src/planproduction.ts#L129` (`createSheetSetFromFrames` sheet set compiler) |
| REQ-25-008 | Plan Production > Plan/Profile Sheets | The system shall support creating plan and profile sheets displaying the corridor plan view and profile view side by side. | Trace-to-Spec-v1 | Multi-view plan window configurations are supported in [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-25-009 | Plan Production > Section Sheets | The system shall support creating section sheets displaying cross-section views arranged on standardized layouts. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx` |
| REQ-25-010 | Plan Production > Sheet Set Manager | The system shall integrate with Sheet Set Manager for organizing, managing, and plotting generated sheet sets. | Trace-to-Spec-v1 | Orderly collections of discipline sheets are managed in the drawing sets container in [sheet.ts](../../../packages/domain/src/sheet.ts) |
| REQ-25-011 | Plan Production > Sheet Naming | The system shall support configurable sheet naming conventions with alignment name, station range, and sequence numbers. | Trace-to-Spec-v1 | US National CAD Standard sheet numbers (AA-NNN sequence format) are parsed and formatted in [sheet.ts](../../../packages/domain/src/sheet.ts#L15-L59) |
| REQ-25-012 | Plan Production > North Arrow & Scale Bar | The system shall support placing north arrows and scale bars on plan production sheets. | Trace-to-Spec-v1 | Scaled north arrows and distance scale bars are drawn dynamically in [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-25-013 | Plan Production > Publish/Plot | The system shall support publishing or plotting sheet sets to PDF, DWF, or physical printers. | Trace-to-Spec-v1 | Plotting vector sheet layouts as SVG files is supported in [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx#L67-L80) |
| REQ-25-014 | General > Tutorial Drawing Folders | The system shall provide a standard tutorial drawings folder structure with organized sample drawings for all tutorial exercises. | Trace-to-Spec-v1 | `../../../packages/domain/src` |
| REQ-25-015 | General > Data Folder | The system shall provide a Data folder containing symbols, multi-view blocks, pay item data, and assembly set files. | Trace-to-Spec-v1 | `../../../packages/domain/src` |
| REQ-25-016 | General > Template Folder | The system shall provide drawing template (.dwt) files for plan production, section sheets, and standard layouts. | Trace-to-Spec-v1 | `../../../packages/domain/src/sheetsize.ts` |
| REQ-25-017 | Plan Production > Page Setup Templates | The system shall support importing standard page setup layouts templates (e.g. ANSI D, ISO A1). | Trace-to-Spec-v1 | Not implemented |
| REQ-25-018 | Plan Production > Pen Styles CTB STB | The system shall support color-dependent (CTB) and style-dependent (STB) plot style table configurations. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-019 | Plan Production > Scale Locking | The system shall support locking paper-space viewport scales to prevent accidental modifications. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-020 | Plan Production > Title Block Sync | The system shall compile project metadata (author, client, phase, date) dynamically in title block text fields. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-021 | Plan Production > Batch Publishing | The system shall support batch publishing drawing sheet sets to multi-page PDF or DWF formats. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-022 | Plan Production > Viewport Alignment | The system shall support vertical alignment synchronization between plan and profile viewports. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-023 | Plan Production > Printable Margins | The system shall validate sheet layouts and warn if annotation text exceeds physical paper margins bounds. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-024 | Plan Production > Line Weight Scaling | The system shall scale plotted line weights proportionally to the active viewport plot scale. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-025 | Plan Production > Viewport Shading | The system shall support conceptual, realistic, and wireframe viewport plotting options. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-026 | Plan Production > Print Checklists | The system shall execute standard templates audits to check scale accuracy and reference health before plotting. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-027 | Plan Production > Sheet Indexing | The system shall auto-update sheet numbers sequence when drawing pages are added or deleted. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-028 | Plan Production > Plot Stamps | The system shall support appending dynamic plot stamps (timestamp, filepath, user login) to sheet borders. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-029 | Plan Production > Catalog Profiles | The system shall support exporting page set configurations templates files to sharing directories. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-030 | Plan Production > North Arrow Sync | The system shall automatically rotate sheet north arrows to match active plan viewports rotation angles. | Trace-to-Spec-v1 | Not implemented |
| REQ-25-031 | Plan Production > Style Search Paths | The system shall maintain paths indices to look up CTB and STB style tables across network locations. | Trace-to-Spec-v1 | Not implemented |


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


