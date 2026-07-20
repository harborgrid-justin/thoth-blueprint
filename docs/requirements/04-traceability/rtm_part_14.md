# Requirements Traceability Matrix - Part 14
**Subject:** Parcels Tutorials â€” Creation & Subdivision (Chapter 10, Part 1)
**Coverage:** Parcel Creation, Sites, Free-Form Segments, Slide Line, Swing Line, Alignments & Parcels (Lines 5919â€“6185)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-14-001 | Parcels > Create From Objects | The system shall support creating parcel boundaries from closed AutoCAD objects (polylines, lines). | Trace-to-Spec-v1 | Creating parcel/lot boundaries from objects is supported in the data model (a parcel has a boundary polygon), but dynamic auto-subdivision by crossing lines is not implemented |
| REQ-14-002 | Parcels > Sites | The system shall organize parcels within Sites where crossing alignment or parcel boundaries automatically create subdivisions. | Trace-to-Spec-v1 | Parcels are organized as elements in the `Site` model (in [primitives.ts](../../../packages/domain/src/primitives.ts#L250)); dynamic auto-subdivision by intersecting alignments or lines is not implemented |
| REQ-14-003 | Parcels > Creation Tools | The system shall provide a Parcel Layout Tools toolbar with Slide Angle, Slide Direction, Swing Line, and free-form creation tools. | Trace-to-Spec-v1 | Not implemented |
| REQ-14-004 | Parcels > Free-Form Segment | The system shall support subdividing parcels using free-form line segments drawn interactively. | Trace-to-Spec-v1 | Not implemented |
| REQ-14-005 | Parcels > Slide Line | The system shall feature a Slide Line subdivision tool to divide parcels into specific area sizes along a frontage line. | Trace-to-Spec-v1 | Not implemented |
| REQ-14-006 | Parcels > Slide Angle | The system shall support a Slide Angle subdivision tool to create lot lines at a specified angle along a frontage. | Trace-to-Spec-v1 | Not implemented |
| REQ-14-007 | Parcels > Swing Line | The system shall feature a Swing Line subdivision tool to pivot a boundary around a point to divide parcel areas to target sizes. | Trace-to-Spec-v1 | Not implemented |
| REQ-14-008 | Parcels > Sizing Parameters | The system shall support configuring parcel creation sizing parameters (minimum area, frontage, width, depth, maximum depth). | Trace-to-Spec-v1 | Sizing parameters like column/row counts and gap spacings are defined in [rules.ts](../../../packages/domain/src/rules.ts#L29) (`SubdivisionOptions`), but interactive sizing widgets are not implemented |
| REQ-14-009 | Parcels > Remainder Distribution | The system shall support remainder distribution options (Place Remainder In Last Parcel, Redistribute Remainder). | Trace-to-Spec-v1 | Not implemented |
| REQ-14-010 | Parcels > Automatic Mode | The system shall support Automatic subdivision mode that creates multiple lots sequentially along a frontage. | Trace-to-Spec-v1 | Not implemented |
| REQ-14-011 | Parcels > Alignment Interaction | The system shall create new parcels when alignments in a site cross existing parcel boundaries or other alignments. | Trace-to-Spec-v1 | Not implemented |
| REQ-14-012 | Parcels > Move To Site | The system shall support moving alignments between sites (including `<None>`) to control parcel interaction. | Trace-to-Spec-v1 | Not implemented |
| REQ-14-013 | Parcels > Frontage Offset | The system shall support configuring Use Minimum Frontage At Offset with a specified offset distance. | Trace-to-Spec-v1 | Not implemented |

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


