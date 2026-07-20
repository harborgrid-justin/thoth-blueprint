<!-- Raw research capture â€” background, feeds 00-overview/competitive-analysis.md. Not a normative requirements doc. -->
# Research capture â€” scenario & feasibility tools

Source: background research agent (UrbanFootprint, UrbanSim, Giraffe, TestFit, Modelur, Land F/X).

## UrbanFootprint â€” scenario & land-use planning
- Paint land use directly on the map ("Build Mode"); parcel gridding to subdivide land.
- Density-based land-use "prototypes" (building & place types with defaults); per-acre and per-parcel density.
- Base Canvas of existing conditions (editable); scenarios = increment painted on top.
- Analysis Modules: density (DU & jobs/acre), land consumption, transportation (VMT, mode share); dashboards.

## UrbanSim â€” land-use / transportation simulation
- Parcel-level, block-level, zone-level resolutions; households/jobs as agents.
- Zoning designations with FAR, setbacks, lot coverage, building types, unit density, max heights.
- Scenario comparison; upzoning near transit; feasibility by location/year.
- Forecasts land development, location choice, land values; accessibility/affordability/emissions metrics; feeds travel models.

## Giraffe (giraffe.build) â€” web-based collaborative urban design
- Browser sketching on real-world maps; generative design; real-time 3D massing.
- Searchable data library (zoning, parcels, contours) from hundreds of cities; environmental layers.
- Live metrics: floor area, yield, ratios, height restrictions; solar; conceptual cost/financial KPIs.
- Export GeoJSON, DXF, OBJ, STL, IFC; plugin/data-pack integration.
- Cloud co-authoring; shared workspaces with version control; public engagement.

## TestFit â€” site feasibility / massing solver
- Select sites from parcel/APN or draw from metes and bounds; 2D/3D topography (cut/fill).
- Building setbacks separate from landscape setbacks (buildable envelope vs open space); exclusion zones.
- Built-in zoning data: FAR, DU/acre, parking ratios; generative solver â†’ multiple buildable schemes.
- Real-time takeoffs: unit count, NRSF, efficiency ratio, site coverage, density, FAR, parking ratio, yield on cost.
- Export DXF, SKP, glTF, CSV, PDF; Revit add-in; PDF annotation; deal pipeline tracking.

## Modelur â€” parametric urban design (SketchUp)
- Parametric buildings; one-click massing; interactive 3D zoning (auto-adapt to rules).
- Real-time urban control metrics: FSI/FAR, GSI/site coverage, green/open area, density, parking, at building/block/model levels.
- Custom land-use types; real-time zoning-compliance warnings; masterplan alternatives & phasing.
- GIS import/export (SHP, GeoJSON), DXF, IFC, KMZ, CSV/Excel; OSM context.

## Land F/X â€” site & landscape planning
- Planting/site plans in AutoCAD/SketchUp; cloud plant database; auto scheduling/labeling/error-checking.
- Civil & Survey Manager: Northing/Easting, spot elevations, slope callouts; site/hardscape tools.
- CAD â†” SketchUp round-trip; BIM add-on.

## Cross-tool takeaways
- Parcel-centric generation + paint-on-map land use are core interaction patterns.
- Setbacks split into buildable-envelope vs landscape/open-space is a domain nuance worth modeling.
- Real-time metric panels (FAR/FSI, coverage/GSI, DU/acre, parking, open space, VMT) are table stakes.
- Web-native + cloud collaboration/version control validates the cloud-first thesis.
- Interop baseline: GeoJSON, DXF/DWG, SHP, IFC, glTF/OBJ, KML/KMZ, CSV/PDF; Revit/BIM linkage.

## Sources
- https://urbanfootprint.com/blog/product/introducing-painting-2-0/
- https://help.urbanfootprint.com/methodology-documentation/transportation-analysis
- https://urbanfootprint.com/blog/product/introducing-parcel-gridding/
- https://help.urbanfootprint.com/methodology-documentation/land-consumption-analysis
- https://www.urbansim.com/scenario-modeling
- https://www.psrc.org/our-work/urbansim-parcel-based-land-use-model
- https://www.giraffe.build/
- https://aecmag.com/technology/giraffe-for-urban-planning/
- https://www.testfit.io/product/site-solver
- https://www.testfit.io/product/urban-planner
- https://modelur.com/features/
- https://www.landfx.com/sketchupfeatures

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

