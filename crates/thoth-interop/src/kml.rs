//! KML/KMZ export — a public-engagement-friendly visualization export of a
//! site's elements (Google Earth / most web map viewers can open either
//! directly).
//!
//! Scope: **export only** (this is the gap-analysis item's stated scope —
//! there is no corresponding import requirement). Produces KML 2.2
//! `<Placemark>` elements: closed-boundary `PlanElement`s become
//! `<Polygon>` (with interior holes supported via [`KmlGeometry::Polygon`]'s
//! `holes`), point elements (`Note`/`Tree`/`Spot`) become `<Point>`.
//! `write_kmz` wraps the same KML document in a ZIP container via
//! [`crate::zip_store`] (KMZ is literally "KML in a ZIP with the entry named
//! `doc.kml`" — no additional compression or resource files are added).
//!
//! **Coordinates are written verbatim** as `x` = longitude, `y` = latitude:
//! this module does *not* reproject. KML requires WGS84 lon/lat; a plan's
//! native CRS is whatever `SpatialContext::crs` says (often a projected
//! plan/UTM CRS), so callers must reproject to WGS84 themselves (e.g. via
//! `thoth-services`'s projection utilities, which this crate does not
//! depend on — see CLAUDE.md's boundary note) before calling into this
//! module. Passing un-reprojected plan coordinates will produce a
//! syntactically valid but geographically meaningless KML file.

use thoth_planning::PlanElement;
use thoth_spatial::Point;

use crate::error::InteropResult;
use crate::xml_tree::escape_text;
use crate::zip_store::{write_zip, ZipEntry};

/// A KML placemark's geometry.
#[derive(Debug, Clone, PartialEq)]
pub enum KmlGeometry {
    Point(Point),
    LineString(Vec<Point>),
    /// An outer boundary ring plus zero or more interior hole rings, all in
    /// `(lon, lat)` order (see the module scope doc on the lack of
    /// reprojection).
    Polygon { outer: Vec<Point>, holes: Vec<Vec<Point>> },
}

/// One feature to render in the exported KML/KMZ document.
#[derive(Debug, Clone, PartialEq)]
pub struct KmlPlacemark {
    pub name: String,
    pub description: Option<String>,
    pub geometry: KmlGeometry,
}

/// Convert `PlanElement`s into KML placemarks: every element with a
/// boundary polygon becomes a `Polygon` placemark, every point element
/// (`Note`/`Tree`/`Spot`) becomes a `Point` placemark. Elements are expected
/// to already be in WGS84 lon/lat (see module scope doc).
pub fn plan_elements_to_placemarks(elements: &[&PlanElement]) -> Vec<KmlPlacemark> {
    elements
        .iter()
        .filter_map(|el| match el {
            PlanElement::Note(n) => Some(KmlPlacemark {
                name: "Note".to_string(),
                description: Some(n.text.clone()),
                geometry: KmlGeometry::Point(n.position),
            }),
            PlanElement::Tree(t) => Some(KmlPlacemark {
                name: t.species.clone().unwrap_or_else(|| "Tree".to_string()),
                description: None,
                geometry: KmlGeometry::Point(t.position),
            }),
            PlanElement::Spot(s) => Some(KmlPlacemark {
                name: s.label.clone().unwrap_or_else(|| "Spot elevation".to_string()),
                description: Some(format!("Elevation: {}", s.z)),
                geometry: KmlGeometry::Point(s.position),
            }),
            _ => el.base().map(|base| KmlPlacemark {
                name: base.name.clone(),
                description: None,
                geometry: KmlGeometry::Polygon {
                    outer: base.boundary.clone(),
                    holes: Vec::new(),
                },
            }),
        })
        .collect()
}

