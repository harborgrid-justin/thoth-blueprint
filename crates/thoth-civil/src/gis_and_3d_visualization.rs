//! Surface modeling, GIS import/export & 3D visualization — REQ-096 through
//! REQ-100, REQ-161 through REQ-169.
//!
//! Port of `packages/domain/src/civil/gisAnd3DVisualization.ts`. The TS
//! source's dependencies are all local to `thoth-civil`: `FeatureLine`
//! ([`crate::feature_lines_and_grading`]), `Point3D`
//! ([`crate::grading::Point3D`]), `ParcelObject`
//! ([`crate::site_and_parcels`]), and `Point2D`
//! (`thoth_spatial::Point`) — no cross-crate dependency.

use thoth_spatial::Point;

use crate::error::{CivilError, CivilResult};
use crate::feature_lines_and_grading::FeatureLine;
use crate::grading::Point3D;
use crate::site_and_parcels::{ParcelObject, ParcelStyle};

/// REQ-099, REQ-163: the supported aerial-imagery/raster tile zoom range.
pub const MIN_TILE_LEVEL: i32 = 1;
pub const MAX_TILE_LEVEL: i32 = 19;

/// REQ-161: the maximum Cloud Model Builder area.
pub const MAX_MODEL_BUILDER_AREA_SQ_KM: f64 = 200.0;

/// Square feet per square kilometer, used to convert a shoelace-formula
/// area (in the plan's native feet) into REQ-161's square-kilometer limit.
const SQ_FT_PER_SQ_KM: f64 = 10_763_910.4;

/// One TIN breakline record: a feature line plus its mid-ordinate
/// tessellation distance.
#[derive(Debug, Clone, PartialEq)]
pub struct Breakline {
    pub feature_line_id: String,
    pub mid_ordinate_distance_ft: f64,
}

/// A single TIN triangle.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Triangle3D {
    pub p1: Point3D,
    pub p2: Point3D,
    pub p3: Point3D,
}

/// A TIN surface: breaklines plus the resulting triangulation.
#[derive(Debug, Clone, PartialEq)]
pub struct TinSurfaceDefinition {
    pub id: String,
    pub name: String,
    pub breaklines: Vec<Breakline>,
    /// Surface ids, in paste order (last pasted = highest precedence).
    pub pasted_surfaces_precedence: Vec<String>,
    pub triangles: Vec<Triangle3D>,
}

/// A GIS feature attribute value (mirrors the TS `string | number |
/// boolean` union).
#[derive(Debug, Clone, PartialEq)]
pub enum AttributeValue {
    Text(String),
    Number(f64),
    Bool(bool),
}

impl std::fmt::Display for AttributeValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AttributeValue::Text(s) => write!(f, "{s}"),
            AttributeValue::Number(n) => write!(f, "{n}"),
            AttributeValue::Bool(b) => write!(f, "{b}"),
        }
    }
}

/// A single named attribute on a GIS feature.
#[derive(Debug, Clone, PartialEq)]
pub struct GisFeatureAttribute {
    pub name: String,
    pub value: AttributeValue,
}

/// The GIS geometry type a feature record carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GisGeometryType {
    Polygon,
    Polyline,
    Point,
}

/// A single imported GIS feature (GeoJSON feature, SHP record, or SDF
/// attribute row).
#[derive(Debug, Clone, PartialEq)]
pub struct GisFeatureRecord {
    pub id: String,
    pub geometry_type: GisGeometryType,
    pub coordinates: Vec<Point>,
    pub attributes: Vec<GisFeatureAttribute>,
}

/// One row of a GIS attribute table (ordered `name -> value` pairs,
/// preserving import order — the same shape a spreadsheet row has).
pub type AttributeRow = Vec<(String, AttributeValue)>;

/// Result of importing a GIS vector file (REQ-098).
#[derive(Debug, Clone, PartialEq)]
pub struct GisImportResult {
    pub features_count: usize,
    pub generated_parcels: Vec<ParcelObject>,
    pub attribute_table: Vec<AttributeRow>,
}

/// An aerial-imagery basemap provider.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AerialImageryProvider {
    Bing,
    Mapbox,
    Google,
    Custom,
}

/// REQ-099: aerial imagery configuration.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AerialImageryConfig {
    pub provider: AerialImageryProvider,
    pub tile_level: i32,
    pub opacity: f64,
    pub center_latitude: f64,
    pub center_longitude: f64,
    pub zoom_resolution_meters_per_pixel: f64,
}

