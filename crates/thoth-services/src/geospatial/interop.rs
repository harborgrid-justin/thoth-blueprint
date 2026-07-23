//! GeoJSON <-> Thoth plan-element translation. Port of
//! `services/geospatial/src/interop.ts`.
//!
//! # `PlanElement` is a local, minimal mirror
//!
//! The TS original imports `PlanElement`, `RightOfWay`, and
//! `LandUseCategory` from `@thoth/domain`'s full planning-element
//! hierarchy. That hierarchy is owned by `thoth-planning` (see
//! `thoth-spatial`'s module docs — it deliberately excludes these types),
//! which has not landed yet. [`PlanElement`] here is a local, minimal
//! mirror covering exactly the element kinds this module constructs
//! (parcel, zone, landuse, lot, building, row, tree, spot) — using
//! [`thoth_spatial::Point`]/[`thoth_spatial::Polygon`]/[`thoth_spatial::ElementKind`]
//! for the geometry/kind vocabulary it shares with the rest of the
//! platform. Once `thoth-planning` lands a typed `PlanElement`, this module
//! should be re-pointed at it; the reprojection/translation logic below
//! doesn't change.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use thoth_spatial::{create_id, ElementKind, Point, Polygon};

use super::projections::{reproject_point, reproject_points};
use super::GeospatialError;

/// The designated-purpose categories a land-use area can carry. Mirrors
/// `packages/domain/src/planning/types/landuse.ts`'s `LandUseCategory`
/// union — see that module's docs for why this crate doesn't yet depend on
/// `thoth-planning` directly.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LandUseCategory {
    Residential,
    Commercial,
    MixedUse,
    Civic,
    Industrial,
    Park,
    OpenSpace,
    Agricultural,
    Infrastructure,
    Unassigned,
}

impl Default for LandUseCategory {
    fn default() -> Self {
        Self::Residential
    }
}

/// A legally/conceptually distinct piece of land.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParcelElement {
    pub id: String,
    pub name: String,
    pub layer_id: String,
    pub boundary: Polygon,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub apn: Option<String>,
}

/// An area governed by planning rules.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoneElement {
    pub id: String,
    pub name: String,
    pub layer_id: String,
    pub boundary: Polygon,
    pub designation: String,
    pub allowed_uses: Vec<LandUseCategory>,
    pub max_coverage: f64,
    pub max_far: f64,
    pub max_height: f64,
    pub min_setback: f64,
}

/// The designated purpose of an area.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LandUseElement {
    pub id: String,
    pub name: String,
    pub layer_id: String,
    pub boundary: Polygon,
    pub category: LandUseCategory,
}

/// A subdivided unit intended for a building or use.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LotElement {
    pub id: String,
    pub name: String,
    pub layer_id: String,
    pub boundary: Polygon,
    pub setback: f64,
}

/// A structure represented by a 2D footprint.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildingElement {
    pub id: String,
    pub name: String,
    pub layer_id: String,
    pub boundary: Polygon,
    pub storeys: f64,
    pub height: f64,
    pub dwelling_units: f64,
    #[serde(rename = "use")]
    pub use_: LandUseCategory,
}

/// Land reserved for streets, paths, or utilities. The TS builder stuffs
/// the line's points directly into `boundary` (rather than a `centerline`
/// field) — preserved here exactly, not a mistake introduced by the port.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RightOfWayElement {
    pub id: String,
    pub name: String,
    pub layer_id: String,
    pub boundary: Polygon,
    pub width: f64,
}

/// A single tree/shrub as a point.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeElement {
    pub id: String,
    pub layer_id: String,
    pub position: Point,
    pub species: String,
    pub canopy_radius: f64,
}

/// A surveyed spot elevation / benchmark.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotElement {
    pub id: String,
    pub layer_id: String,
    pub position: Point,
    pub z: f64,
    pub label: String,
}