fn coordinates_text(points: &[Point], close_ring: bool) -> String {
    let mut coords: Vec<String> = points
        .iter()
        .map(|p| format!("{:.8},{:.8},0", p.x, p.y))
        .collect();
    if close_ring {
        if let Some(first) = points.first() {
            coords.push(format!("{:.8},{:.8},0", first.x, first.y));
        }
    }
    coords.join(" ")
}

fn placemark_xml(p: &KmlPlacemark) -> String {
    let mut out = vec!["  <Placemark>".to_string()];
    out.push(format!("    <name>{}</name>", escape_text(&p.name)));
    if let Some(desc) = &p.description {
        out.push(format!("    <description>{}</description>", escape_text(desc)));
    }
    match &p.geometry {
        KmlGeometry::Point(pt) => {
            out.push("    <Point>".to_string());
            out.push(format!("      <coordinates>{}</coordinates>", coordinates_text(&[*pt], false)));
            out.push("    </Point>".to_string());
        }
        KmlGeometry::LineString(pts) => {
            out.push("    <LineString>".to_string());
            out.push(format!("      <coordinates>{}</coordinates>", coordinates_text(pts, false)));
            out.push("    </LineString>".to_string());
        }
        KmlGeometry::Polygon { outer, holes } => {
            out.push("    <Polygon>".to_string());
            out.push("      <outerBoundaryIs><LinearRing>".to_string());
            out.push(format!("        <coordinates>{}</coordinates>", coordinates_text(outer, true)));
            out.push("      </LinearRing></outerBoundaryIs>".to_string());
            for hole in holes {
                out.push("      <innerBoundaryIs><LinearRing>".to_string());
                out.push(format!("        <coordinates>{}</coordinates>", coordinates_text(hole, true)));
                out.push("      </LinearRing></innerBoundaryIs>".to_string());
            }
            out.push("    </Polygon>".to_string());
        }
    }
    out.push("  </Placemark>".to_string());
    out.join("\n")
}

/// Render a complete KML 2.2 document for the given placemarks.
pub fn write_kml(placemarks: &[KmlPlacemark], document_name: &str) -> String {
    let body: Vec<String> = placemarks.iter().map(placemark_xml).collect();
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n<Document>\n  <name>{}</name>\n{}\n</Document>\n</kml>",
        escape_text(document_name),
        body.join("\n")
    )
}

/// Render a KMZ archive (a ZIP containing `doc.kml`) for the given
/// placemarks.
pub fn write_kmz(placemarks: &[KmlPlacemark], document_name: &str) -> Vec<u8> {
    let kml = write_kml(placemarks, document_name);
    write_zip(&[ZipEntry {
        name: "doc.kml",
        data: kml.as_bytes(),
    }])
}