/// REQ-161, REQ-162, REQ-163, REQ-167: a Cloud Model Builder area request.
#[derive(Debug, Clone, PartialEq)]
pub struct ModelBuilderConfig {
    pub id: String,
    pub name: String,
    pub boundary_polygon: Vec<Point>,
    pub area_sq_km: f64,
    pub raster_tile_level: i32,
    pub convert_to_grid: bool,
}

/// REQ-165, REQ-168: a manual coverage area with forced surface smoothing.
#[derive(Debug, Clone, PartialEq)]
pub struct CoverageAreaConfig {
    pub id: String,
    pub name: String,
    pub boundary: Vec<Point>,
    pub coverage_style: String,
    pub force_surface_smoothing: bool,
    pub elevation_buffer_ft: Option<f64>,
}

/// The geometry type produced by an SDF conversion.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SdfGeometryType {
    Point,
    Polyline,
    Polygon,
}

/// REQ-169: result of converting a point-text file to SDF.
#[derive(Debug, Clone, PartialEq)]
pub struct SdfConversionResult {
    pub sdf_file_name: String,
    pub record_count: usize,
    pub geometry_type: SdfGeometryType,
}

/// REQ-166: result of importing AutoCAD Civil 3D DWG objects.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DwgImportResult {
    pub civil_objects_count: u32,
    pub ignored_standard_linework: bool,
}

/// A Revit (.RVT) model's imported placement.
#[derive(Debug, Clone, PartialEq)]
pub struct RevitModelImport {
    pub id: String,
    pub file_name: String,
    pub navisworks_view_name: String,
    pub insertion_point: Point3D,
    pub scale: f64,
    pub rotation_deg: f64,
    pub view_bounding_box_min: Point3D,
    pub view_bounding_box_max: Point3D,
}

/// REQ-096: add a feature line to a TIN surface as a breakline, deriving
/// tessellation triangles from consecutive point pairs (matching the TS
/// source's simple striping approach — a placeholder for a full Delaunay
/// triangulator).
pub fn add_breakline_to_tin_surface(
    surface: &TinSurfaceDefinition,
    feature_line: &FeatureLine,
    mid_ordinate_distance_ft: f64,
) -> TinSurfaceDefinition {
    let mut breaklines = surface.breaklines.clone();
    breaklines.push(Breakline {
        feature_line_id: feature_line.id.clone(),
        mid_ordinate_distance_ft,
    });

    let mut triangles = surface.triangles.clone();
    let pts = &feature_line.points;
    let mut i = 0;
    while i + 1 < pts.len() {
        let p1 = pts[i];
        let p2 = pts[i + 1];
        let p3 = pts.get(i + 2).copied().unwrap_or(Point3D::new(
            p2.x + 10.0,
            p2.y + 10.0,
            (p1.z + p2.z) / 2.0,
        ));
        triangles.push(Triangle3D { p1, p2, p3 });
        i += 2;
    }

    TinSurfaceDefinition {
        breaklines,
        triangles,
        ..surface.clone()
    }
}

/// REQ-097: combine two surface models via Paste Surface (last pasted =
/// highest precedence).
pub fn paste_surface(
    target_surface: &TinSurfaceDefinition,
    pasted_surface: &TinSurfaceDefinition,
) -> TinSurfaceDefinition {
    let mut updated_precedence: Vec<String> = target_surface
        .pasted_surfaces_precedence
        .iter()
        .filter(|id| *id != &pasted_surface.id)
        .cloned()
        .collect();
    updated_precedence.push(pasted_surface.id.clone());

    let mut combined_triangles = target_surface.triangles.clone();
    combined_triangles.extend(pasted_surface.triangles.iter().copied());

    TinSurfaceDefinition {
        pasted_surfaces_precedence: updated_precedence,
        triangles: combined_triangles,
        ..target_surface.clone()
    }
}

fn json_number(value: &serde_json::Value) -> f64 {
    value.as_f64().unwrap_or(0.0)
}

fn attribute_value_from_json(value: &serde_json::Value) -> AttributeValue {
    match value {
        serde_json::Value::Bool(b) => AttributeValue::Bool(*b),
        serde_json::Value::Number(n) => AttributeValue::Number(n.as_f64().unwrap_or(0.0)),
        other => AttributeValue::Text(
            other
                .as_str()
                .map(str::to_string)
                .unwrap_or_else(|| other.to_string()),
        ),
    }
}

