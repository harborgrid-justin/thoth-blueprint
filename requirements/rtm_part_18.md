# Requirements Traceability Matrix - Part 18
**Subject:** Corridors Tutorials (Chapter 13)
**Coverage:** Basic Corridor, Transition Lanes, Divided Highway, Section Editing, Surfaces, Rendering (Lines 7724–8380)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-18-001 | Corridors > Create Corridor | The system shall build 3D Corridor models by combining a horizontal alignment, vertical profile, and assembly. | Trace-to-Spec-v1 | Extrusion of 3D pavement stations and features modeled in [corridor.ts](../packages/domain/src/corridor.ts#L22) |
| REQ-18-002 | Corridors > Target Mapping | The system shall support mapping subassembly targets to external surfaces (daylight), offset alignments/profiles (widening), polylines, and feature lines. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-003 | Corridors > Set All Targets | The system shall provide a Set All Targets command to assign daylight surfaces, width targets, and elevation targets in bulk. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-004 | Corridors > Transition Lanes | The system shall support creating corridors with transition lanes that target width and elevation from offset alignments and profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-005 | Corridors > Multiple Targets | The system shall use the closest target when multiple width/offset targets exist at a given station. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-006 | Corridors > Divided Highway | The system shall support creating divided highway corridors with depressed medians, inside shoulders, and independent lane assemblies. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-007 | Corridors > Corridor Regions | The system shall support creating multiple corridor regions with different assemblies, baselines, and target configurations. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-008 | Corridors > Add Region | The system shall support adding corridor regions to existing corridors for intersection and multi-baseline modeling. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-009 | Corridors > Section Editor | The system shall feature a Section Editor to view corridor cross-sections station-by-station and navigate between stations. | Trace-to-Spec-v1 | Cross-section 2D profile station viewer graphic rendered in [CorridorDesignerDialog.tsx](../apps/web/src/features/survey/CorridorDesignerDialog.tsx#L185-L215) |
| REQ-18-010 | Corridors > Edit Sections | The system shall support editing corridor sections by overriding subassembly parameters at individual stations. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-011 | Corridors > Parameter Overrides | The system shall display overridden parameters in a distinctive color and allow resetting overrides. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-012 | Corridors > Corridor Surfaces | The system shall support creating corridor surfaces (Top, Datum) from corridor link and point codes. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-013 | Corridors > Surface Boundaries | The system shall support adding corridor surface boundaries (interactive or automatic) to limit surface extents. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-014 | Corridors > Render Materials | The system shall support applying render materials to individual corridor links for realistic 3D visualization. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-015 | Corridors > Corridor Properties | The system shall provide a Corridor Properties dialog with tabs for Parameters, Feature Lines, Surfaces, Boundaries, and Slope Patterns. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-016 | Corridors > Rebuild | The system shall support rebuilding corridors to reflect changes in alignment, profile, assembly, or target geometry. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-017 | Corridors > 3D Visualization | The system shall support viewing corridor models in 3D using Object Viewer and visual styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-018 | Corridors > Slope Patterns | The system shall support applying slope patterns to corridor surfaces for visual grading representation. | Trace-to-Spec-v1 | Not implemented |
| REQ-18-019 | Corridors > Feature Line Extraction | The system shall support extracting corridor feature lines (code-based links and points) as independent feature line objects. | Trace-to-Spec-v1 | 3D feature lines extracted and added as independent site spatial elements in [CorridorDesignerDialog.tsx](../apps/web/src/features/survey/CorridorDesignerDialog.tsx#L55-L70) |
| REQ-18-020 | Corridors > Station Frequency | The system shall support configuring corridor station frequency to control how often cross-sections are generated along the alignment. | Trace-to-Spec-v1 | Station interval frequency slider/inputs supported in [CorridorDesignerDialog.tsx](../apps/web/src/features/survey/CorridorDesignerDialog.tsx#L55) |