/// Extract the `doc.kml` text from a KMZ archive, without parsing it — a
/// thin convenience so a caller that already has a KML parser (or just wants
/// to hand the bytes to a viewer) doesn't need to know KMZ is a ZIP file.
///
/// # Errors
/// [`crate::error::InteropError::MissingField`] if the archive has no entry
/// named `doc.kml`; propagates [`crate::zip_store::read_zip`]'s errors for a
/// malformed archive.
pub fn extract_kml_from_kmz(kmz: &[u8]) -> InteropResult<String> {
    let entries = crate::zip_store::read_zip(kmz)?;
    entries
        .into_iter()
        .find(|e| e.name == "doc.kml")
        .map(|e| String::from_utf8_lossy(&e.data).into_owned())
        .ok_or_else(|| crate::error::InteropError::MissingField {
            format: "KMZ",
            what: "doc.kml entry".to_string(),
            offset: 0,
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::xml_tree::parse_xml_tree;
    use thoth_planning::elements::{Parcel, Region};
    use thoth_planning::new_base;
    use thoth_spatial::ElementKind;

    fn square_parcel() -> PlanElement {
        PlanElement::Parcel(Parcel {
            base: new_base(
                "p1",
                ElementKind::Parcel,
                "Lot 1",
                "layer",
                vec![
                    Point::new(-122.0, 37.0),
                    Point::new(-121.9, 37.0),
                    Point::new(-121.9, 37.1),
                    Point::new(-122.0, 37.1),
                ],
            ),
            apn: None,
        })
    }

    /// Read back placemark names/geometry kinds from a KML string, using the
    /// crate's generic XML tree parser — a lightweight verification path
    /// only, not this module's supported import API (see module scope doc).
    fn placemark_geometry_kinds(kml: &str) -> Vec<(String, &'static str)> {
        let root = parse_xml_tree("Test", kml).unwrap();
        let doc = root.child("Document").unwrap();
        doc.children_named("Placemark")
            .map(|p| {
                let name = p.child("name").unwrap().text_trim().to_string();
                let kind = if p.child("Polygon").is_some() {
                    "Polygon"
                } else if p.child("Point").is_some() {
                    "Point"
                } else {
                    "LineString"
                };
                (name, kind)
            })
            .collect()
    }

    #[test]
    fn parcel_becomes_a_polygon_placemark_with_matching_ring() {
        let el = square_parcel();
        let placemarks = plan_elements_to_placemarks(&[&el]);
        assert_eq!(placemarks.len(), 1);
        let kml = write_kml(&placemarks, "Test Site");
        assert!(kml.contains("Lot 1"));
        let kinds = placemark_geometry_kinds(&kml);
        assert_eq!(kinds, vec![("Lot 1".to_string(), "Polygon")]);

        // The ring must close (first coordinate repeated at the end).
        let root = parse_xml_tree("Test", &kml).unwrap();
        let coords = root
            .child("Document")
            .unwrap()
            .child("Placemark")
            .unwrap()
            .child("Polygon")
            .unwrap()
            .child("outerBoundaryIs")
            .unwrap()
            .child("LinearRing")
            .unwrap()
            .child("coordinates")
            .unwrap()
            .text_trim()
            .to_string();
        let tuples: Vec<&str> = coords.split_whitespace().collect();
        assert_eq!(tuples.len(), 5); // 4 vertices + repeated first
        assert_eq!(tuples[0], tuples[4]);
    }

    #[test]
    fn point_elements_become_point_placemarks() {
        let el = PlanElement::Tree(thoth_planning::elements::Tree {
            id: "t1".to_string(),
            kind: ElementKind::Tree,
            layer_id: "layer".to_string(),
            position: Point::new(-122.05, 37.05),
            species: Some("Oak".to_string()),
            canopy_radius: 3.0,
            renovation_status: Default::default(),
        });
        let placemarks = plan_elements_to_placemarks(&[&el]);
        let kml = write_kml(&placemarks, "Trees");
        let kinds = placemark_geometry_kinds(&kml);
        assert_eq!(kinds, vec![("Oak".to_string(), "Point")]);
    }

    #[test]
    fn kmz_round_trips_the_same_kml_bytes() {
        let el = square_parcel();
        let placemarks = plan_elements_to_placemarks(&[&el]);
        let kml = write_kml(&placemarks, "Test Site");
        let kmz = write_kmz(&placemarks, "Test Site");
        let extracted = extract_kml_from_kmz(&kmz).unwrap();
        assert_eq!(extracted, kml);
    }

    #[test]
    fn region_with_no_base_polygon_data_is_skipped_gracefully() {
        // Every spatial PlanElement variant has a base; this just documents
        // that point-kind conversion happens before the generic fallback.
        let el = PlanElement::Region(Region {
            base: new_base("r1", ElementKind::Region, "Region A", "layer", vec![
                Point::new(0.0, 0.0),
                Point::new(1.0, 0.0),
                Point::new(1.0, 1.0),
            ]),
            region_type: None,
        });
        let placemarks = plan_elements_to_placemarks(&[&el]);
        assert_eq!(placemarks.len(), 1);
        assert_eq!(placemarks[0].name, "Region A");
    }
}
