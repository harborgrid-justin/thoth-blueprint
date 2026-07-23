//! LandXML `<Alignments><Alignment><CoordGeom>` — horizontal alignments.
//!
//! **Export** reuses `thoth_civil::alignment::ResolvedAlignment` directly and
//! writes the identical `<Line staStart="...">`/`<Curve staStart="..."
//! rot="cw|ccw" radius="...">` element shapes (same attribute names and
//! numeric precision) as the existing
//! `thoth_civil::alignment::export_alignment_to_land_xml` — this module's
//! [`alignment_coord_geom_xml`] factors out exactly that formatting logic so
//! it can sit alongside other sections in one multi-section document instead
//! of only ever being the sole content of a standalone `<LandXML>` root.
//!
//! **Import** does *not* attempt to reconstruct a PI/radius chain (the form
//! `HorizontalAlignment` needs): a `<CoordGeom>` describes the *resolved*
//! centerline, and infinitely many PI chains can resolve to the same
//! centerline, so reconstructing "the" chain is not a well-posed inverse.
//! Instead, parsing yields [`ImportedAlignment`] — the resolved tangent/curve
//! segments with their stationing, faithful to what the document actually
//! encodes. Does not support spiral transition elements (`<Spiral>`,
//! consistent with `thoth_civil::alignment` itself not constructing them) or
//! super-elevation/profile sub-elements.

use thoth_civil::alignment::AlignmentElement;
use thoth_civil::alignment::{CurveDirection, ResolvedAlignment};
use thoth_spatial::Point;

use crate::error::{InteropError, InteropResult};
use crate::xml_tree::{escape_attr, XmlNode};

const FORMAT: &str = "LandXML/Alignments";

/// Which way an imported curve's arc sweeps (mirrors LandXML's `rot`
/// attribute, `"cw"`/`"ccw"`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurveRotation {
    Clockwise,
    CounterClockwise,
}

/// One resolved geometry segment of an [`ImportedAlignment`].
#[derive(Debug, Clone, PartialEq)]
pub enum AlignmentGeometry {
    Line {
        sta_start: f64,
        start: Point,
        end: Point,
    },
    Curve {
        sta_start: f64,
        start: Point,
        center: Point,
        end: Point,
        radius: f64,
        rotation: CurveRotation,
    },
}

/// An alignment as recovered from a LandXML `<CoordGeom>`: its resolved
/// centerline geometry, not a PI chain (see module scope doc).
#[derive(Debug, Clone, PartialEq)]
pub struct ImportedAlignment {
    pub name: String,
    pub start_station: f64,
    pub length: f64,
    pub geometry: Vec<AlignmentGeometry>,
}

/// Render just the `<CoordGeom>` element's inner content for a resolved
/// alignment — the same formatting `thoth_civil::alignment::
/// export_alignment_to_land_xml` uses, factored out for embedding.
pub fn alignment_coord_geom_xml(resolved: &ResolvedAlignment) -> String {
    let mut lines = Vec::new();
    for elem in &resolved.elements {
        match elem {
            AlignmentElement::Tangent {
                from,
                to,
                begin_station,
                ..
            } => {
                lines.push(format!(
                    "        <Line staStart=\"{}\"><Start>{} {}</Start><End>{} {}</End></Line>",
                    super::fmt_station(*begin_station),
                    super::fmt_coord(from.x),
                    super::fmt_coord(from.y),
                    super::fmt_coord(to.x),
                    super::fmt_coord(to.y),
                ));
            }
            AlignmentElement::Curve { curve, .. } => {
                lines.push(format!(
                    "        <Curve staStart=\"{}\" rot=\"{}\" radius=\"{}\"><Start>{} {}</Start><Center>{} {}</Center><End>{} {}</End></Curve>",
                    super::fmt_station(curve.pc_station),
                    if curve.direction == CurveDirection::Right { "cw" } else { "ccw" },
                    super::fmt_coord(curve.radius),
                    super::fmt_coord(curve.pc.x),
                    super::fmt_coord(curve.pc.y),
                    super::fmt_coord(curve.center.x),
                    super::fmt_coord(curve.center.y),
                    super::fmt_coord(curve.pt.x),
                    super::fmt_coord(curve.pt.y),
                ));
            }
            AlignmentElement::Spiral { .. } => {}
        }
    }
    lines.join("\n")
}

/// Render the `<Alignments>...</Alignments>` fragment for the given
/// `(name, start_station, resolved)` alignments.
pub fn alignments_xml(alignments: &[(&str, f64, ResolvedAlignment)]) -> String {
    let mut out = vec!["  <Alignments>".to_string()];
    for (name, start_station, resolved) in alignments {
        out.push(format!(
            "    <Alignment name=\"{}\" staStart=\"{}\" length=\"{}\">",
            escape_attr(name),
            super::fmt_station(*start_station),
            super::fmt_station(resolved.length),
        ));
        out.push("      <CoordGeom>".to_string());
        out.push(alignment_coord_geom_xml(resolved));
        out.push("      </CoordGeom>".to_string());
        out.push("    </Alignment>".to_string());
    }
    out.push("  </Alignments>".to_string());
    out.join("\n")
}

