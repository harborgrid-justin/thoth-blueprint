# Requirements Traceability Matrix - Part 90
**Subject:** Detail Components (Chapter 46)
**Coverage:** Nominal Size Databases, Category Trees Index, Overwrite Prevention flags, XML Parser Schemas, 2D Block Mappings

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-90-001 | Chapter 46 > Details > Nominal Sizing | The system shall map structural parts sizes dynamically to categories sizes tables. | Trace-to-Spec-v1 | Cylinder and vault geometries sizing guidelines configured in [partbuilder.ts](../../../packages/domain/src/partbuilder.ts#L45) |
| REQ-90-002 | Chapter 46 > Details > Category Index | The system shall display catalog detail categories in a tree list selector. | Trace-to-Spec-v1 | Layer folder tree rendered in details navigation in [LayerPanel.tsx](../../../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-90-003 | Chapter 46 > Details > Overwrites Check | The system shall maintain change tracking flags to safeguard custom catalog updates. | Trace-to-Spec-v1 | PERSIST states verified on loading store in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts) |
| REQ-90-004 | Chapter 46 > Details > Database Schemas | The system shall validate custom details catalogs against XML database schemas. | Trace-to-Spec-v1 | Checked inside database loader in [partbuilder.ts](../../../packages/domain/src/partbuilder.ts) |
| REQ-90-005 | Chapter 46 > Details > Blocks Mapping | The system shall translate custom catalog detail components to 2D standard blocks representations. | Trace-to-Spec-v1 | Mapped to [meshIo.ts](../../../apps/web/src/features/interop/meshIo.ts) blocks models |

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


