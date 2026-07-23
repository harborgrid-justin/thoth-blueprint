//! LandXML 1.2 import/export — surfaces (TIN), parcels, pipe networks,
//! points, and alignments.
//!
//! **Coordinate-ordering convention** (read this before touching any XML
//! text in this module): LandXML documents in this crate use two distinct,
//! internally-consistent conventions depending on the element family:
//!
//! - **`<CoordGeom>` families** (`<Line>`/`<Curve>` with `<Start>`/`<End>`/
//!   `<Center>`, used by both [`alignments`] and [`parcels`]) write raw
//!   plan-space `x y` pairs, with no northing/easting swap. This matches
//!   `thoth_civil::alignment::export_alignment_to_land_xml`'s existing,
//!   already-shipped dialect exactly (same attribute names, same station/
//!   radius precision) — seeing `<CoordGeom>` mean one thing in an
//!   `<Alignment>` and something else in a `<Parcel>` within the *same*
//!   document would be a worse outcome than diverging from the nominal
//!   LandXML spec. [`alignments::alignment_coord_geom_xml`] is in fact the
//!   same formatting logic as that existing function, factored out so it can
//!   be embedded in a multi-section document instead of only a
//!   single-alignment root document.
//! - **Point-list families** (`<CgPoint>` in [`points`], `<P>` inside a
//!   surface's `<Pnts>` in [`surfaces`]) write the LandXML-standard
//!   `northing easting [elevation]` order, matching `thoth_survey::CogoPoint`
//!   (which natively stores northing/easting, not x/y) and real-world
//!   LandXML producers/consumers (Civil 3D, Carlson, etc. all expect N E Z
//!   here). [`convert::point_to_northing_easting`] /
//!   [`convert::northing_easting_to_point`] are the single, shared
//!   northing/easting ⇄ plan-`Point` conversion (north = −y, east = +x,
//!   matching `thoth_spatial::geometry::format_coord`'s survey-format
//!   branch) — every module in this crate that needs the conversion calls
//!   through them rather than re-deriving the sign convention.
//!
//! Each submodule documents its own supported element subset precisely; see
//! `crates/thoth-interop/STATUS.md` for the consolidated summary.

pub mod alignments;
pub mod convert;
pub mod parcels;
pub mod pipe_networks;
pub mod points;
pub mod surfaces;

use thoth_spatial::Unit;

use crate::error::InteropResult;
use crate::xml_tree::parse_xml_tree;

pub use alignments::{AlignmentGeometry, CurveRotation, ImportedAlignment};
pub use parcels::LandXmlParcel;
pub use pipe_networks::{PipeNetworkXml, PipeSegment, PipeStructure};
pub use surfaces::{TinFace, TinPoint, TinSurface};

const FORMAT: &str = "LandXML";

/// The LandXML namespace this crate emits and expects.
pub const LAND_XML_NAMESPACE: &str = "http://www.landxml.org/schema/LandXML-1.2";

/// A LandXML export request: whichever sections are non-empty are written.
/// All fields default to empty, so callers construct one with `..Default::default()`.
#[derive(Debug, Clone, Copy)]
pub struct LandXmlExport<'a> {
    pub unit: Unit,
    pub points: &'a [thoth_survey::points::CogoPoint],
    pub surfaces: &'a [TinSurface],
    pub parcels: &'a [LandXmlParcel],
    pub pipe_networks: &'a [PipeNetworkXml],
    /// `(name, start_station, resolved_centerline)` triples — the resolved
    /// form is what `<CoordGeom>` actually encodes; see the module docs for
    /// why alignment import yields [`ImportedAlignment`] rather than the
    /// PI-based `thoth_civil::alignment::HorizontalAlignment`.
    pub alignments: &'a [(&'a str, f64, thoth_civil::alignment::ResolvedAlignment)],
}

impl<'a> Default for LandXmlExport<'a> {
    fn default() -> Self {
        LandXmlExport {
            unit: Unit::Meters,
            points: &[],
            surfaces: &[],
            parcels: &[],
            pipe_networks: &[],
            alignments: &[],
        }
    }
}

