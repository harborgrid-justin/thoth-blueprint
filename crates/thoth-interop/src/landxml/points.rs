//! LandXML `<Points><CgPoint>` — standalone COGO point lists.
//!
//! Scope: reads/writes `<CgPoint name="..." desc="...">northing easting
//! elevation</CgPoint>` (the 3-value form only; the LandXML schema also
//! allows a 2-value northing/easting-only form, which this module treats as
//! elevation `0.0` on import and always writes all three values on export).
//! See the parent module's doc comment for why point lists use `N E Z`
//! ordering while `<CoordGeom>` elsewhere in this crate uses `x y`.

use thoth_survey::points::CogoPoint;

use crate::error::{InteropError, InteropResult};
use crate::xml_tree::{escape_attr, XmlNode};

const FORMAT: &str = "LandXML/Points";

/// Render a `<Points>...</Points>` fragment for the given COGO points.
pub fn points_xml(points: &[CogoPoint]) -> String {
    let mut lines = vec!["  <Points>".to_string()];
    for p in points {
        // `CogoPoint` already stores northing/easting directly (no x/y swap
        // needed — see the parent module doc for why point lists use N E Z).
        lines.push(format!(
            "    <CgPoint name=\"{}\" desc=\"{}\">{:.4} {:.4} {:.4}</CgPoint>",
            escape_attr(&p.point_number.to_string()),
            escape_attr(&p.raw_description),
            p.northing,
            p.easting,
            p.elevation
        ));
    }
    lines.push("  </Points>".to_string());
    lines.join("\n")
}

/// Parse a `<Points>` element's `<CgPoint>` children into COGO points.
///
/// # Errors
/// [`InteropError::Malformed`] if a `<CgPoint>` lacks a `name` attribute or
/// its text content isn't 2 or 3 whitespace-separated numbers.
pub fn parse_points(points_node: &XmlNode) -> InteropResult<Vec<CogoPoint>> {
    let mut out = Vec::new();
    for (i, node) in points_node.children_named("CgPoint").enumerate() {
        let name = node
            .attr("name")
            .ok_or_else(|| InteropError::MissingField {
                format: FORMAT,
                what: format!("CgPoint[{i}]/@name"),
                offset: node.offset,
            })?;
        let point_number: i64 = name.parse().unwrap_or(i as i64 + 1);

        let values: Vec<f64> = node
            .text_trim()
            .split_whitespace()
            .map(str::parse::<f64>)
            .collect::<Result<_, _>>()
            .map_err(|e| InteropError::Malformed {
                format: FORMAT,
                offset: node.offset,
                reason: format!("CgPoint '{name}' has non-numeric coordinate text: {e}"),
            })?;
        if values.len() < 2 || values.len() > 3 {
            return Err(InteropError::Malformed {
                format: FORMAT,
                offset: node.offset,
                reason: format!(
                    "CgPoint '{name}' must have 2 (N E) or 3 (N E Z) values, got {}",
                    values.len()
                ),
            });
        }
        let northing = values[0];
        let easting = values[1];
        let elevation = values.get(2).copied().unwrap_or(0.0);

        out.push(CogoPoint {
            id: format!("landxml-{name}"),
            point_number,
            northing,
            easting,
            elevation,
            raw_description: node.attr("desc").unwrap_or("").to_string(),
            full_description: None,
            point_style: None,
            label_style: None,
            point_group_id: None,
            rgb_color: None,
            classification_tag: None,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::xml_tree::parse_xml_tree;

    fn pt(n: i64, north: f64, east: f64, elev: f64, desc: &str) -> CogoPoint {
        CogoPoint {
            id: format!("p{n}"),
            point_number: n,
            northing: north,
            easting: east,
            elevation: elev,
            raw_description: desc.to_string(),
            full_description: None,
            point_style: None,
            label_style: None,
            point_group_id: None,
            rgb_color: None,
            classification_tag: None,
        }
    }

    #[test]
    fn round_trips_northing_easting_elevation_and_description() {
        let points = vec![pt(1, 1000.25, 2000.5, 95.75, "IPF 1/2 rebar")];
        let xml = format!("<Root>{}</Root>", points_xml(&points));
        let root = parse_xml_tree("Test", &xml).unwrap();
        let parsed = parse_points(root.child("Points").unwrap()).unwrap();
        assert_eq!(parsed.len(), 1);
        assert!((parsed[0].northing - 1000.25).abs() < 1e-6);
        assert!((parsed[0].easting - 2000.5).abs() < 1e-6);
        assert!((parsed[0].elevation - 95.75).abs() < 1e-6);
        assert_eq!(parsed[0].point_number, 1);
    }

    #[test]
    fn missing_name_attribute_is_malformed() {
        let xml = r#"<Root><Points><CgPoint desc="x">1 2 3</CgPoint></Points></Root>"#;
        let root = parse_xml_tree("Test", xml).unwrap();
        let err = parse_points(root.child("Points").unwrap()).unwrap_err();
        assert!(matches!(err, InteropError::MissingField { .. }));
    }

    #[test]
    fn non_numeric_coordinates_are_malformed() {
        let xml = r#"<Root><Points><CgPoint name="1">a b c</CgPoint></Points></Root>"#;
        let root = parse_xml_tree("Test", xml).unwrap();
        let err = parse_points(root.child("Points").unwrap()).unwrap_err();
        assert!(matches!(err, InteropError::Malformed { .. }));
    }

    #[test]
    fn two_value_points_default_elevation_to_zero() {
        let xml = r#"<Root><Points><CgPoint name="1">10 20</CgPoint></Points></Root>"#;
        let root = parse_xml_tree("Test", xml).unwrap();
        let parsed = parse_points(root.child("Points").unwrap()).unwrap();
        assert_eq!(parsed[0].elevation, 0.0);
    }
}
