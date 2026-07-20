# Requirements Traceability Matrix - Part 04
**Subject:** Point Cloud Tutorials (Chapter 4)
**Coverage:** Point Cloud Import, Styles, Elevation Ranges, LiDAR Data (Lines 928â€“1086)

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-04-001 | Point Cloud > Create | The system shall allow creating point cloud objects by importing LiDAR scan files (e.g., LAS, RCS format). | Trace-to-Spec-v1 | LiDAR point clouds (XYZ, PTS, PLY, LAS, DXF) parsed in [pointcloud.ts](../../../packages/domain/src/pointcloud.ts#L62) & handled in [pointCloudIo.ts](../../../apps/web/src/features/interop/pointCloudIo.ts#L15) |
| REQ-04-002 | Point Cloud > Bounding Box | The system shall display a bounding box proxy representing point cloud extents to maintain display performance when the point cloud display is toggled off. | Trace-to-Spec-v1 | Point clouds drawn directly when visible. Bounding box proxy managed inside Three.js coordinates boundaries; toggling visibility supported in [interopStore.ts](../../../apps/web/src/store/interopStore.ts#L65) |
| REQ-04-003 | Point Cloud > Styles | The system shall support styling point clouds by single color, classification, elevation ranges, or intensity. | Trace-to-Spec-v1 | Styled with point size, standard materials and vertex colors in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx#L222). Style color ranges are not custom configured in the UI |
| REQ-04-004 | Point Cloud > Elevation Range Display | The system shall support defining elevation range bands and assigning colors to visualize point cloud data vertically. | Trace-to-Spec-v1 | Not implemented |
| REQ-04-005 | Point Cloud > Properties | The system shall display point cloud properties (file path, point count, coordinate extents) in the Properties palette. | Trace-to-Spec-v1 | Point cloud details loaded into memory and listed as toggleable reference overlays in [interopStore.ts](../../../apps/web/src/store/interopStore.ts#L12) & [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx#L152) |
| REQ-04-006 | Point Cloud > Performance | The system shall manage point density and display LOD to maintain performance with large point cloud datasets. | Trace-to-Spec-v1 | standard points rendering in Three.js canvas in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx#L203-L224); no custom LOD density downsampling slider is currently exposed |
| REQ-04-007 | Point Cloud > Style Editor | The system shall provide a Point Cloud Style editor to configure color scheme, point size, and visibility settings. | Trace-to-Spec-v1 | Not implemented |
| REQ-04-008 | Point Cloud > Classification Filtering | The system shall support filtering point cloud display by ASPRS classification codes (e.g. Ground, Vegetation, Building) via style settings to show only desired feature classes. | Trace-to-Spec-v1 | Not implemented |
| REQ-04-009 | Point Cloud > Add to Surface | The system shall support creating TIN surfaces from point cloud data using an Add Points to Surface wizard with region-based extraction options (Object, Window). | Trace-to-Spec-v1 | Supported via "Point cloud -> terrain" import in [ImportExportMenu.tsx](../../../apps/web/src/features/interop/ImportExportMenu.tsx#L73-L83) which extracts points as spot elevations using `pointCloudToSpots` from `@thoth/domain` |
| REQ-04-010 | Point Cloud > Point Density Slider | The system shall provide a Point Density slider to control the maximum number of point cloud points rendered in the visible drawing area for performance management. | Trace-to-Spec-v1 | Not implemented |
| REQ-04-011 | Point Cloud > Surface Rebuild | The system shall support automatic surface rebuilding when the point cloud extraction region is modified (e.g. polygon grip edited). | Trace-to-Spec-v1 | Automatic TIN rebuild runs dynamically when spot elevations or grade regions are mutated in [workspaceStore.ts](../../../apps/web/src/store/workspaceStore.ts#L80-L91) |
| REQ-04-012 | Point Cloud > LIDAR Classification | The system shall support displaying point cloud data by LiDAR Point Classification style with color-coded categories per ASPRS standards. | Trace-to-Spec-v1 | Not implemented |

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


