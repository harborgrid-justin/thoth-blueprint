# Requirements Traceability Matrix - Part 83
**Subject:** Detail Component Nominal Sizing (Chapter 55, Part 2)
**Coverage:** Nominal Size Selection, Category Explorer, Custom Size Overwrites, XML Validation, 2D Block Mappings

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-83-001 | Chapter 55 > Customizing > Nominal Sizing | The system shall display catalog nominal sizes lists for selecting standard dimension values. | Trace-to-Spec-v1 | Cylinder and vaults dimensions tables stored inside [partbuilder.ts](../../../packages/domain/src/partbuilder.ts#L45) |
| REQ-83-002 | Chapter 55 > Customizing > Explorer | The system shall group details into tree category folders for catalog navigation. | Trace-to-Spec-v1 | Folder trees structured in details library panels in [LayerPanel.tsx](../../../apps/web/src/features/workspace/LayerPanel.tsx) |
| REQ-83-003 | Chapter 55 > Customizing > Overwrite Flags | The system shall prevent overwriting custom user components rows during databases upgrades. | Trace-to-Spec-v1 | Persisted user settings checked on store load in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts) |
| REQ-83-004 | Chapter 55 > Customizing > XML Schema | The system shall validate custom catalog libraries against standard detail XML schemas. | Trace-to-Spec-v1 | Checked during detail DB imports in [partbuilder.ts](../../../packages/domain/src/partbuilder.ts) |
| REQ-83-005 | Chapter 55 > Customizing > Block Mapping | The system shall map custom catalog detail components to 2D standard blocks representations. | Trace-to-Spec-v1 | Block shapes compiled inside mesh libraries in [meshIo.ts](../../../apps/web/src/features/interop/meshIo.ts) |

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


