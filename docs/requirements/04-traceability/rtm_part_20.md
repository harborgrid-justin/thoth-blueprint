# Requirements Traceability Matrix - Part 20
**Subject:** Sections Tutorials (Chapter 15)
**Coverage:** Sample Lines, Section Views, Multiple Views, Projected Objects, Grade Labels, Data Bands (Lines 9308â€“9638)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-20-001 | Sections > Sample Lines | The system shall support creating Sample Lines across corridor alignments at specified intervals or from corridor stations. | Trace-to-Spec-v1 | `../../../packages/domain/src/profile.ts#L131` (`sampleCrossSection`) |
| REQ-20-002 | Sections > Sample Line Groups | The system shall organize sample lines into Sample Line Groups with configurable swath widths (left/right). | Trace-to-Spec-v1 | `../../../packages/domain/src/profile.ts#L121` (`CrossSection`) |
| REQ-20-003 | Sections > Sample Line Tools | The system shall provide Sample Line creation methods (By Range Of Stations, From Corridor Stations, Pick Points). | Trace-to-Spec-v1 | `../../../packages/domain/src/profile.ts#L131` (`sampleCrossSection`) |
| REQ-20-004 | Sections > Section Views | The system shall generate Section Views plotting cross-sections of corridors, surfaces, and other sampled data. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L23` (`ProfileSectionDialog`) |
| REQ-20-005 | Sections > Multiple Views | The system shall support creating multiple section views simultaneously with configurable station ranges and page layouts. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L23` (`ProfileSectionDialog`) |
| REQ-20-006 | Sections > Group Plot Style | The system shall support Group Plot Styles controlling sheet extents, printable area, and view arrangement. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L182` |
| REQ-20-007 | Sections > Production/Draft | The system shall support Production mode (for sheet generation) and Draft mode (for in-drawing views) section placement. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L182` |
| REQ-20-008 | Sections > Sheet Templates | The system shall support selecting layout sheet templates (ARCH D, section scale) for production section views. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L120` |
| REQ-20-009 | Sections > Section View Style | The system shall support configurable Section View styles (Road Section, etc.) with grid, axis, and label settings. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L182` |
| REQ-20-010 | Sections > Offset/Elevation Range | The system shall support setting offset range (Automatic or User Specified) and elevation range (user-specified height, follow a section). | Trace-to-Spec-v1 | `../../../packages/domain/src/profile.ts#L131` (`sampleCrossSection`) |
| REQ-20-011 | Sections > Section Display Options | The system shall support configuring sampled section display (object/label styles, clip grid) per data source. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L182` |
| REQ-20-012 | Sections > Section Data Bands | The system shall support adding data bands (elevation, offset) to section views with configurable band sets. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L235` |
| REQ-20-013 | Sections > Projected Objects | The system shall support projecting 3D objects (blocks, polylines, feature lines) onto section views with configurable proximity rules. | Trace-to-Spec-v1 | `../../../packages/domain/src/profile.ts#L131` (`sampleCrossSection`) |
| REQ-20-014 | Sections > Projection By Distance | The system shall support projecting objects within a specified Distance Before/After each sample line. | Trace-to-Spec-v1 | `../../../packages/domain/src/profile.ts#L131` (`sampleCrossSection`) |
| REQ-20-015 | Sections > Projection Labels | The system shall support labeling projected objects on section views with offset and elevation annotations. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L235` |
| REQ-20-016 | Sections > Grade Labels | The system shall support adding grade labels to section views to annotate slope between two points. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L235` |
| REQ-20-017 | Sections > Data Band Sets | The system shall support selecting data band sets (Major Station) for section views with surface assignments. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L235` |
| REQ-20-018 | Sections > Dynamic Sections | The system shall support dynamic sections that automatically update when the underlying surface or corridor model is modified. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L81` (`React.useMemo`) |
| REQ-20-019 | Sections > Static Sections | The system shall support static sections that display elevations captured at creation time and do not react to subsequent geometry changes. | Trace-to-Spec-v1 | `../../../packages/domain/src/profile.ts#L121` (`CrossSection`) |
| REQ-20-020 | Sections > Dynamic Sample Lines | The system shall support dynamic sample lines that move with the alignment if the alignment geometry is modified. | Trace-to-Spec-v1 | `../../../apps/web/src/features/survey/ProfileSectionDialog.tsx#L81` |

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