fn parcel_style_gis() -> ParcelStyle {
    ParcelStyle {
        id: "gis-style".to_string(),
        name: "GIS Attribute Style".to_string(),
        boundary_color: "#00AAFF".to_string(),
        linetype: "CONTINUOUS".to_string(),
        layer: "C-PROP-GIS".to_string(),
    }
}

fn parse_geojson_records(parsed: &serde_json::Value) -> Option<Vec<GisFeatureRecord>> {
    if parsed.get("type")?.as_str()? != "FeatureCollection" {
        return None;
    }
    let features = parsed.get("features")?.as_array()?;

    Some(
        features
            .iter()
            .enumerate()
            .map(|(idx, feat)| {
                let coords: Vec<Point> = feat
                    .get("geometry")
                    .and_then(|g| g.get("coordinates"))
                    .and_then(|c| c.get(0))
                    .and_then(|ring| ring.as_array())
                    .map(|ring| {
                        ring.iter()
                            .map(|c| {
                                let arr = c.as_array();
                                let x = arr.and_then(|a| a.first()).map(json_number).unwrap_or(0.0);
                                let y = arr.and_then(|a| a.get(1)).map(json_number).unwrap_or(0.0);
                                Point::new(x, y)
                            })
                            .collect()
                    })
                    .unwrap_or_default();

                let attributes: Vec<GisFeatureAttribute> = feat
                    .get("properties")
                    .and_then(|p| p.as_object())
                    .map(|props| {
                        props
                            .iter()
                            .map(|(k, v)| GisFeatureAttribute {
                                name: k.clone(),
                                value: attribute_value_from_json(v),
                            })
                            .collect()
                    })
                    .unwrap_or_default();

                GisFeatureRecord {
                    id: format!("gis-feat-{}", idx + 1),
                    geometry_type: GisGeometryType::Polygon,
                    coordinates: coords,
                    attributes,
                }
            })
            .collect(),
    )
}

fn parse_csv_records(file_content: &str) -> Vec<GisFeatureRecord> {
    file_content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .enumerate()
        .map(|(idx, line)| {
            let tokens: Vec<&str> = line.split(',').collect();
            let parse = |i: usize, fallback: f64| {
                tokens
                    .get(i)
                    .and_then(|t| t.trim().parse::<f64>().ok())
                    .unwrap_or(fallback)
            };
            let x0 = parse(0, 0.0);
            let y0 = parse(1, 0.0);
            let x1 = parse(2, 100.0);
            let y1 = parse(3, 100.0);

            GisFeatureRecord {
                id: format!("gis-rec-{}", idx + 1),
                geometry_type: GisGeometryType::Polygon,
                coordinates: vec![
                    Point::new(x0, y0),
                    Point::new(x1, y0),
                    Point::new(x1, y1),
                    Point::new(x0, y1),
                ],
                attributes: vec![
                    GisFeatureAttribute {
                        name: "GIS_ID".to_string(),
                        value: AttributeValue::Number((idx + 100) as f64),
                    },
                    GisFeatureAttribute {
                        name: "ZONING".to_string(),
                        value: AttributeValue::Text(
                            tokens
                                .get(4)
                                .map(|t| t.trim().to_string())
                                .unwrap_or_else(|| "R-4".to_string()),
                        ),
                    },
                ],
            }
        })
        .collect()
}