/// A plan element, tagged by [`ElementKind`]. See the module docs for why
/// this is a local mirror rather than `thoth-planning`'s eventual type.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum PlanElement {
    #[serde(rename = "parcel")]
    Parcel(ParcelElement),
    #[serde(rename = "zone")]
    Zone(ZoneElement),
    #[serde(rename = "landuse")]
    LandUse(LandUseElement),
    #[serde(rename = "lot")]
    Lot(LotElement),
    #[serde(rename = "building")]
    Building(BuildingElement),
    #[serde(rename = "row")]
    RightOfWay(RightOfWayElement),
    #[serde(rename = "tree")]
    Tree(TreeElement),
    #[serde(rename = "spot")]
    Spot(SpotElement),
}

impl PlanElement {
    /// This element's [`ElementKind`] tag.
    pub const fn kind(&self) -> ElementKind {
        match self {
            PlanElement::Parcel(_) => ElementKind::Parcel,
            PlanElement::Zone(_) => ElementKind::Zone,
            PlanElement::LandUse(_) => ElementKind::Landuse,
            PlanElement::Lot(_) => ElementKind::Lot,
            PlanElement::Building(_) => ElementKind::Building,
            PlanElement::RightOfWay(_) => ElementKind::Row,
            PlanElement::Tree(_) => ElementKind::Tree,
            PlanElement::Spot(_) => ElementKind::Spot,
        }
    }

    /// This element's `id`.
    pub fn id(&self) -> &str {
        match self {
            PlanElement::Parcel(e) => &e.id,
            PlanElement::Zone(e) => &e.id,
            PlanElement::LandUse(e) => &e.id,
            PlanElement::Lot(e) => &e.id,
            PlanElement::Building(e) => &e.id,
            PlanElement::RightOfWay(e) => &e.id,
            PlanElement::Tree(e) => &e.id,
            PlanElement::Spot(e) => &e.id,
        }
    }

    /// This element's `layerId`.
    pub fn layer_id(&self) -> &str {
        match self {
            PlanElement::Parcel(e) => &e.layer_id,
            PlanElement::Zone(e) => &e.layer_id,
            PlanElement::LandUse(e) => &e.layer_id,
            PlanElement::Lot(e) => &e.layer_id,
            PlanElement::Building(e) => &e.layer_id,
            PlanElement::RightOfWay(e) => &e.layer_id,
            PlanElement::Tree(e) => &e.layer_id,
            PlanElement::Spot(e) => &e.layer_id,
        }
    }
}

/// A GeoJSON geometry, restricted to the shapes this module translates.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GeoJsonGeometry {
    Point { coordinates: [f64; 2] },
    LineString { coordinates: Vec<[f64; 2]> },
    Polygon { coordinates: Vec<Vec<[f64; 2]>> },
}

/// A single GeoJSON feature.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeoJsonFeature {
    #[serde(default)]
    pub geometry: Option<GeoJsonGeometry>,
    #[serde(default)]
    pub properties: serde_json::Map<String, Value>,
}

/// A GeoJSON `FeatureCollection`, optionally carrying a (legacy, but still
/// common) named CRS.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoJsonFeatureCollection {
    pub features: Vec<GeoJsonFeature>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub crs: Option<Value>,
}

fn prop_str(properties: &serde_json::Map<String, Value>, key: &str) -> Option<String> {
    properties.get(key).and_then(Value::as_str).map(str::to_string)
}

fn prop_f64(properties: &serde_json::Map<String, Value>, key: &str, default: f64) -> f64 {
    properties.get(key).and_then(Value::as_f64).unwrap_or(default)
}

fn kind_from_geometry(geometry: &GeoJsonGeometry) -> &'static str {
    match geometry {
        GeoJsonGeometry::Polygon { .. } => "parcel",
        GeoJsonGeometry::LineString { .. } => "row",
        GeoJsonGeometry::Point { .. } => "tree",
    }
}

