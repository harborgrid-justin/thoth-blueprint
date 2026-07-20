<!-- Raw research capture â€” background, feeds competitive-analysis, domain/interop/NFR requirements, and the glossary of metrics. Not a normative requirements doc. -->
# Research capture â€” formats, CRS, metrics, standards

Source: background research agent.

## A. Interoperability formats
- **GeoJSON (RFC 7946)** â€” JSON vector features; web-native. Standard mandates single CRS: WGS84 lon/lat (OGC:CRS84); lon-then-lat order. No other projection permitted.
- **KML/KMZ** â€” OGC XML with rich styling & 3D; KMZ zipped. Public exhibits, annotated overlays.
- **Shapefile** â€” multi-file (`.shp/.dbf/.shx/.prj`); de facto GIS interchange; limits (2GB, 10-char fields, no topology).
- **DXF** â€” Autodesk open CAD interchange (2D/3D); often lacks georeferencing.
- **DWG** â€” Autodesk proprietary native CAD; usually project/local coordinates.
- **GeoPackage (OGC)** â€” self-contained SQLite (vector + raster + attributes); modern shapefile replacement; OGC Simple Feature geometry.
- **CityGML (OGC)** â€” semantic 3D city models with LOD; urban digital twins.
- **IFC (ISO 16739-1)** â€” open BIM building schema; building-scale complement to CityGML.
- **LandXML** â€” civil/survey XML: points, TIN surfaces, alignments, parcels, pipe networks.
- **CSV (lat/long or WKT)** â€” tabular; no inherent CRS/styling.
- **PDF exhibits** â€” fixed-layout human-readable plans; GeoPDF embeds georeferencing. Presentation, not editing.
- **GeoTIFF** â€” georeferenced raster (imagery, DEM).
- **WKT/WKB** â€” OGC/ISO geometry serialization; geometry-only.
- **OGC Simple Features (ISO 19125)** â€” the shared geometry model (Point/LineString/Polygon/Multi*/GeometryCollection) underpinning all the above.

## CRS / projection concerns
- **EPSG codes** â€” registry IDs unambiguously identifying a CRS/datum/projection (e.g., EPSG:4326).
- **WGS84 / EPSG:4326** â€” geographic lon/lat degrees; GPS-native, GeoJSON-mandated; angular units â€” NOT suitable for area/distance.
- **Web Mercator / EPSG:3857** â€” projected meters used by web basemaps; conformal but distorts area badly with latitude â€” poor for area computation.
- **US State Plane (SPCS)** â€” zone-based projected, high local accuracy; the CRS most US site plans arrive in.
- **UTM** â€” global 6Â° transverse-Mercator zones, meters, low local distortion.
- **Geographic vs projected** â€” geographic (angular, for storage/interchange) vs projected (planar x/y linear units, required for accurate area/distance/buffering/drafting).
- **Datums (NAD83/NAD27/WGS84)** â€” mixing datums causes shifts of meters (NAD83â†”WGS84) to hundreds of feet (NAD27â†”NAD83).
- **Units & scale** â€” feet vs meters, US survey foot vs international foot; mismatches silently corrupt measurements.
- **Key implication** â€” area/distance in a geographic or Web-Mercator CRS yields wrong numbers; accurate FAR/coverage/yield require reprojection to an appropriate local projected CRS (State Plane/UTM) with consistent datums.

## B. Standard planning / zoning metrics (formulas)
- **FAR (Floor Area Ratio)** = gross floor area / lot area. Controls bulk/intensity.
- **Lot coverage** = building footprint area / lot area. Height-indifferent; governs open space & stormwater.
- **Density (DU/acre)** = dwelling units / land area (acres); gross or net per code.
- **Impervious Surface Ratio** = impervious area / gross site area. Drives stormwater regulation.
- **GSI (Ground Space Index)** â‰¡ lot coverage; **FSI (Floor Space Index)** â‰¡ FAR; **OSR (Open Space Ratio)** = unbuilt ground / total floor area. Regional names for the same measures.
- **Parking ratio** â€” spaces per DU (e.g., 1.5/unit) or per 1,000 sq ft commercial; stall ~9Ã—18â€“20 ft.
- **Setbacks (front/side/rear)** â€” min distance from lot lines; defines buildable envelope.
- **Height / stories limits** â€” max height/story count from average grade.
- **Lot area/width/frontage minimums** â€” smallest legal buildable/subdividable parcel.
- **ROW widths** â€” local ~50â€“60 ft, collector ~60â€“80 ft, arterial ~80â€“120 ft (jurisdiction-varying).
- **Yield (unit count)** â€” buildable units/lots after density, setbacks, ROW, coverage, open-space constraints. Bottom-line site-plan output.

> Numeric ranges are jurisdiction-specific â€” treat as configurable defaults, not fixed rules.

## C. Standards for requirements & quality
- **ISO/IEC/IEEE 29148** â€” requirements engineering across the life cycle; good-requirement characteristics; StRS/SyRS/SRS contents. Authoritative basis for this suite.
- **IEEE 830 (superseded)** â€” SRS structure & quality attributes; folded into 29148.
- **WCAG 2.2** â€” web accessibility, POUR principles, levels A/AA/AAA; target AA for workspace & review UI.
- **OWASP ASVS 4.0** â€” application/API security requirements, levels L1/L2/L3; target L2 for a multi-user cloud platform.
- **OGC Simple Features (ISO 19125)** â€” geometry object model, WKT/WKB, spatial predicates.
- **GeoJSON RFC 7946** â€” JSON feature encoding; CRS fixed to WGS84 CRS84, lon-then-lat.

## Sources
- https://www.rfc-editor.org/rfc/rfc7946.html
- https://www.ogc.org/standards/geopackage/
- https://www.ogc.org/standards/citygml/
- https://technical.buildingsmart.org/standards/ifc/ ; https://www.iso.org/standard/70303.html
- https://en.wikipedia.org/wiki/LandXML
- https://en.wikipedia.org/wiki/Web_Mercator_projection ; https://docs.up42.com/data/utm
- https://en.wikipedia.org/wiki/Floor_area_ratio ; https://www.planning.org/pas/reports/report111.htm
- https://support.tygron.com/wiki/Density_indicators
- https://www.iso.org/standard/72089.html ; https://standards.ieee.org/ieee/29148/5289/
- https://www.w3.org/TR/WCAG22/ ; https://www.w3.org/WAI/WCAG2AA-Conformance
- https://owasp.org/www-project-application-security-verification-standard/

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