/// REQ-098: parse GIS vector data (GeoJSON, falling back to a delimited
/// attribute-table stream) and convert it into parcel objects.
pub fn import_gis_vector_file(file_content: &str) -> GisImportResult {
    let records = serde_json::from_str::<serde_json::Value>(file_content)
        .ok()
        .as_ref()
        .and_then(parse_geojson_records)
        .unwrap_or_else(|| parse_csv_records(file_content));

    let mut generated_parcels = Vec::new();
    let mut attribute_table = Vec::new();

    for (idx, rec) in records.iter().enumerate() {
        let mut attr_row: AttributeRow = vec![(
            "FEATURE_ID".to_string(),
            AttributeValue::Text(rec.id.clone()),
        )];
        for attr in &rec.attributes {
            attr_row.push((attr.name.clone(), attr.value.clone()));
        }

        if rec.coordinates.len() >= 3 {
            let mut area = 0.0;
            let mut perimeter = 0.0;
            let n = rec.coordinates.len();
            for i in 0..n {
                let c1 = rec.coordinates[i];
                let c2 = rec.coordinates[(i + 1) % n];
                area += c1.x * c2.y - c2.x * c1.y;
                perimeter += thoth_spatial::distance(c1, c2);
            }
            area = (area / 2.0).abs();

            let tax_id = attr_row
                .iter()
                .find(|(name, _)| name == "TAX_ID")
                .or_else(|| attr_row.iter().find(|(name, _)| name == "GIS_ID"))
                .map(|(_, v)| v.to_string())
                .unwrap_or_else(|| format!("TAX-{}", idx + 100));

            generated_parcels.push(ParcelObject {
                id: format!("parcel-{}", rec.id),
                name: format!("GIS Parcel {}", idx + 1),
                number: (idx + 1) as i64,
                site_id: "site-gis".to_string(),
                boundary_vertices: rec.coordinates.clone(),
                arcs: None,
                style: parcel_style_gis(),
                area_sq_ft: area,
                perimeter_ft: perimeter,
                elevation_ft: None,
                address: None,
                tax_id: Some(tax_id),
                user_classification: None,
            });
        }

        attribute_table.push(attr_row);
    }

    GisImportResult {
        features_count: records.len(),
        generated_parcels,
        attribute_table,
    }
}

/// REQ-099: aerial imagery configuration up to Tile Level 19.
pub fn configure_aerial_imagery(
    tile_level: i32,
    center_lat: f64,
    center_lon: f64,
) -> CivilResult<AerialImageryConfig> {
    if !(MIN_TILE_LEVEL..=MAX_TILE_LEVEL).contains(&tile_level) {
        return Err(CivilError::TileLevelOutOfRange { tile_level });
    }

    // Web Mercator ground resolution (meters/pixel) at the given latitude
    // and zoom level.
    let res = (156_543.033_92 * (center_lat.to_radians()).cos()) / 2f64.powi(tile_level);

    Ok(AerialImageryConfig {
        provider: AerialImageryProvider::Mapbox,
        tile_level,
        opacity: 1.0,
        center_latitude: center_lat,
        center_longitude: center_lon,
        zoom_resolution_meters_per_pixel: res,
    })
}

/// REQ-161, REQ-162, REQ-163, REQ-167: create a Cloud Model Builder area,
/// rejecting boundaries under 3 vertices or over
/// [`MAX_MODEL_BUILDER_AREA_SQ_KM`].
pub fn create_model_builder_area(
    name: impl Into<String>,
    boundary_polygon: Vec<Point>,
    raster_tile_level: i32,
    convert_to_grid: bool,
) -> CivilResult<ModelBuilderConfig> {
    if boundary_polygon.len() < 3 {
        return Err(CivilError::DegeneratePolygon {
            count: boundary_polygon.len(),
        });
    }

    let mut area_sq_ft = 0.0;
    let n = boundary_polygon.len();
    for i in 0..n {
        let c1 = boundary_polygon[i];
        let c2 = boundary_polygon[(i + 1) % n];
        area_sq_ft += c1.x * c2.y - c2.x * c1.y;
    }
    let area_sq_km = area_sq_ft.abs() / (2.0 * SQ_FT_PER_SQ_KM);

    if area_sq_km > MAX_MODEL_BUILDER_AREA_SQ_KM {
        return Err(CivilError::AreaLimitExceeded {
            area_sq_km,
            max_sq_km: MAX_MODEL_BUILDER_AREA_SQ_KM,
        });
    }

    Ok(ModelBuilderConfig {
        id: thoth_spatial::create_id("mb"),
        name: name.into(),
        boundary_polygon,
        area_sq_km,
        raster_tile_level,
        convert_to_grid,
    })
}

/// REQ-165, REQ-168: create a manual coverage area with forced surface
/// smoothing.
pub fn create_coverage_area_smoothing(
    name: impl Into<String>,
    boundary: Vec<Point>,
    coverage_style: impl Into<String>,
    force_surface_smoothing: bool,
) -> CoverageAreaConfig {
    CoverageAreaConfig {
        id: thoth_spatial::create_id("cov"),
        name: name.into(),
        boundary,
        coverage_style: coverage_style.into(),
        force_surface_smoothing,
        elevation_buffer_ft: None,
    }
}

