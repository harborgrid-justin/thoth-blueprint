# Requirements Traceability Matrix - Part 21
**Subject:** Material Calculation Tutorials (Chapter 16)
**Coverage:** Earthwork Volumes, Quantity Takeoff, Material Lists, Volume Reports, Mass Haul, Pay Items (Lines 9638â€“10338)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-21-001 | Materials > QTO Criteria | The system shall support reviewing and configuring Quantity Takeoff Criteria that define how materials are mapped to corridor shapes. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L140` (`evaluatePayItemCost`) |
| REQ-21-002 | Materials > Report Settings | The system shall support configuring QTO report settings (XSL stylesheets, report extents, alignment references). | Trace-to-Spec-v1 | `../../../apps/web/src/features/workspace/QtoPanel.tsx` |
| REQ-21-003 | Materials > Material List | The system shall support creating Material Lists that associate corridor sections with QTO criteria for volume computation. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts` |
| REQ-21-004 | Materials > Volume Report | The system shall support generating volume reports (Average End Area, earthwork summary) in HTML/XML formats. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L67` (`averageEndAreaVolume`) |
| REQ-21-005 | Materials > Mass Haul Diagram | The system shall generate Mass Haul Diagrams plotting cumulative cut/fill volumes along an alignment. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L106` (`calculateMassHaul`) |
| REQ-21-006 | Materials > Mass Haul Balancing | The system shall support adding free haul and borrow pit stations to balance mass haul volumes. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L106` (`calculateMassHaul`) |
| REQ-21-007 | Materials > Mass Haul Line Style | The system shall support editing Mass Haul Line styles (color, linetype, line weight). | Trace-to-Spec-v1 | `../../../apps/web/src/features/workspace/QtoPanel.tsx#L143` |
| REQ-21-008 | Materials > Pay Item List | The system shall support loading and navigating Pay Item lists from CSV files with categorized pay item IDs. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L181` (`parsePayItemListCsv`) |
| REQ-21-009 | Materials > Assign Pay Items | The system shall support assigning Pay Item codes to AutoCAD objects (blocks, polylines) for quantity tracking. | Trace-to-Spec-v1 | `../../../apps/web/src/features/workspace/QtoPanel.tsx#L20` (`assignments`) |
| REQ-21-010 | Materials > Assign to Pipe Networks | The system shall support assigning Pay Item codes to Pipe Network parts (pipes and structures). | Trace-to-Spec-v1 | `../../../apps/web/src/features/workspace/QtoPanel.tsx#L20` (`assignments`) |
| REQ-21-011 | Materials > Assign to Corridors | The system shall support assigning Pay Item codes to corridor feature lines and corridor links. | Trace-to-Spec-v1 | `../../../apps/web/src/features/workspace/QtoPanel.tsx#L20` (`assignments`) |
| REQ-21-012 | Materials > QTO Manager | The system shall provide a QTO Manager vista displaying all assigned pay items organized by categories. | Trace-to-Spec-v1 | `../../../apps/web/src/features/workspace/QtoPanel.tsx` |
| REQ-21-013 | Materials > Quantity Reports | The system shall support generating Summary, Detail, and Detailed Count quantity takeoff reports. | Trace-to-Spec-v1 | `../../../apps/web/src/features/workspace/QtoPanel.tsx#L35` (`assignedReports`) |
| REQ-21-014 | Materials > Pay Item Formulas | The system shall allow creating mathematical pay item formulas using object properties (Item Length, Item Area) with functions (TRUNC, ABS). | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L140` (`evaluatePayItemCost` with TRUNC and ABS) |
| REQ-21-015 | Materials > Formula Files | The system shall support saving pay item formulas to external .for files and switching between formula files. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L140` |
| REQ-21-016 | Materials > Custom Pay Item List | The system shall support creating custom Pay Item lists from CSV files with user-defined categories. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L181` (`parsePayItemListCsv`) |
| REQ-21-017 | Materials > Categorization File | The system shall support creating and loading pay item categorization XML files to organize pay items into divisions, groups, and sections. | Trace-to-Spec-v1 | `../../../packages/domain/src/qto.ts#L181` (`parsePayItemListCsv`) |
| REQ-21-018 | Materials > Highlight Pay Items | The system shall support highlighting objects associated with a selected pay item in the drawing. | Trace-to-Spec-v1 | `../../../apps/web/src/features/workspace/QtoPanel.tsx#L187` |

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