fn default_layer_for_kind(kind: &str) -> &'static str {
    match kind {
        "parcel" => "layer-base",
        "zone" => "layer-zoning",
        "landuse" => "layer-landuse",
        "lot" => "layer-lots",
        "building" => "layer-buildings",
        "row" => "layer-row",
        "tree" => "layer-landscape",
        "spot" => "layer-terrain",
        _ => "layer-base",
    }
}

/// Translate a GeoJSON polygon ring's coordinates into `Point`s, dropping a
/// repeated closing vertex if present (GeoJSON rings are explicitly closed;
/// Thoth polygons imply the closing edge).
fn parse_polygon_ring(coords: &[Vec<[f64; 2]>]) -> Vec<Point> {
    let Some(ring) = coords.first() else {
        return Vec::new();
    };
    if ring.is_empty() {
        return Vec::new();
    }
    let first = ring[0];
    let last = ring[ring.len() - 1];
    let limit = if ring.len() > 1 && first == last {
        ring.len() - 1
    } else {
        ring.len()
    };
    ring[..limit].iter().map(|&[x, y]| Point::new(x, y)).collect()
}

fn parse_line_string(coords: &[[f64; 2]]) -> Vec<Point> {
    coords.iter().map(|&[x, y]| Point::new(x, y)).collect()
}

fn build_polygon_element(
    kind: &str,
    name: String,
    layer_id: String,
    boundary: Polygon,
    properties: &serde_json::Map<String, Value>,
) -> PlanElement {
    let id = create_id(&kind.chars().take(4).collect::<String>());
    match kind {
        "zone" => PlanElement::Zone(ZoneElement {
            id,
            name,
            layer_id,
            boundary,
            designation: prop_str(properties, "designation").unwrap_or_else(|| "R-1".to_string()),
            allowed_uses: vec![LandUseCategory::Residential],
            max_coverage: prop_f64(properties, "maxCoverage", 0.4),
            max_far: prop_f64(properties, "maxFar", 0.8),
            max_height: prop_f64(properties, "maxHeight", 10.0),
            min_setback: prop_f64(properties, "minSetback", 3.0),
        }),
        "landuse" => PlanElement::LandUse(LandUseElement {
            id,
            name,
            layer_id,
            boundary,
            category: LandUseCategory::Residential,
        }),
        "lot" => PlanElement::Lot(LotElement {
            id,
            name,
            layer_id,
            boundary,
            setback: prop_f64(properties, "setback", 3.0),
        }),
        "building" => PlanElement::Building(BuildingElement {
            id,
            name,
            layer_id,
            boundary,
            storeys: prop_f64(properties, "storeys", 1.0),
            height: prop_f64(properties, "height", 4.0),
            dwelling_units: prop_f64(properties, "dwellingUnits", 1.0),
            use_: LandUseCategory::Residential,
        }),
        _ => PlanElement::Parcel(ParcelElement {
            id,
            name,
            layer_id,
            boundary,
            apn: prop_str(properties, "apn"),
        }),
    }
}

fn build_line_element(
    kind: &str,
    layer_id: String,
    path: Polygon,
    properties: &serde_json::Map<String, Value>,
) -> PlanElement {
    let id = create_id(&kind.chars().take(4).collect::<String>());
    PlanElement::RightOfWay(RightOfWayElement {
        id,
        name: String::new(),
        layer_id,
        boundary: path,
        width: prop_f64(properties, "width", 20.0),
    })
}

fn build_point_element(
    kind: &str,
    layer_id: String,
    position: Point,
    properties: &serde_json::Map<String, Value>,
) -> PlanElement {
    let id = create_id(&kind.chars().take(4).collect::<String>());
    match kind {
        "spot" => PlanElement::Spot(SpotElement {
            id,
            layer_id,
            position,
            z: prop_f64(properties, "z", 0.0),
            label: prop_str(properties, "label").unwrap_or_else(|| "SP".to_string()),
        }),
        _ => PlanElement::Tree(TreeElement {
            id,
            layer_id,
            position,
            species: prop_str(properties, "species").unwrap_or_else(|| "Deciduous".to_string()),
            canopy_radius: prop_f64(properties, "canopyRadius", 4.0),
        }),
    }
}