fn parse_point_child(node: &XmlNode, tag: &str) -> InteropResult<Point> {
    let child = node.child(tag).ok_or_else(|| InteropError::MissingField {
        format: FORMAT,
        what: tag.to_string(),
        offset: node.offset,
    })?;
    let values: Vec<f64> = child
        .text_trim()
        .split_whitespace()
        .map(str::parse::<f64>)
        .collect::<Result<_, _>>()
        .map_err(|e| InteropError::Malformed {
            format: FORMAT,
            offset: child.offset,
            reason: format!("expected \"x y\": {e}"),
        })?;
    if values.len() != 2 {
        return Err(InteropError::Malformed {
            format: FORMAT,
            offset: child.offset,
            reason: format!("expected exactly 2 values, got {}", values.len()),
        });
    }
    Ok(Point::new(values[0], values[1]))
}

fn parse_required_f64(node: &XmlNode, attr: &str) -> InteropResult<f64> {
    node.attr(attr)
        .ok_or_else(|| InteropError::MissingField {
            format: FORMAT,
            what: format!("@{attr}"),
            offset: node.offset,
        })?
        .parse()
        .map_err(|e| InteropError::Malformed {
            format: FORMAT,
            offset: node.offset,
            reason: format!("@{attr} is not a number: {e}"),
        })
}

/// Parse an `<Alignments>` element's `<Alignment>` children.
///
/// # Errors
/// [`InteropError::Malformed`] for a missing/non-numeric `staStart`/`radius`
/// or `<Start>`/`<Center>`/`<End>` child; [`InteropError::Unsupported`] for a
/// `<Spiral>` element (not constructed by this crate's own exporter, and not
/// parsed on import either).
pub fn parse_alignments(node: &XmlNode) -> InteropResult<Vec<ImportedAlignment>> {
    let mut out = Vec::new();
    for align in node.children_named("Alignment") {
        let name = align.attr("name").unwrap_or("Alignment").to_string();
        let start_station = align
            .attr("staStart")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0);
        let length = align
            .attr("length")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0);

        let mut geometry = Vec::new();
        if let Some(geom) = align.child("CoordGeom") {
            for seg in &geom.children {
                match seg.tag.as_str() {
                    "Line" => {
                        let sta_start = parse_required_f64(seg, "staStart")?;
                        geometry.push(AlignmentGeometry::Line {
                            sta_start,
                            start: parse_point_child(seg, "Start")?,
                            end: parse_point_child(seg, "End")?,
                        });
                    }
                    "Curve" => {
                        let sta_start = parse_required_f64(seg, "staStart")?;
                        let radius = parse_required_f64(seg, "radius")?;
                        let rotation = match seg.attr("rot") {
                            Some("ccw") => CurveRotation::CounterClockwise,
                            _ => CurveRotation::Clockwise,
                        };
                        geometry.push(AlignmentGeometry::Curve {
                            sta_start,
                            start: parse_point_child(seg, "Start")?,
                            center: parse_point_child(seg, "Center")?,
                            end: parse_point_child(seg, "End")?,
                            radius,
                            rotation,
                        });
                    }
                    "Spiral" => {
                        return Err(InteropError::Unsupported {
                            format: FORMAT,
                            reason: "spiral transition elements are not supported".to_string(),
                        });
                    }
                    _ => continue,
                }
            }
        }

        out.push(ImportedAlignment {
            name,
            start_station,
            length,
            geometry,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_civil::alignment::{resolve_alignment, AlignmentPi, HorizontalAlignment};

    #[test]
    fn alignment_with_a_curve_round_trips_endpoints_and_station() {
        let alignment = HorizontalAlignment::new(
            "a1",
            "R/L Main",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::curved(Point::new(0.0, -1000.0), 500.0),
                AlignmentPi::simple(Point::new(1000.0, -1000.0)),
            ],
            10_000.0,
        );
        let resolved = resolve_alignment(&alignment).unwrap();
        let xml = format!(
            "<Root>{}</Root>",
            alignments_xml(&[("R/L Main", 10_000.0, resolved.clone())])
        );
        let root = crate::xml_tree::parse_xml_tree("Test", &xml).unwrap();
        let parsed = parse_alignments(root.child("Alignments").unwrap()).unwrap();
        assert_eq!(parsed.len(), 1);
        let a = &parsed[0];
        assert_eq!(a.name, "R/L Main");
        assert!((a.start_station - 10_000.0).abs() < 1e-3);
        assert!((a.length - resolved.length).abs() < 1e-2);

        // 2 tangents + 1 curve.
        assert_eq!(a.geometry.len(), 3);
        let has_curve = a.geometry.iter().any(|g| matches!(g, AlignmentGeometry::Curve { radius, .. } if (*radius - 500.0).abs() < 1e-3));
        assert!(has_curve);
    }

    #[test]
    fn straight_alignment_round_trips_as_a_single_tangent() {
        let alignment = HorizontalAlignment::new(
            "s",
            "Straight",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(0.0, -200.0)),
            ],
            0.0,
        );
        let resolved = resolve_alignment(&alignment).unwrap();
        let xml = format!(
            "<Root>{}</Root>",
            alignments_xml(&[("Straight", 0.0, resolved)])
        );
        let root = crate::xml_tree::parse_xml_tree("Test", &xml).unwrap();
        let parsed = parse_alignments(root.child("Alignments").unwrap()).unwrap();
        assert_eq!(parsed[0].geometry.len(), 1);
        assert!(matches!(
            parsed[0].geometry[0],
            AlignmentGeometry::Line { .. }
        ));
    }
}
