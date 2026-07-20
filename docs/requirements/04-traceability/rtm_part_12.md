# Requirements Traceability Matrix - Part 12
**Subject:** Profiles Tutorials â€” Creation, Design & Views (Chapter 9, Part 1)
**Coverage:** Surface Profiles, Layout Profiles, Profile Views, PVI Editing, Standards (Lines 4885â€“5376)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-12-001 | Profiles > Surface Profiles | The system shall extract vertical profiles from TIN surfaces along a horizontal alignment. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-002 | Profiles > Create Profile View | The system shall support creating profile views with configurable station and elevation ranges, grid styles, and axis labels. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-003 | Profiles > Multiple Profile Views | The system shall support creating multiple consecutive profile views with station range splitting. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-004 | Profiles > Profile Style | The system shall support switching profile styles to change the visual representation of profiles (line weight, color, linetype). | Trace-to-Spec-v1 | Not implemented |
| REQ-12-005 | Profiles > Profile Characteristics | The system shall display profile characteristics (min/max elevation, grades, curve data) for review. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-006 | Profiles > Layout Profiles | The system shall provide Profile Layout Tools to design vertical finished grades with PVIs (vertical points of intersection). | Trace-to-Spec-v1 | Finished design profile heights generated and interpolated at stations in [corridor.ts](../../../packages/domain/src/corridor.ts#L30) & editable in [CorridorDesignerDialog.tsx](../../../apps/web/src/features/survey/CorridorDesignerDialog.tsx) |
| REQ-12-007 | Profiles > Vertical Curves | The system shall support inserting vertical curves (parabolic, circular) at PVIs with specified K-values or curve lengths. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-008 | Profiles > PVI Editing | The system shall support editing PVI station, elevation, and curve parameters in the Profile Entities vista. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-009 | Profiles > Grip Editing | The system shall support grip-based editing of profiles to adjust PVI positions and curve geometry interactively. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-010 | Profiles > PVI Locking | The system shall allow locking PVI horizontal/vertical positions to maintain geometry integrity during edits. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-011 | Profiles > Copy Profile | The system shall support copying profiles and offsetting them vertically to create parallel design profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-012 | Profiles > Design Criteria | The system shall support specifying design criteria files for profiles enforcing minimum K-values, maximum grades, and stopping sight distance. | Trace-to-Spec-v1 | Not implemented |
| REQ-12-013 | Profiles > Design Check Violations | The system shall highlight design check violations in the Profile Entities vista and display warnings for non-compliant grades. | Trace-to-Spec-v1 | Not implemented |

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


