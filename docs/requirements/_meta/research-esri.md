<!-- Raw research capture — background, feeds 00-overview/competitive-analysis.md. Not a normative requirements doc. -->
# Research capture — Esri (ArcGIS Urban, ArcGIS Pro/Online, CityEngine)

## ArcGIS Urban
- Measure-as-you-draw building sketching; auto-generated massing; schematic building types; 3D envelopes; revision tracking.
- Zoning plans (scenario-based); zoning as common data model; adjustable FAR, max height, setback, lot coverage; zoning validation.
- Land-use plans (scenario-based); target space-use distribution; capacity vs proposed; space uses with metrics.
- Study areas over multiple lots; lot-level development projects; parcel/lot geometry as massing basis.
- Development project pipeline (digital twin); BIM/3D import; permitting integration; revisions & status.
- Multiple scenarios per plan; scenario comparison; KPIs (households, jobs, population, utility usage); real-time impact insights.
- Web-based 3D (browser); public engagement/feedback; stakeholder 3D viz; web sharing; extensible API; XR.

## ArcGIS Pro + ArcGIS Online
- Parcel Fabric: connected parcel network (polygon/line/point); multiple parcel types; record-driven workflows (plats/deeds/surveys).
- COGO dimensions from legal docs; parcel lineage/history; subdivision generation; least-squares adjustment; gap/overlap detection; topology rules; attribute rules.
- ~6,000 built-in coordinate systems; geographic + projected; horizontal + optional vertical; on-the-fly reprojection; datum transformations; multiple units.
- Feature layers (point/line/polygon), raster, annotation; thematic/custom symbology; 2D and 3D workspaces.
- Snapping (point/endpoint/edge/vertex); measure (distance/area/feature/direction-distance/offset/angle); COGO editing; editor tracking.
- Interop: file/enterprise geodatabases, SQLite/GeoPackage, Shapefile, GeoJSON, KML/KMZ, CAD, GeoTIFF, web feature layers.
- Publish to feature services; web maps/scenes; Dashboards (KPIs); portal-managed access.
- Branch versioning; reconcile/conflict resolution; multiuser concurrent editing.

## CityEngine
- CGA procedural grammar (extrude/split/texture/component-split); rule-based auto-generation; per-building rules; Python scripting.
- Urban rule visualizing zoning: setbacks, sky exposure planes, lot coverage, FAR limits; 3D envelope generation; compliant building generation.
- Dynamic street network generation; block creation; lot/parcel subdivision; interactive street width editing; fence rules.
- Building_From_Footprint (2D→3D); Building_From_OSM; roof shapes; floor counts; facade textures; vegetation/furniture/labels.
- Density metrics (FAR, coverage) rule-driven; scenario variations via layers; comparative analysis; reports/metrics.
- Import: Shapefile, File GDB, GeoJSON, OSM, GeoTIFF, OBJ/FBX/Collada.
- Export: glTF, CityGML, FBX, USD, Alembic, Collada, OBJ, 3DS, KML/KMZ, WebGL scenes, Unreal/Datasmith.
- Georeferenced scenes; layer organization; web scene export; round-trip with ArcGIS Pro/Online.

## Sources
- https://www.esri.com/en-us/arcgis/products/arcgis-urban/overview
- https://doc.arcgis.com/en/urban/latest/get-started/get-started-plans.htm
- https://doc.esri.com/en/arcgis-pro/latest/help/data/parcel-editing/whatisparcelfabric.html
- https://pro.arcgis.com/en/pro-app/latest/help/mapping/properties/coordinate-systems-and-projections.htm
- https://pro.arcgis.com/en/pro-app/latest/help/mapping/navigation/measure.htm
- https://doc.arcgis.com/en/dashboards/latest/get-started/understand-data-sources.htm
- https://doc.arcgis.com/en/cityengine/latest/help/esri-lib-rules.htm
- https://doc.arcgis.com/en/cityengine/latest/get-started/get-started-about-cityengine.htm
