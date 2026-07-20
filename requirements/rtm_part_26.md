# Requirements Traceability Matrix - Part 26
**Subject:** Interoperability & LandXML Data (Chapter 5)
**Coverage:** LandXML Import, COGO Points, Surfaces, Parcels Conversion, Schema Validation, Unit Conversions, Surface Clipping, Model Base Extrusion, Contours Generation, Layer Key Defaults, Parcels as Spaces

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-26-001 | Chapter 5 > LandXML > Import | The system shall support importing site design objects using standard LandXML files. | Trace-to-Spec-v1 | File uploads parsing supported inside [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx#L55) |
| REQ-26-002 | Chapter 5 > LandXML > COGO Points | The system shall import COGO (coordinate geometry) point groups from LandXML data. | Trace-to-Spec-v1 | Handled via points list parser logic in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx#L62) |
| REQ-26-003 | Chapter 5 > LandXML > Surfaces | The system shall support importing digital terrain surfaces defined by LandXML TIN models. | Trace-to-Spec-v1 | TIN coordinates parsed dynamically inside [terrain.ts](../packages/domain/src/terrain.ts#L48) |
| REQ-26-004 | Chapter 5 > LandXML > Parcels | The system shall support converting LandXML parcels into polylines or spatial boundaries. | Trace-to-Spec-v1 | Mapped to boundary coordinates in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-26-005 | Chapter 5 > LandXML > Validation | The system shall validate LandXML files schemas on import to confirm version compatibility. | Trace-to-Spec-v1 | Schema validation check evaluated in [ImportExportMenu.tsx](../apps/web/src/features/interop/ImportExportMenu.tsx) |
| REQ-26-006 | Chapter 5 > LandXML > Units | The system shall scale coordinates automatically during import when drawing units differ from the source file. | Trace-to-Spec-v1 | Conversions scaling computed in [spatial.ts](../packages/domain/src/spatial.ts) |
| REQ-26-007 | Chapter 5 > LandXML > Surface Clipping | The system shall support clipping the digital terrain surface model using the boolean union of all imported parcels. | Trace-to-Spec-v1 | Surface clipping algorithms executed inside [terrain.ts](../packages/domain/src/terrain.ts#L344) |
| REQ-26-008 | Chapter 5 > LandXML > Model Base | The system shall support generating a 3D model base extrusion of the surface boundary starting from the lowest terrain point. | Trace-to-Spec-v1 | 3D mesh boundary base generated in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-26-009 | Chapter 5 > LandXML > Contours | The system shall support generating contours from imported surfaces as either 2D Polylines or 3D Slice Objects at a designated vertical spacing. | Trace-to-Spec-v1 | Profile slices and contours generated inside [profile.ts](../packages/domain/src/profile.ts#L45) |
| REQ-26-010 | Chapter 5 > LandXML > Layer Keys | The system shall assign imported LandXML objects to target layer keys (TINN for surfaces, PRCL for parcels, COGO for points, TOPO for contours) by default. | Trace-to-Spec-v1 | Layer styles mapping resolved using [descriptionKeys.ts](../packages/domain/src/descriptionKeys.ts#L22) |
| REQ-26-011 | Chapter 5 > LandXML > Parcels as Spaces | The system shall support importing parcels directly as associative Space objects using a selected space style. | Trace-to-Spec-v1 | Mapped to space instances updates in [workspaceStore.ts](../apps/web/src/store/workspaceStore.ts#L82) |
| REQ-26-012 | Chapter 5 > IFC Interop > Building Components | The system shall support importing building information components (IFC format) as 3D meshes. | Trace-to-Spec-v1 | Rendered via [meshIo.ts](../apps/web/src/features/interop/meshIo.ts#L5) and [Scene3D.tsx](../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-26-013 | Chapter 5 > LandXML > Surface Breaklines | The system shall support adding structural ridge lines to constrain TIN surface triangulation paths. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-014 | Chapter 5 > LandXML > Surface Masks | The system shall support defining hide, show, or outer boundaries to limit surface extents. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-015 | Chapter 5 > LandXML > Color Shading | The system shall support generating color-coded slope and elevation analysis maps on surfaces. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-016 | Chapter 5 > LandXML > Contours Labeling | The system shall support customizable text heights and spacing along contour lines. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-017 | Chapter 5 > LandXML > Volume Comparisons | The system shall support computing volume calculations comparing design and existing surfaces. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-018 | Chapter 5 > LandXML > Slope Indicators | The system shall support plotting surface drainage flow direction vectors. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-019 | Chapter 5 > LandXML > Alignment Imports | The system shall support importing alignment baseline coordinates paths and profiles from LandXML. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-020 | Chapter 5 > LandXML > Watershed Delineation | The system shall support calculating runoff catchments boundaries utilizing surface slope values. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-021 | Chapter 5 > LandXML > Contour Smoothing | The system shall support contour path smoothing utilizing Bezier spline curves interpolation. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-022 | Chapter 5 > LandXML > Elevation Verification | The system shall support running validation audits to check spot elevations relative to design surfaces. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-023 | Chapter 5 > LandXML > Grid Models DEM | The system shall support building terrain surfaces directly from digital elevation model files. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-024 | Chapter 5 > LandXML > Point Groups | The system shall support filtering points lists by description keys to generate surface triangulation point lists. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-025 | Chapter 5 > LandXML > Profiles Extraction | The system shall support extracting vertical profile paths directly from alignments intersecting surfaces. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-026 | Chapter 5 > LandXML > LandXML Export | The system shall support exporting surface design data definitions to LandXML format. | Trace-to-Spec-v1 | Not implemented |
| REQ-26-027 | Chapter 5 > LandXML > Triangulation Overrides | The system shall support manually swapping TIN triangulation edges dynamically on canvas layout. | Trace-to-Spec-v1 | Not implemented |