/// Translate a GeoJSON `FeatureCollection` into Thoth plan elements,
/// reprojecting every geometry from `source_crs` into `project_crs`.
/// Features with unparseable/degenerate geometry are skipped, matching the
/// TS original's `try`/`catch`-and-warn behavior (this port has no logger
/// to warn to; the count of skipped features is silently smaller than
/// `geojson.features.len()`, exactly as in the TS version once the
/// `console.warn` is set aside).
pub fn geojson_to_elements(
    geojson: &GeoJsonFeatureCollection,
    source_crs: &str,
    project_crs: &str,
) -> Result<Vec<PlanElement>, GeospatialError> {
    let mut elements = Vec::new();

    for feature in &geojson.features {
        let Some(geometry) = &feature.geometry else {
            continue;
        };
        let kind = prop_str(&feature.properties, "kind")
            .unwrap_or_else(|| kind_from_geometry(geometry).to_string());
        let name = prop_str(&feature.properties, "name")
            .unwrap_or_else(|| format!("{} Element", kind.to_uppercase()));
        let layer_id = prop_str(&feature.properties, "layerId")
            .unwrap_or_else(|| default_layer_for_kind(&kind).to_string());

        match geometry {
            GeoJsonGeometry::Polygon { coordinates } => {
                let raw_boundary = parse_polygon_ring(coordinates);
                let boundary = match reproject_points(&raw_boundary, source_crs, project_crs) {
                    Ok(b) => b,
                    Err(_) => continue,
                };
                if boundary.len() < 3 {
                    continue;
                }
                elements.push(build_polygon_element(
                    &kind,
                    name,
                    layer_id,
                    boundary,
                    &feature.properties,
                ));
            }
            GeoJsonGeometry::LineString { coordinates } => {
                let raw_path = parse_line_string(coordinates);
                let path = match reproject_points(&raw_path, source_crs, project_crs) {
                    Ok(p) => p,
                    Err(_) => continue,
                };
                if path.len() < 2 {
                    continue;
                }
                elements.push(build_line_element(&kind, layer_id, path, &feature.properties));
            }
            GeoJsonGeometry::Point { coordinates } => {
                let position = match reproject_point(
                    Point::new(coordinates[0], coordinates[1]),
                    source_crs,
                    project_crs,
                ) {
                    Ok(p) => p,
                    Err(_) => continue,
                };
                elements.push(build_point_element(&kind, layer_id, position, &feature.properties));
            }
        }
    }

    Ok(elements)
}

fn element_kind_str(kind: ElementKind) -> &'static str {
    match kind {
        ElementKind::Region => "region",
        ElementKind::Parcel => "parcel",
        ElementKind::Block => "block",
        ElementKind::Lot => "lot",
        ElementKind::Zone => "zone",
        ElementKind::Landuse => "landuse",
        ElementKind::Building => "building",
        ElementKind::Row => "row",
        ElementKind::Easement => "easement",
        ElementKind::Openspace => "openspace",
        ElementKind::Water => "water",
        ElementKind::Planting => "planting",
        ElementKind::Grade => "grade",
        ElementKind::Tree => "tree",
        ElementKind::Spot => "spot",
        ElementKind::Note => "note",
        ElementKind::Stair => "stair",
        ElementKind::Curtainwall => "curtainwall",
        ElementKind::Door => "door",
        ElementKind::Window => "window",
        ElementKind::Roof => "roof",
    }
}

