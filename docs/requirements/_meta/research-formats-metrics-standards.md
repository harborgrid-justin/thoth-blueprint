<!-- Raw research capture — background, feeds competitive-analysis, domain/interop/NFR requirements, and the glossary of metrics. Not a normative requirements doc. -->
# Research capture — formats, CRS, metrics, standards

Source: background research agent.

## A. Interoperability formats
- **GeoJSON (RFC 7946)** — JSON vector features; web-native. Standard mandates single CRS: WGS84 lon/lat (OGC:CRS84); lon-then-lat order. No other projection permitted.
- **KML/KMZ** — OGC XML with rich styling & 3D; KMZ zipped. Public exhibits, annotated overlays.
- **Shapefile** — multi-file (`.shp/.dbf/.shx/.prj`); de facto GIS interchange; limits (2GB, 10-char fields, no topology).
- **DXF** — Autodesk open CAD interchange (2D/3D); often lacks georeferencing.
- **DWG** — Autodesk proprietary native CAD; usually project/local coordinates.
- **GeoPackage (OGC)** — self-contained SQLite (vector + raster + attributes); modern shapefile replacement; OGC Simple Feature geometry.
- **CityGML (OGC)** — semantic 3D city models with LOD; urban digital twins.
- **IFC (ISO 16739-1)** — open BIM building schema; building-scale complement to CityGML.
- **LandXML** — civil/survey XML: points, TIN surfaces, alignments, parcels, pipe networks.
- **CSV (lat/long or WKT)** — tabular; no inherent CRS/styling.
- **PDF exhibits** — fixed-layout human-readable plans; GeoPDF embeds georeferencing. Presentation, not editing.
- **GeoTIFF** — georeferenced raster (imagery, DEM).
- **WKT/WKB** — OGC/ISO geometry serialization; geometry-only.
- **OGC Simple Features (ISO 19125)** — the shared geometry model (Point/LineString/Polygon/Multi*/GeometryCollection) underpinning all the above.

## CRS / projection concerns
- **EPSG codes** — registry IDs unambiguously identifying a CRS/datum/projection (e.g., EPSG:4326).
- **WGS84 / EPSG:4326** — geographic lon/lat degrees; GPS-native, GeoJSON-mandated; angular units — NOT suitable for area/distance.
- **Web Mercator / EPSG:3857** — projected meters used by web basemaps; conformal but distorts area badly with latitude — poor for area computation.
- **US State Plane (SPCS)** — zone-based projected, high local accuracy; the CRS most US site plans arrive in.
- **UTM** — global 6° transverse-Mercator zones, meters, low local distortion.
- **Geographic vs projected** — geographic (angular, for storage/interchange) vs projected (planar x/y linear units, required for accurate area/distance/buffering/drafting).
- **Datums (NAD83/NAD27/WGS84)** — mixing datums causes shifts of meters (NAD83↔WGS84) to hundreds of feet (NAD27↔NAD83).
- **Units & scale** — feet vs meters, US survey foot vs international foot; mismatches silently corrupt measurements.
- **Key implication** — area/distance in a geographic or Web-Mercator CRS yields wrong numbers; accurate FAR/coverage/yield require reprojection to an appropriate local projected CRS (State Plane/UTM) with consistent datums.

## B. Standard planning / zoning metrics (formulas)
- **FAR (Floor Area Ratio)** = gross floor area / lot area. Controls bulk/intensity.
- **Lot coverage** = building footprint area / lot area. Height-indifferent; governs open space & stormwater.
- **Density (DU/acre)** = dwelling units / land area (acres); gross or net per code.
- **Impervious Surface Ratio** = impervious area / gross site area. Drives stormwater regulation.
- **GSI (Ground Space Index)** ≡ lot coverage; **FSI (Floor Space Index)** ≡ FAR; **OSR (Open Space Ratio)** = unbuilt ground / total floor area. Regional names for the same measures.
- **Parking ratio** — spaces per DU (e.g., 1.5/unit) or per 1,000 sq ft commercial; stall ~9×18–20 ft.
- **Setbacks (front/side/rear)** — min distance from lot lines; defines buildable envelope.
- **Height / stories limits** — max height/story count from average grade.
- **Lot area/width/frontage minimums** — smallest legal buildable/subdividable parcel.
- **ROW widths** — local ~50–60 ft, collector ~60–80 ft, arterial ~80–120 ft (jurisdiction-varying).
- **Yield (unit count)** — buildable units/lots after density, setbacks, ROW, coverage, open-space constraints. Bottom-line site-plan output.

> Numeric ranges are jurisdiction-specific — treat as configurable defaults, not fixed rules.

## C. Standards for requirements & quality
- **ISO/IEC/IEEE 29148** — requirements engineering across the life cycle; good-requirement characteristics; StRS/SyRS/SRS contents. Authoritative basis for this suite.
- **IEEE 830 (superseded)** — SRS structure & quality attributes; folded into 29148.
- **WCAG 2.2** — web accessibility, POUR principles, levels A/AA/AAA; target AA for workspace & review UI.
- **OWASP ASVS 4.0** — application/API security requirements, levels L1/L2/L3; target L2 for a multi-user cloud platform.
- **OGC Simple Features (ISO 19125)** — geometry object model, WKT/WKB, spatial predicates.
- **GeoJSON RFC 7946** — JSON feature encoding; CRS fixed to WGS84 CRS84, lon-then-lat.

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