/// REQ-169: convert a tree-point text file to Spatial Data File format.
pub fn convert_tree_points_to_sdf(
    tree_point_content: &str,
    output_file_name: impl Into<String>,
) -> SdfConversionResult {
    let record_count = tree_point_content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .count();

    SdfConversionResult {
        sdf_file_name: output_file_name.into(),
        record_count,
        geometry_type: SdfGeometryType::Point,
    }
}

/// REQ-166: import AutoCAD Civil 3D DWG objects. The TS source's file
/// buffer parameter is always ignored (the function returns a fixed
/// object count regardless of content), so it is dropped here rather than
/// carried as dead weight.
pub fn import_civil3d_dwg_objects(ignore_standard_linework: bool) -> DwgImportResult {
    DwgImportResult {
        civil_objects_count: 15,
        ignored_standard_linework: ignore_standard_linework,
    }
}

/// REQ-179, REQ-180: import a Revit (.RVT) model placement, validating the
/// file extension and the Navisworks view-name convention.
pub fn import_revit_model(
    file_name: impl Into<String>,
    navisworks_view_name: impl Into<String>,
    insertion_point: Point3D,
    scale: f64,
    rotation_deg: f64,
) -> CivilResult<RevitModelImport> {
    let file_name = file_name.into();
    let navisworks_view_name = navisworks_view_name.into();

    if !file_name.to_lowercase().ends_with(".rvt") {
        return Err(CivilError::MalformedData {
            format: "RVT filename",
            reason: "must be an Autodesk Revit (.RVT) model file".to_string(),
        });
    }
    if !navisworks_view_name.to_uppercase().starts_with("NAVIS-") {
        return Err(CivilError::MalformedData {
            format: "Navisworks view name",
            reason: "must start with the NAVIS- prefix".to_string(),
        });
    }

    let min = Point3D::new(
        insertion_point.x - 50.0 * scale,
        insertion_point.y - 30.0 * scale,
        insertion_point.z,
    );
    let max = Point3D::new(
        insertion_point.x + 50.0 * scale,
        insertion_point.y + 30.0 * scale,
        insertion_point.z + 35.0 * scale,
    );

    Ok(RevitModelImport {
        id: thoth_spatial::create_id("rvt"),
        file_name,
        navisworks_view_name,
        insertion_point,
        scale,
        rotation_deg,
        view_bounding_box_min: min,
        view_bounding_box_max: max,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::feature_lines_and_grading::create_feature_line;

    fn empty_surface(id: &str) -> TinSurfaceDefinition {
        TinSurfaceDefinition {
            id: id.to_string(),
            name: format!("Surface {id}"),
            breaklines: Vec::new(),
            pasted_surfaces_precedence: Vec::new(),
            triangles: Vec::new(),
        }
    }

    #[test]
    fn add_breakline_to_tin_surface_tessellates_point_pairs() {
        let fl = create_feature_line(
            "site-1",
            "FL",
            vec![
                Point3D::new(0.0, 0.0, 10.0),
                Point3D::new(10.0, 0.0, 10.0),
                Point3D::new(10.0, 10.0, 10.0),
            ],
            &[],
            None,
        )
        .unwrap();

        let surface = add_breakline_to_tin_surface(&empty_surface("s1"), &fl, 0.1);
        assert_eq!(surface.breaklines.len(), 1);
        assert_eq!(surface.triangles.len(), 1);
        assert_eq!(surface.triangles[0].p3.z, 10.0);
    }

    #[test]
    fn paste_surface_merges_triangles_and_reorders_precedence() {
        let mut target = empty_surface("target");
        target.pasted_surfaces_precedence.push("other".to_string());
        let mut pasted = empty_surface("pasted");
        pasted.triangles.push(Triangle3D {
            p1: Point3D::new(0.0, 0.0, 0.0),
            p2: Point3D::new(1.0, 0.0, 0.0),
            p3: Point3D::new(0.0, 1.0, 0.0),
        });

        let merged = paste_surface(&target, &pasted);
        assert_eq!(merged.triangles.len(), 1);
        assert_eq!(merged.pasted_surfaces_precedence, vec!["other", "pasted"]);
    }

    #[test]
    fn import_gis_vector_file_parses_geojson_feature_collection() {
        let geojson = r#"{
            "type": "FeatureCollection",
            "features": [
                {
                    "geometry": { "coordinates": [[[0,0],[100,0],[100,100],[0,100]]] },
                    "properties": { "ZONING": "R-1", "TAX_ID": "T-1" }
                }
            ]
        }"#;
        let result = import_gis_vector_file(geojson);
        assert_eq!(result.features_count, 1);
        assert_eq!(result.generated_parcels.len(), 1);
        assert_eq!(result.generated_parcels[0].area_sq_ft, 10_000.0);
        assert_eq!(result.generated_parcels[0].tax_id, Some("T-1".to_string()));
    }

    #[test]
    fn import_gis_vector_file_falls_back_to_csv_parser() {
        let csv = "0,0,100,100,R-4\n0,0,50,50,R-2";
        let result = import_gis_vector_file(csv);
        assert_eq!(result.features_count, 2);
        assert_eq!(result.generated_parcels.len(), 2);
    }

    #[test]
    fn configure_aerial_imagery_rejects_out_of_range_tile_level() {
        let err = configure_aerial_imagery(25, 38.75, -77.47).unwrap_err();
        assert_eq!(err, CivilError::TileLevelOutOfRange { tile_level: 25 });
    }

    #[test]
    fn configure_aerial_imagery_computes_ground_resolution() {
        let cfg = configure_aerial_imagery(19, 38.75, -77.47).unwrap();
        assert!(cfg.zoom_resolution_meters_per_pixel > 0.0);
        assert!(cfg.zoom_resolution_meters_per_pixel < 1.0);
    }

    #[test]
    fn create_model_builder_area_rejects_undersized_boundary() {
        let err =
            create_model_builder_area("Area", vec![Point::ZERO, Point::new(1.0, 1.0)], 19, false)
                .unwrap_err();
        assert!(matches!(err, CivilError::DegeneratePolygon { count: 2 }));
    }

    #[test]
    fn create_model_builder_area_rejects_over_200_sq_km() {
        // A ~20km x 20km square is well over the 200 sq km cap.
        let side_ft = 20_000.0 * 3.28084;
        let boundary = vec![
            Point::new(0.0, 0.0),
            Point::new(side_ft, 0.0),
            Point::new(side_ft, side_ft),
            Point::new(0.0, side_ft),
        ];
        let err = create_model_builder_area("Huge", boundary, 19, false).unwrap_err();
        assert!(matches!(err, CivilError::AreaLimitExceeded { .. }));
    }

    #[test]
    fn create_model_builder_area_accepts_small_boundary() {
        let boundary = vec![
            Point::new(0.0, 0.0),
            Point::new(1000.0, 0.0),
            Point::new(1000.0, 1000.0),
            Point::new(0.0, 1000.0),
        ];
        let cfg = create_model_builder_area("Small", boundary, 18, true).unwrap();
        assert!(cfg.area_sq_km < MAX_MODEL_BUILDER_AREA_SQ_KM);
        assert!(cfg.convert_to_grid);
    }

    #[test]
    fn convert_tree_points_to_sdf_counts_nonempty_lines() {
        let result = convert_tree_points_to_sdf("1,1\n2,2\n\n3,3", "Trees.sdf");
        assert_eq!(result.record_count, 3);
        assert_eq!(result.geometry_type, SdfGeometryType::Point);
    }

    #[test]
    fn import_civil3d_dwg_objects_reports_fixed_count() {
        let result = import_civil3d_dwg_objects(true);
        assert_eq!(result.civil_objects_count, 15);
        assert!(result.ignored_standard_linework);
    }

    #[test]
    fn import_revit_model_validates_extension_and_view_name() {
        let err = import_revit_model(
            "Model.dwg",
            "NAVIS-3D-EXTERIOR",
            Point3D::new(0.0, 0.0, 0.0),
            1.0,
            0.0,
        )
        .unwrap_err();
        assert!(matches!(err, CivilError::MalformedData { .. }));

        let err = import_revit_model(
            "Model.rvt",
            "BAD-VIEW",
            Point3D::new(0.0, 0.0, 0.0),
            1.0,
            0.0,
        )
        .unwrap_err();
        assert!(matches!(err, CivilError::MalformedData { .. }));
    }

    #[test]
    fn import_revit_model_computes_scaled_bounding_box() {
        let model = import_revit_model(
            "Building.rvt",
            "NAVIS-3D-EXTERIOR",
            Point3D::new(100.0, 100.0, 0.0),
            2.0,
            90.0,
        )
        .unwrap();
        assert_eq!(model.view_bounding_box_min.x, 0.0);
        assert_eq!(model.view_bounding_box_max.x, 200.0);
        assert_eq!(model.view_bounding_box_max.z, 70.0);
    }
}
