//! LandXML `<Parcels><Parcel><CoordGeom>` — cadastral parcel boundaries.
//!
//! Scope: a `<Parcel name="..." area="..." state="...">` with a
//! `<CoordGeom>` made of `<Line><Start>/<End></Line>` segments (plan-space
//! `x y`, per the parent module's `<CoordGeom>` convention) describing a
//! closed boundary ring. A parcel's assessor/parcel number, when present,
//! round-trips through a nested `<Parcel><Pin>APN</Pin></Parcel>` element
//! (LandXML's own convention for a parcel identification number) into
//! `thoth_planning::elements::Parcel::apn`. On **import**, a `<Curve>`
//! segment is accepted but reduced to its long chord (`<Start>`→`<End>`,
//! ignoring `<Center>`/`radius`) — this crate's [`Parcel`][pcl] boundary type
//! is a plain vertex ring with no bulge-arc metadata, so an exact circular
//! arc cannot be preserved; this is a documented, lossy but explicit
//! approximation, not silent data loss. On **export**, this module only ever
//! emits straight `<Line>` segments (it never emits a `<Curve>` for a
//! parcel), so any parcel this module *writes* round-trips exactly.
//!
//! [pcl]: thoth_planning::elements::Parcel

use thoth_planning::elements::Parcel as PlanningParcel;
use thoth_spatial::{ElementKind, Point, Polygon};

use crate::error::{InteropError, InteropResult};
use crate::xml_tree::{escape_attr, XmlNode};

const FORMAT: &str = "LandXML/Parcels";

/// A cadastral parcel boundary as LandXML represents it.
#[derive(Debug, Clone, PartialEq)]
pub struct LandXmlParcel {
    pub name: String,
    pub area: Option<f64>,
    pub apn: Option<String>,
    pub state: Option<String>,
    /// Closed boundary ring, plan-space; the closing edge is implied (first
    /// point is not repeated), matching `thoth_spatial::Polygon`'s convention.
    pub boundary: Polygon,
}

/// Build the standard identifier this crate gives a parcel imported from
/// LandXML, when the caller doesn't already have one.
pub fn synthetic_parcel_id(name: &str, index: usize) -> String {
    format!("landxml-parcel-{index}-{}", thoth_spatial::slugify(name))
}

/// Convert a LandXML parcel into a `thoth_planning` [`PlanElement`].
///
/// [`PlanElement`]: thoth_planning::PlanElement
pub fn to_plan_element(
    parcel: &LandXmlParcel,
    id: impl Into<String>,
    layer_id: impl Into<String>,
) -> thoth_planning::PlanElement {
    let base = thoth_planning::new_base(
        id,
        ElementKind::Parcel,
        parcel.name.clone(),
        layer_id,
        parcel.boundary.clone(),
    );
    thoth_planning::PlanElement::Parcel(PlanningParcel {
        base,
        apn: parcel.apn.clone(),
    })
}

/// Convert a `thoth_planning` parcel element into a LandXML parcel record.
pub fn from_plan_parcel(
    parcel: &PlanningParcel,
    area: Option<f64>,
    state: Option<&str>,
) -> LandXmlParcel {
    LandXmlParcel {
        name: parcel.base.name.clone(),
        area,
        apn: parcel.apn.clone(),
        state: state.map(str::to_string),
        boundary: parcel.base.boundary.clone(),
    }
}

/// Render the `<Parcels>...</Parcels>` fragment for the given parcels.
pub fn parcels_xml(parcels: &[LandXmlParcel]) -> String {
    let mut out = vec!["  <Parcels>".to_string()];
    for p in parcels {
        let mut open = format!("    <Parcel name=\"{}\"", escape_attr(&p.name));
        if let Some(area) = p.area {
            open.push_str(&format!(" area=\"{area:.4}\""));
        }
        if let Some(state) = &p.state {
            open.push_str(&format!(" state=\"{}\"", escape_attr(state)));
        }
        open.push('>');
        out.push(open);
        if let Some(apn) = &p.apn {
            out.push(format!(
                "      <Pin>{}</Pin>",
                crate::xml_tree::escape_text(apn)
            ));
        }
        out.push("      <CoordGeom>".to_string());
        let n = p.boundary.len();
        for i in 0..n {
            let a = p.boundary[i];
            let b = p.boundary[(i + 1) % n];
            out.push(format!(
                "        <Line><Start>{} {}</Start><End>{} {}</End></Line>",
                super::fmt_coord(a.x),
                super::fmt_coord(a.y),
                super::fmt_coord(b.x),
                super::fmt_coord(b.y),
            ));
        }
        out.push("      </CoordGeom>".to_string());
        out.push("    </Parcel>".to_string());
    }
    out.push("  </Parcels>".to_string());
    out.join("\n")
}