/// Translate Thoth plan elements back into a GeoJSON `FeatureCollection`,
/// reprojecting every geometry from `project_crs` into `target_crs`.
pub fn elements_to_geojson(
    elements: &[PlanElement],
    project_crs: &str,
    target_crs: &str,
) -> Result<GeoJsonFeatureCollection, GeospatialError> {
    let mut features = Vec::new();

    for element in elements {
        let mut properties = serde_json::Map::new();
        properties.insert("id".to_string(), Value::String(element.id().to_string()));
        properties.insert(
            "kind".to_string(),
            Value::String(element_kind_str(element.kind()).to_string()),
        );
        properties.insert("layerId".to_string(), Value::String(element.layer_id().to_string()));

        let geometry = match element {
            PlanElement::Parcel(e) => {
                properties.insert("name".to_string(), Value::String(e.name.clone()));
                if let Some(apn) = &e.apn {
                    properties.insert("apn".to_string(), Value::String(apn.clone()));
                }
                Some(polygon_geometry(&e.boundary, project_crs, target_crs)?)
            }
            PlanElement::Zone(e) => {
                properties.insert("name".to_string(), Value::String(e.name.clone()));
                properties.insert("designation".to_string(), Value::String(e.designation.clone()));
                properties.insert(
                    "maxCoverage".to_string(),
                    serde_json::json!(e.max_coverage),
                );
                properties.insert("maxFar".to_string(), serde_json::json!(e.max_far));
                Some(polygon_geometry(&e.boundary, project_crs, target_crs)?)
            }
            PlanElement::LandUse(e) => {
                properties.insert("name".to_string(), Value::String(e.name.clone()));
                properties.insert("category".to_string(), serde_json::json!(e.category));
                Some(polygon_geometry(&e.boundary, project_crs, target_crs)?)
            }
            PlanElement::Lot(e) => {
                properties.insert("name".to_string(), Value::String(e.name.clone()));
                Some(polygon_geometry(&e.boundary, project_crs, target_crs)?)
            }
            PlanElement::Building(e) => {
                properties.insert("name".to_string(), Value::String(e.name.clone()));
                properties.insert("storeys".to_string(), serde_json::json!(e.storeys));
                properties.insert("use".to_string(), serde_json::json!(e.use_));
                Some(polygon_geometry(&e.boundary, project_crs, target_crs)?)
            }
            PlanElement::RightOfWay(e) => {
                properties.insert("name".to_string(), Value::String(e.name.clone()));
                Some(polygon_geometry(&e.boundary, project_crs, target_crs)?)
            }
            PlanElement::Tree(e) => {
                let pos = reproject_point(e.position, project_crs, target_crs)?;
                Some(GeoJsonGeometry::Point {
                    coordinates: [pos.x, pos.y],
                })
            }
            PlanElement::Spot(e) => {
                properties.insert("z".to_string(), serde_json::json!(e.z));
                let pos = reproject_point(e.position, project_crs, target_crs)?;
                Some(GeoJsonGeometry::Point {
                    coordinates: [pos.x, pos.y],
                })
            }
        };

        if let Some(geometry) = geometry {
            features.push(GeoJsonFeature {
                geometry: Some(geometry),
                properties,
            });
        }
    }

    Ok(GeoJsonFeatureCollection {
        features,
        crs: Some(serde_json::json!({
            "type": "name",
            "properties": { "name": format!("urn:ogc:def:crs:OGC:1.3:{target_crs}") }
        })),
    })
}