/// The result of parsing a LandXML document: every section actually present.
/// Absent sections come back as empty `Vec`s, not an error — a LandXML file
/// need not carry every kind of data.
#[derive(Debug, Clone, Default)]
pub struct LandXmlDocument {
    pub points: Vec<thoth_survey::points::CogoPoint>,
    pub surfaces: Vec<TinSurface>,
    pub parcels: Vec<LandXmlParcel>,
    pub pipe_networks: Vec<PipeNetworkXml>,
    pub alignments: Vec<ImportedAlignment>,
}

fn units_block(unit: Unit) -> String {
    match unit {
        Unit::Meters => {
            r#"  <Units>
    <Metric areaUnit="squareMeter" linearUnit="meter" volumeUnit="cubicMeter" temperatureUnit="celsius" pressureUnit="milliBars"/>
  </Units>"#
                .to_string()
        }
        Unit::Feet => {
            r#"  <Units>
    <Imperial areaUnit="squareFoot" linearUnit="foot" volumeUnit="cubicFoot" temperatureUnit="fahrenheit" pressureUnit="inHg"/>
  </Units>"#
                .to_string()
        }
    }
}

/// Serialize the requested sections into one LandXML 1.2 document.
pub fn write_land_xml(export: &LandXmlExport) -> String {
    let mut sections = vec![units_block(export.unit)];

    if !export.points.is_empty() {
        sections.push(points::points_xml(export.points));
    }
    if !export.surfaces.is_empty() {
        sections.push(surfaces::surfaces_xml(export.surfaces));
    }
    if !export.parcels.is_empty() {
        sections.push(parcels::parcels_xml(export.parcels));
    }
    if !export.pipe_networks.is_empty() {
        sections.push(pipe_networks::pipe_networks_xml(export.pipe_networks));
    }
    if !export.alignments.is_empty() {
        sections.push(alignments::alignments_xml(export.alignments));
    }

    format!(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<LandXML xmlns=\"{}\" version=\"1.2\">\n{}\n</LandXML>",
        LAND_XML_NAMESPACE,
        sections.join("\n")
    )
}

/// Parse a LandXML document, extracting every section this crate supports.
///
/// # Errors
/// [`crate::error::InteropError::Xml`] if the document isn't well-formed;
/// the more specific per-section variants documented on each submodule's
/// parse function if a present section is structurally invalid.
pub fn parse_land_xml(xml: &str) -> InteropResult<LandXmlDocument> {
    let root = parse_xml_tree(FORMAT, xml)?;

    let points = match root.child("Points") {
        Some(node) => points::parse_points(node)?,
        None => Vec::new(),
    };
    let surfaces = match root.child("Surfaces") {
        Some(node) => surfaces::parse_surfaces(node)?,
        None => Vec::new(),
    };
    let parcels = match root.child("Parcels") {
        Some(node) => parcels::parse_parcels(node)?,
        None => Vec::new(),
    };
    let pipe_networks = match root.child("PipeNetworks") {
        Some(node) => pipe_networks::parse_pipe_networks(node)?,
        None => Vec::new(),
    };
    let alignments = match root.child("Alignments") {
        Some(node) => alignments::parse_alignments(node)?,
        None => Vec::new(),
    };

    Ok(LandXmlDocument {
        points,
        surfaces,
        parcels,
        pipe_networks,
        alignments,
    })
}

/// Format a coordinate value with the fixed precision this module's
/// `<CoordGeom>` family uses (matches `thoth_civil::alignment`'s `{:.4}`).
pub(crate) fn fmt_coord(v: f64) -> String {
    format!("{v:.4}")
}