fn parse_xy(text: &str, offset: usize) -> InteropResult<Point> {
    let values: Vec<f64> = text
        .split_whitespace()
        .map(str::parse::<f64>)
        .collect::<Result<_, _>>()
        .map_err(|e| InteropError::Malformed {
            format: FORMAT,
            offset,
            reason: format!("expected \"x y\", got '{text}': {e}"),
        })?;
    if values.len() != 2 {
        return Err(InteropError::Malformed {
            format: FORMAT,
            offset,
            reason: format!("expected exactly 2 coordinate values, got {}", values.len()),
        });
    }
    Ok(Point::new(values[0], values[1]))
}

fn parse_point_child(node: &XmlNode, tag: &str) -> InteropResult<Point> {
    let child = node.child(tag).ok_or_else(|| InteropError::MissingField {
        format: FORMAT,
        what: tag.to_string(),
        offset: node.offset,
    })?;
    parse_xy(child.text_trim(), child.offset)
}

/// Parse a `<Parcels>` element's `<Parcel>` children.
///
/// # Errors
/// [`InteropError::Malformed`] if a `<Line>`/`<Curve>` is missing its
/// `<Start>`/`<End>`, or the boundary resolves to fewer than 3 vertices.
pub fn parse_parcels(parcels_node: &XmlNode) -> InteropResult<Vec<LandXmlParcel>> {
    let mut out = Vec::new();
    for parcel in parcels_node.children_named("Parcel") {
        let name = parcel.attr("name").unwrap_or("Parcel").to_string();
        let area = parcel.attr("area").and_then(|s| s.parse::<f64>().ok());
        let state = parcel.attr("state").map(str::to_string);
        let apn = parcel.child("Pin").map(|n| n.text_trim().to_string());

        let mut boundary: Polygon = Vec::new();
        if let Some(geom) = parcel.child("CoordGeom") {
            for seg in &geom.children {
                match seg.tag.as_str() {
                    "Line" => {
                        let start = parse_point_child(seg, "Start")?;
                        if boundary.last() != Some(&start) {
                            boundary.push(start);
                        }
                    }
                    "Curve" => {
                        // Reduced to its long chord — see module scope doc.
                        let start = parse_point_child(seg, "Start")?;
                        if boundary.last() != Some(&start) {
                            boundary.push(start);
                        }
                    }
                    _ => continue,
                }
            }
        }
        if boundary.len() < 3 {
            return Err(InteropError::Malformed {
                format: FORMAT,
                offset: parcel.offset,
                reason: format!(
                    "parcel '{name}' boundary has only {} vertices (need >= 3)",
                    boundary.len()
                ),
            });
        }

        out.push(LandXmlParcel {
            name,
            area,
            apn,
            state,
            boundary,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn square() -> LandXmlParcel {
        LandXmlParcel {
            name: "Lot 7".to_string(),
            area: Some(2500.0),
            apn: Some("045-12-007".to_string()),
            state: Some("Proposed".to_string()),
            boundary: vec![
                Point::new(0.0, 0.0),
                Point::new(50.0, 0.0),
                Point::new(50.0, 50.0),
                Point::new(0.0, 50.0),
            ],
        }
    }

    #[test]
    fn parcel_round_trips_boundary_apn_and_area() {
        let xml = format!("<Root>{}</Root>", parcels_xml(&[square()]));
        let root = crate::xml_tree::parse_xml_tree("Test", &xml).unwrap();
        let parsed = parse_parcels(root.child("Parcels").unwrap()).unwrap();
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].name, "Lot 7");
        assert_eq!(parsed[0].apn.as_deref(), Some("045-12-007"));
        assert!((parsed[0].area.unwrap() - 2500.0).abs() < 1e-3);
        assert_eq!(parsed[0].boundary.len(), 4);
        for (orig, got) in square().boundary.iter().zip(&parsed[0].boundary) {
            assert!((orig.x - got.x).abs() < 1e-3);
            assert!((orig.y - got.y).abs() < 1e-3);
        }
    }

    #[test]
    fn degenerate_boundary_is_an_error() {
        let xml = r#"<Root><Parcels><Parcel name="bad"><CoordGeom>
            <Line><Start>0 0</Start><End>1 1</End></Line>
        </CoordGeom></Parcel></Parcels></Root>"#;
        let root = crate::xml_tree::parse_xml_tree("Test", xml).unwrap();
        let err = parse_parcels(root.child("Parcels").unwrap()).unwrap_err();
        assert!(matches!(err, InteropError::Malformed { .. }));
    }

    #[test]
    fn plan_element_conversion_round_trips_apn() {
        let el = to_plan_element(&square(), "p1", "layer-1");
        let thoth_planning::PlanElement::Parcel(pp) = &el else {
            panic!("expected Parcel variant");
        };
        assert_eq!(pp.apn.as_deref(), Some("045-12-007"));
        let back = from_plan_parcel(pp, square().area, square().state.as_deref());
        assert_eq!(back.name, "Lot 7");
        assert_eq!(back.apn, square().apn);
    }
}
