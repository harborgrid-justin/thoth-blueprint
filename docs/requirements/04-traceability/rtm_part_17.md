# Requirements Traceability Matrix - Part 17
**Subject:** Corridor Assembly Tutorials (Chapter 12)
**Coverage:** Assembly Creation, Subassemblies, Naming, Conditions, Tool Palettes/Catalogs (Lines 7037â€“7724)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-17-001 | Assemblies > Create Assembly | The system shall support creating assembly baselines that serve as the centerline reference for corridor cross-sections. | Trace-to-Spec-v1 | centerline reference baseline coordinates solved in [corridor.ts](../../../packages/domain/src/corridor.ts) |
| REQ-17-002 | Assemblies > Subassembly Palette | The system shall provide a Tool Palette of standard subassemblies organized by category (Lanes, Curbs, Basic, Shoulders, Medians). | Trace-to-Spec-v1 | Lanes, curbs, sidewalk, and daylight templates modeled in [assembly.ts](../../../packages/domain/src/assembly.ts#L32) and visual palette shown in [CorridorDesignerDialog.tsx](../../../apps/web/src/features/survey/CorridorDesignerDialog.tsx) |
| REQ-17-003 | Assemblies > LaneOutsideSuper | The system shall provide a LaneOutsideSuper subassembly with configurable Side and Width parameters. | Trace-to-Spec-v1 | Configurable lanes with width, slope, and thickness computed in [assembly.ts](../../../packages/domain/src/assembly.ts#L32) |
| REQ-17-004 | Assemblies > UrbanCurbGutterGeneral | The system shall provide an UrbanCurbGutterGeneral subassembly for urban curb and gutter geometry. | Trace-to-Spec-v1 | Curb and gutter general subassembly points resolved in [assembly.ts](../../../packages/domain/src/assembly.ts#L48) |
| REQ-17-005 | Assemblies > Sidewalk | The system shall provide a Sidewalk subassembly with configurable Width, Buffer Width 1, and Buffer Width 2 parameters. | Trace-to-Spec-v1 | Concrete sidewalk subassembly offsets resolved in [assembly.ts](../../../packages/domain/src/assembly.ts#L56) |
| REQ-17-006 | Assemblies > BasicSideSlopeCutDitch | The system shall provide a BasicSideSlopeCutDitch subassembly with configurable Cut Slope and Fill Slope ratios. | Trace-to-Spec-v1 | Daylight projection side slope parameters computed in [assembly.ts](../../../packages/domain/src/assembly.ts#L65) |
| REQ-17-007 | Assemblies > Mirror | The system shall support mirroring subassemblies to the opposite side of the baseline while flipping the Side parameter. | Trace-to-Spec-v1 | Implemented in [mirrorSubassemblies](../../../packages/domain/src/civil/assembly.ts#L93) |
| REQ-17-008 | Assemblies > Marker Points | The system shall display marker/attachment points on subassemblies for connecting adjacent subassemblies. | Trace-to-Spec-v1 | Resolved in [resolveAssemblyOffset](../../../packages/domain/src/civil/assembly.ts#L13) |
| REQ-17-009 | Assemblies > Name Template | The system shall support customizing subassembly naming templates to include side, assembly name, and sequential numbering. | Trace-to-Spec-v1 | Supported in [assembly.ts](../../../packages/domain/src/civil/assembly.ts) |
| REQ-17-010 | Assemblies > Parameters | The system shall support editing subassembly parameters (width, depth, cross slope, slope ratio) numerically in the Properties palette. | Trace-to-Spec-v1 | Parametric lane template widths editable in [CorridorDesignerDialog.tsx](../../../apps/web/src/features/survey/CorridorDesignerDialog.tsx) |
| REQ-17-011 | Assemblies > Conditional Subassemblies | The system shall support subassemblies with IF/ELSE conditions that adapt geometry based on external inputs (e.g. curb on cut side, ditch on fill side). | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L97) |
| REQ-17-012 | Assemblies > ConditionalCutOrFill | The system shall provide a ConditionalCutOrFill subassembly that branches behavior based on whether the corridor is in cut or fill. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L97) |
| REQ-17-013 | Assemblies > Saving to Palette | The system shall support saving custom assemblies to Tool Palettes for reuse across drawings. | Trace-to-Spec-v1 | Displayed in [RoadDesignStudioDialog.tsx](../../../apps/web/src/features/survey/RoadDesignStudioDialog.tsx) |
| REQ-17-014 | Assemblies > Tool Catalogs | The system shall support publishing assemblies to Tool Catalogs (.atc files) and installing them for enterprise sharing. | Trace-to-Spec-v1 | Supported via XML export in [exportAssemblySetToXML](../../../packages/domain/src/civil/assembly.ts#L108) |
| REQ-17-015 | Assemblies > Copy to Catalog | The system shall support copying assemblies from Tool Palettes to Tool Catalogs for centralized management. | Trace-to-Spec-v1 | Supported in [assembly.ts](../../../packages/domain/src/civil/assembly.ts) |
| REQ-17-016 | Assemblies > BasicLaneTransition | The system shall provide a BasicLaneTransition subassembly supporting Hold Grade Change Offset and Change Offset And Elevation modes. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts) |
| REQ-17-017 | Assemblies > BasicCurbAndGutter | The system shall provide a BasicCurbAndGutter subassembly with configurable gutter width. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L43) |
| REQ-17-018 | Assemblies > Assembly Sets | The system shall support importing assembly sets from XML files for standardized corridor configurations. | Trace-to-Spec-v1 | Implemented in [exportAssemblySetToXML](../../../packages/domain/src/civil/assembly.ts#L108) |
| REQ-17-019 | Assemblies > DaylightBench | The system shall provide a DaylightBench subassembly for creating benched fill slopes with configurable bench widths. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L82) |
| REQ-17-020 | Assemblies > DaylightBasin | The system shall provide a DaylightBasin subassembly for creating basin-shaped daylight slopes. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L82) |
| REQ-17-021 | Assemblies > RetainWallVertical | The system shall provide a RetainWallVertical subassembly for modeling vertical retaining walls in deep cut conditions. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L74) |
| REQ-17-022 | Assemblies > LinkWidthAndSlope | The system shall provide a LinkWidthAndSlope subassembly for connecting slopes between corridor elements. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L90) |
| REQ-17-023 | Assemblies > LinkSlopeToSurface | The system shall provide a LinkSlopeToSurface subassembly that slopes from a point to meet an existing surface. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts) |
| REQ-17-024 | Assemblies > LinkOffsetOnSurface | The system shall provide a LinkOffsetOnSurface subassembly that connects at a horizontal offset on the existing surface. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts) |
| REQ-17-025 | Assemblies > Nested Conditionals | The system shall support nested ConditionalCutOrFill subassemblies with multiple levels of IF/ELSE branching based on distance ranges (e.g. Cut 0-5, Cut 5-10000). | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L97) |
| REQ-17-026 | Assemblies > Descriptive Naming | The system shall support renaming subassemblies with descriptive naming conventions (side, condition, parent reference) in the Assembly Properties Construction tab. | Trace-to-Spec-v1 | Supported in [assembly.ts](../../../packages/domain/src/civil/assembly.ts) |
| REQ-17-027 | Assemblies > Subassembly Composer | The system shall support importing custom subassembly files created via the external Subassembly Composer scripting tool. | Trace-to-Spec-v1 | Supported via XML importer in [assembly.ts](../../../packages/domain/src/civil/assembly.ts) |
| REQ-17-028 | Assemblies > Width Transitions | The system shall support linear or smooth transition curves interpolating subassembly widths between corridor stations. | Trace-to-Spec-v1 | Implemented in [corridor.ts](../../../packages/domain/src/civil/corridor.ts) |
| REQ-17-029 | Assemblies > Layout Frequencies | The system shall support setting independent corridor assembly insertion frequencies for straight tangents, curve segments, and spirals. | Trace-to-Spec-v1 | Configured via `frequency` parameter in [corridor.ts](../../../packages/domain/src/civil/corridor.ts#L38) |
| REQ-17-030 | Assemblies > Daylight Solver | The system shall project daylight sloped lines dynamically to intersect with the active digital terrain model surface. | Trace-to-Spec-v1 | Implemented in [corridor.ts](../../../packages/domain/src/civil/corridor.ts#L77) |
| REQ-17-031 | Assemblies > Shrinkwrap Boundaries | The system shall automatically compute closed outer boundary outlines enclosing corridor daylight endpoints for area calculations. | Trace-to-Spec-v1 | Computed in [sections.ts](../../../packages/domain/src/civil/sections.ts#L90) |
| REQ-17-032 | Assemblies > Pavement Volumes QTO | The system shall aggregate QTO volume metrics for multiple subassembly material layers (subbase, base, wear course). | Trace-to-Spec-v1 | Implemented in [calculateEarthworkVolumes](../../../packages/domain/src/civil/sections.ts#L90) |
| REQ-17-033 | Assemblies > Walkthrough Sweeps | The system shall support a 3D animation camera drive-through simulation following alignment baseline paths. | Trace-to-Spec-v1 | Rendered in [RoadDesignStudioDialog.tsx](../../../apps/web/src/features/survey/RoadDesignStudioDialog.tsx) |
| REQ-17-034 | Assemblies > Target Loops | The system shall support branching subassembly behavior based on whether horizontal/vertical targets are detected within station limits. | Trace-to-Spec-v1 | Implemented in [corridor.ts](../../../packages/domain/src/civil/corridor.ts) |
| REQ-17-035 | Assemblies > Medians | The system shall provide depressed and raised median template subassemblies with inside shoulders slope settings. | Trace-to-Spec-v1 | Implemented in [assembly.ts](../../../packages/domain/src/civil/assembly.ts#L64) |
| REQ-17-036 | Assemblies > Surface Rebuilds | The system shall automatically rebuild dependent corridor TIN surfaces when horizontal or vertical profile geometries update. | Trace-to-Spec-v1 | Implemented in [buildCorridorSurfaces](../../../packages/domain/src/civil/corridor.ts#L124) |



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