/// Reproject a boundary and close the ring (GeoJSON polygons repeat their
/// first vertex as their last).
fn polygon_geometry(
    boundary: &Polygon,
    project_crs: &str,
    target_crs: &str,
) -> Result<GeoJsonGeometry, GeospatialError> {
    let reprojected = reproject_points(boundary, project_crs, target_crs)?;
    let mut ring: Vec<[f64; 2]> = reprojected.iter().map(|p| [p.x, p.y]).collect();
    if let Some(&first) = ring.first() {
        ring.push(first);
    }
    Ok(GeoJsonGeometry::Polygon { coordinates: vec![ring] })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_a_geojson_polygon_to_a_parcel_element() {
        let geojson = GeoJsonFeatureCollection {
            features: vec![GeoJsonFeature {
                geometry: Some(GeoJsonGeometry::Polygon {
                    coordinates: vec![vec![
                        [-122.4, 37.7],
                        [-122.3, 37.7],
                        [-122.3, 37.8],
                        [-122.4, 37.8],
                        [-122.4, 37.7],
                    ]],
                }),
                properties: serde_json::json!({
                    "kind": "parcel",
                    "name": "San Francisco Block A",
                    "apn": "999-88-77",
                })
                .as_object()
                .unwrap()
                .clone(),
            }],
            crs: None,
        };

        let elements = geojson_to_elements(&geojson, "EPSG:4326", "EPSG:3857").unwrap();
        assert_eq!(elements.len(), 1);

        let PlanElement::Parcel(parcel) = &elements[0] else {
            panic!("expected a parcel element");
        };
        assert_eq!(parcel.name, "San Francisco Block A");
        assert_eq!(parcel.apn.as_deref(), Some("999-88-77"));
        assert_eq!(parcel.boundary.len(), 4); // duplicate end point removed

        let first = parcel.boundary[0];
        assert!((first.x - (-13_625_505.7)).abs() < 0.5);
        assert!((first.y - 4_537_132.1).abs() < 0.5);
    }

    #[test]
    fn exports_thoth_elements_to_a_geojson_feature_collection() {
        let elements = vec![PlanElement::Parcel(ParcelElement {
            id: "proj-123".to_string(),
            name: "SF Test Parcel".to_string(),
            layer_id: "layer-base".to_string(),
            boundary: vec![
                Point::new(-13_625_460.3, 4_537_845.5),
                Point::new(-13_614_328.7, 4_537_845.5),
                Point::new(-13_614_328.7, 4_551_877.8),
                Point::new(-13_625_460.3, 4_551_877.8),
            ],
            apn: Some("111-22-33".to_string()),
        })];

        let geojson = elements_to_geojson(&elements, "EPSG:3857", "EPSG:4326").unwrap();
        assert_eq!(geojson.features.len(), 1);

        let feature = &geojson.features[0];
        assert_eq!(feature.properties.get("kind").unwrap(), "parcel");
        assert_eq!(feature.properties.get("name").unwrap(), "SF Test Parcel");
        assert_eq!(feature.properties.get("apn").unwrap(), "111-22-33");

        let GeoJsonGeometry::Polygon { coordinates } = feature.geometry.as_ref().unwrap() else {
            panic!("expected a polygon geometry");
        };
        assert_eq!(coordinates[0].len(), 5); // repeated end point closes the ring
        let [x, y] = coordinates[0][0];
        assert!((x - (-122.4)).abs() < 0.01);
        assert!((y - 37.705).abs() < 0.001);
    }

    #[test]
    fn skips_polygon_features_with_fewer_than_three_vertices() {
        let geojson = GeoJsonFeatureCollection {
            features: vec![GeoJsonFeature {
                geometry: Some(GeoJsonGeometry::Polygon {
                    coordinates: vec![vec![[-122.4, 37.7], [-122.3, 37.7]]],
                }),
                properties: serde_json::Map::new(),
            }],
            crs: None,
        };
        let elements = geojson_to_elements(&geojson, "EPSG:4326", "EPSG:4326").unwrap();
        assert_eq!(elements.len(), 0);
    }

    #[test]
    fn translates_a_point_feature_to_a_tree_by_default() {
        let geojson = GeoJsonFeatureCollection {
            features: vec![GeoJsonFeature {
                geometry: Some(GeoJsonGeometry::Point {
                    coordinates: [-122.4, 37.7],
                }),
                properties: serde_json::Map::new(),
            }],
            crs: None,
        };
        let elements = geojson_to_elements(&geojson, "EPSG:4326", "EPSG:4326").unwrap();
        assert_eq!(elements.len(), 1);
        assert!(matches!(elements[0], PlanElement::Tree(_)));
    }
}