/// Format a station/length value with the fixed precision this module's
/// `<CoordGeom>` family uses (matches `thoth_civil::alignment`'s `{:.3}`).
pub(crate) fn fmt_station(v: f64) -> String {
    format!("{v:.3}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_spatial::Point;

    fn sample_point(n: i64, north: f64, east: f64) -> thoth_survey::points::CogoPoint {
        thoth_survey::points::CogoPoint {
            id: format!("pt-{n}"),
            point_number: n,
            northing: north,
            easting: east,
            elevation: 100.0,
            raw_description: "IPF".to_string(),
            full_description: None,
            point_style: None,
            label_style: None,
            point_group_id: None,
            rgb_color: None,
            classification_tag: None,
        }
    }

    #[test]
    fn empty_export_still_produces_a_valid_document() {
        let export = LandXmlExport::default();
        let xml = write_land_xml(&export);
        let doc = parse_land_xml(&xml).unwrap();
        assert!(doc.points.is_empty());
        assert!(doc.surfaces.is_empty());
    }

    #[test]
    fn full_document_round_trips_every_present_section() {
        let cogo_points = vec![
            sample_point(1, 1000.0, 2000.0),
            sample_point(2, 1010.0, 2005.0),
        ];
        let surface = TinSurface {
            name: "EG".to_string(),
            points: vec![
                TinPoint {
                    id: "1".into(),
                    x: 0.0,
                    y: 0.0,
                    z: 10.0,
                },
                TinPoint {
                    id: "2".into(),
                    x: 10.0,
                    y: 0.0,
                    z: 12.0,
                },
                TinPoint {
                    id: "3".into(),
                    x: 5.0,
                    y: 10.0,
                    z: 11.0,
                },
            ],
            faces: vec![TinFace {
                a: "1".into(),
                b: "2".into(),
                c: "3".into(),
            }],
        };
        let parcel = LandXmlParcel {
            name: "Lot 1".to_string(),
            area: Some(5000.0),
            apn: Some("12-345-678".to_string()),
            state: Some("Proposed".to_string()),
            boundary: vec![
                Point::new(0.0, 0.0),
                Point::new(100.0, 0.0),
                Point::new(100.0, 100.0),
                Point::new(0.0, 100.0),
            ],
        };
        let network = PipeNetworkXml {
            name: "Storm A".to_string(),
            structures: vec![PipeStructure {
                id: "STR1".into(),
                name: "MH-1".into(),
                struct_type: "Manhole".into(),
                position: Point::new(0.0, 0.0),
                rim_elevation: Some(105.0),
                sump_elevation: Some(95.0),
            }],
            pipes: vec![PipeSegment {
                id: "PIPE1".into(),
                name: "Storm-1".into(),
                start_structure: "STR1".into(),
                end_structure: "STR1".into(),
                diameter: Some(0.6),
                start_invert: Some(96.0),
                end_invert: Some(95.5),
            }],
        };

        let alignment = thoth_civil::alignment::HorizontalAlignment::new(
            "a1",
            "Main St",
            vec![
                thoth_civil::alignment::AlignmentPi::simple(Point::new(0.0, 0.0)),
                thoth_civil::alignment::AlignmentPi::simple(Point::new(0.0, -500.0)),
            ],
            0.0,
        );
        let resolved = thoth_civil::alignment::resolve_alignment(&alignment).unwrap();

        let export = LandXmlExport {
            unit: Unit::Meters,
            points: &cogo_points,
            surfaces: std::slice::from_ref(&surface),
            parcels: std::slice::from_ref(&parcel),
            pipe_networks: std::slice::from_ref(&network),
            alignments: &[("Main St", 0.0, resolved)],
        };
        let xml = write_land_xml(&export);
        let doc = parse_land_xml(&xml).unwrap();

        assert_eq!(doc.points.len(), 2);
        assert_eq!(doc.surfaces.len(), 1);
        assert_eq!(doc.parcels.len(), 1);
        assert_eq!(doc.pipe_networks.len(), 1);
        assert_eq!(doc.alignments.len(), 1);
        assert_eq!(doc.parcels[0].apn.as_deref(), Some("12-345-678"));
    }
}
