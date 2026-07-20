<!-- Raw research capture â€” background, feeds 00-overview/competitive-analysis.md. Not a normative requirements doc. -->
# Research capture â€” CAD & site-design tools

Source: background research agent (AutoCAD/Civil 3D, Bentley OpenSite, Vectorworks Landmark).

## Autodesk AutoCAD & Civil 3D
- 2D/3D DWG entities; blocks with attributes; feature lines; dynamic object-model civil geometry.
- COGO points (number/name/descriptions); survey database (setups, traverses, figures); point groups; field-to-finish.
- Parcel objects with boundaries/topology; creation/editing/sizing; legal-description generation; area & frontage reporting.
- TIN surfaces from points/breaklines/contours; contours, slope/elevation analysis; grading groups; cut/fill volumes.
- Horizontal alignments; vertical profiles; corridor models. Gravity + pressure utility networks.
- Drawing CRS assignment (datums/projections/zones); projection/transformation on import; geolocation.
- Layer organization (ByLayer/ByBlock). Object snaps, precise coordinate entry, inquiry/measure.
- Interop: native DWG, DXF, LandXML import/export, shapefile import, GeoJSON import with CRS selection, ArcGIS Online connectivity.
- Plan production (view frames, match lines); Sheet Set Manager; layouts/viewports/plotting.
- Collaboration: data shortcuts/references, Xrefs, sheet-set subsets. Volumes/quantity takeoff.

## Bentley OpenSite Designer
- Building pad modeling; automated parking-lot layout; sidewalk/driveway/street design; single-family lot layout.
- Auto parcel creation; site yield/feasibility/cost early-stage; risk identification.
- Earthwork optimization engine; constraint-driven grading; retaining walls; cost-optimized solutions.
- Stormwater + sanitary network design; subsurface utilities; plan/profile editing; drainage analytics.
- 3D terrain modeling; design in reality-mesh context; topo import; clash detection.
- Geospatial CRS support; survey/field integration. Machine-guidance outputs; staking reports.
- 3D real-time visualization (LumenRT). Plan/profile sheets. Multi-disciplinary distributed workflows; OpenSite+ AI-assisted.

## Vectorworks Landmark
- Advanced 2D/3D modeling; parametric elements (Marionette); data-rich BIM objects.
- Digital terrain modeling; existing vs proposed site models; slope analysis, spot elevations.
- Cut/fill calculation; spot-elevation grading; pre-development drainage/slope/sun-shade analysis.
- Parametric Hardscape objects (pavement/sidewalks/plazas/paths); material components & depths.
- Plant layout/selection; tree preservation; manufacturer symbol libraries.
- Georeference/geolocate; GIS integration; SHP import/export; Esri partner integration.
- Interop: DWG/DXF (data-rich points), CSV/TXT coordinate import, 3D geometry import; Revit/SketchUp/Rhino exchange.
- Design layers & classes. Multi-user Project Sharing. Rendered plans/sections; AR/VR.
- Construction docs: live sections/elevations, schedules; auto estimates/quantity takeoffs/plant lists/land-use reports.
- Analysis: embodied carbon, biodiversity net gain, urban heat island, permeability, cut/fill, area metrics.

## Cross-tool takeaways
- Shared interchange backbone: DWG/DXF + LandXML near-universal; shapefile/GeoJSON bridge to spatial data.
- Parcels are objects (topology, labels, legal descriptions, area/frontage) â€” validates domain-object approach.
- CRS mandatory: every tool binds geometry to a coordinate system with projection/transform on import.
- Feasibility/yield metrics and land-use/quantity reports point to auto-computed planning metrics as a differentiator.
- Sheet/exhibit production is a core deliverable expectation.
- Grading/earthwork/cut-fill are CAD-engineering â€” candidate for later phases, not early community planning.

## Sources
- https://help.autodesk.com/view/CIV3D/2024/ENU/
- https://damassets.autodesk.net/content/dam/autodesk/www/pdf/Civil_3D_Exam_Objectives_5_23_25.pdf
- https://c3dkb.dot.wi.gov/Content/c3d/data-xchng/data-xchng-xprt-c3d-prcl-to-shpfil.htm
- https://www.autodesk.com/autodesk-university/article/Managing-Your-Sheets-AutoCAD-Sheet-Set-Manager
- https://www.bentley.com/software/opensite-designer/
- https://blog.bentley.com/software/opensite-for-land-developers-site-design-with-topo-import-automated-parking-lot-layout-grading-optimization-and-more/
- https://www.vectorworks.net/en-US/landmark/capabilities
- https://app-help.vectorworks.net/2024/eng/VW2024_Guide/SiteModel1/Foundation__Site_modeling.htm

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

