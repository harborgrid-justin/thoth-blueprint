//! LandXML `<PipeNetworks><PipeNetwork><Structs>/<Pipes>` — storm/sanitary
//! pipe networks.
//!
//! Scope: `<Struct name="..." type="...">` with a 3D `<Center>` (plan `x y`
//! plus elevation, per the parent module's `<CoordGeom>`-family convention —
//! structures aren't COGO points, they're 3D geometry like alignment
//! `<Start>`/`<End>`), and `<Pipe name="...">` with 3D `<Start>`/`<End>`
//! plus a `refStart`/`refEnd` structure reference and an optional
//! `diameter`. Does not support inline pipe cross-section/shape definitions
//! (`<PipeNetFeat>` circular/box/egg profiles beyond a single diameter
//! number), gravity/pressure flow attributes, or `<Header>` alignment ties.

use thoth_spatial::Point;

use crate::error::{InteropError, InteropResult};
use crate::xml_tree::{escape_attr, XmlNode};

const FORMAT: &str = "LandXML/PipeNetworks";

/// A manhole, inlet, or other pipe-network structure.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeStructure {
    pub id: String,
    pub name: String,
    pub struct_type: String,
    pub position: Point,
    pub rim_elevation: Option<f64>,
    pub sump_elevation: Option<f64>,
}

/// A single pipe run between two structures.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeSegment {
    pub id: String,
    pub name: String,
    pub start_structure: String,
    pub end_structure: String,
    pub diameter: Option<f64>,
    pub start_invert: Option<f64>,
    pub end_invert: Option<f64>,
}

/// A named pipe network: its structures and the pipes connecting them.
#[derive(Debug, Clone, PartialEq)]
pub struct PipeNetworkXml {
    pub name: String,
    pub structures: Vec<PipeStructure>,
    pub pipes: Vec<PipeSegment>,
}

fn structure_position(s: &PipeStructure) -> (f64, f64, f64) {
    (s.position.x, s.position.y, s.rim_elevation.unwrap_or(0.0))
}

/// Render the `<PipeNetworks>...</PipeNetworks>` fragment.
pub fn pipe_networks_xml(networks: &[PipeNetworkXml]) -> String {
    let mut out = vec!["  <PipeNetworks>".to_string()];
    for net in networks {
        out.push(format!(
            "    <PipeNetwork name=\"{}\">",
            escape_attr(&net.name)
        ));
        out.push("      <Structs>".to_string());
        for s in &net.structures {
            let (x, y, z) = structure_position(s);
            let mut open = format!(
                "        <Struct id=\"{}\" name=\"{}\" type=\"{}\"",
                escape_attr(&s.id),
                escape_attr(&s.name),
                escape_attr(&s.struct_type),
            );
            if let Some(sump) = s.sump_elevation {
                open.push_str(&format!(" sumpElev=\"{}\"", super::fmt_coord(sump)));
            }
            open.push('>');
            out.push(open);
            out.push(format!(
                "          <Center>{} {} {}</Center>",
                super::fmt_coord(x),
                super::fmt_coord(y),
                super::fmt_coord(z)
            ));
            out.push("        </Struct>".to_string());
        }
        out.push("      </Structs>".to_string());
        out.push("      <Pipes>".to_string());
        for p in &net.pipes {
            let mut open = format!(
                "        <Pipe id=\"{}\" name=\"{}\" refStart=\"{}\" refEnd=\"{}\"",
                escape_attr(&p.id),
                escape_attr(&p.name),
                escape_attr(&p.start_structure),
                escape_attr(&p.end_structure),
            );
            if let Some(d) = p.diameter {
                open.push_str(&format!(" diameter=\"{}\"", super::fmt_coord(d)));
            }
            open.push('>');
            out.push(open);
            let start_struct = net.structures.iter().find(|s| s.id == p.start_structure);
            let end_struct = net.structures.iter().find(|s| s.id == p.end_structure);
            let (sx, sy) = start_struct.map(|s| (s.position.x, s.position.y)).unwrap_or((0.0, 0.0));
            let (ex, ey) = end_struct.map(|s| (s.position.x, s.position.y)).unwrap_or((0.0, 0.0));
            out.push(format!(
                "          <Start>{} {} {}</Start>",
                super::fmt_coord(sx),
                super::fmt_coord(sy),
                super::fmt_coord(p.start_invert.unwrap_or(0.0))
            ));
            out.push(format!(
                "          <End>{} {} {}</End>",
                super::fmt_coord(ex),
                super::fmt_coord(ey),
                super::fmt_coord(p.end_invert.unwrap_or(0.0))
            ));
            out.push("        </Pipe>".to_string());
        }
        out.push("      </Pipes>".to_string());
        out.push("    </PipeNetwork>".to_string());
    }
    out.push("  </PipeNetworks>".to_string());
    out.join("\n")
}

fn parse_xyz(text: &str, offset: usize) -> InteropResult<(f64, f64, f64)> {
    let values: Vec<f64> = text
        .split_whitespace()
        .map(str::parse::<f64>)
        .collect::<Result<_, _>>()
        .map_err(|e| InteropError::Malformed {
            format: FORMAT,
            offset,
            reason: format!("expected \"x y z\", got '{text}': {e}"),
        })?;
    if values.len() != 3 {
        return Err(InteropError::Malformed {
            format: FORMAT,
            offset,
            reason: format!("expected exactly 3 coordinate values, got {}", values.len()),
        });
    }
    Ok((values[0], values[1], values[2]))
}

/// Parse a `<PipeNetworks>` element's `<PipeNetwork>` children.
///
/// # Errors
/// [`InteropError::UnknownReference`] if a `<Pipe>`'s `refStart`/`refEnd`
/// cites a structure id not present in that network's `<Structs>`.
pub fn parse_pipe_networks(node: &XmlNode) -> InteropResult<Vec<PipeNetworkXml>> {
    let mut out = Vec::new();
    for net in node.children_named("PipeNetwork") {
        let name = net.attr("name").unwrap_or("PipeNetwork").to_string();
        let mut structures = Vec::new();
        if let Some(structs) = net.child("Structs") {
            for s in structs.children_named("Struct") {
                let id = s
                    .attr("id")
                    .or_else(|| s.attr("name"))
                    .ok_or_else(|| InteropError::MissingField {
                        format: FORMAT,
                        what: "Struct/@id".to_string(),
                        offset: s.offset,
                    })?
                    .to_string();
                let center = s.child("Center").ok_or_else(|| InteropError::MissingField {
                    format: FORMAT,
                    what: format!("Struct '{id}'/Center"),
                    offset: s.offset,
                })?;
                let (x, y, z) = parse_xyz(center.text_trim(), center.offset)?;
                structures.push(PipeStructure {
                    id,
                    name: s.attr("name").unwrap_or("").to_string(),
                    struct_type: s.attr("type").unwrap_or("Unknown").to_string(),
                    position: Point::new(x, y),
                    rim_elevation: Some(z),
                    sump_elevation: s.attr("sumpElev").and_then(|v| v.parse().ok()),
                });
            }
        }

        let mut pipes = Vec::new();
        if let Some(pipes_node) = net.child("Pipes") {
            for p in pipes_node.children_named("Pipe") {
                let start_structure = p
                    .attr("refStart")
                    .ok_or_else(|| InteropError::MissingField {
                        format: FORMAT,
                        what: "Pipe/@refStart".to_string(),
                        offset: p.offset,
                    })?
                    .to_string();
                let end_structure = p
                    .attr("refEnd")
                    .ok_or_else(|| InteropError::MissingField {
                        format: FORMAT,
                        what: "Pipe/@refEnd".to_string(),
                        offset: p.offset,
                    })?
                    .to_string();
                for sid in [&start_structure, &end_structure] {
                    if !structures.iter().any(|s| &s.id == sid) {
                        return Err(InteropError::UnknownReference {
                            format: FORMAT,
                            what: "pipe structure",
                            id: sid.clone(),
                        });
                    }
                }
                let start_invert = p.child("Start").map(|n| parse_xyz(n.text_trim(), n.offset)).transpose()?.map(|(_, _, z)| z);
                let end_invert = p.child("End").map(|n| parse_xyz(n.text_trim(), n.offset)).transpose()?.map(|(_, _, z)| z);
                pipes.push(PipeSegment {
                    id: p.attr("id").unwrap_or("").to_string(),
                    name: p.attr("name").unwrap_or("").to_string(),
                    start_structure,
                    end_structure,
                    diameter: p.attr("diameter").and_then(|v| v.parse().ok()),
                    start_invert,
                    end_invert,
                });
            }
        }

        out.push(PipeNetworkXml {
            name,
            structures,
            pipes,
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> PipeNetworkXml {
        PipeNetworkXml {
            name: "Storm A".to_string(),
            structures: vec![
                PipeStructure {
                    id: "S1".into(),
                    name: "MH-1".into(),
                    struct_type: "Manhole".into(),
                    position: Point::new(0.0, 0.0),
                    rim_elevation: Some(110.0),
                    sump_elevation: Some(100.0),
                },
                PipeStructure {
                    id: "S2".into(),
                    name: "MH-2".into(),
                    struct_type: "Manhole".into(),
                    position: Point::new(100.0, 0.0),
                    rim_elevation: Some(108.0),
                    sump_elevation: Some(98.0),
                },
            ],
            pipes: vec![PipeSegment {
                id: "P1".into(),
                name: "Storm-1".into(),
                start_structure: "S1".into(),
                end_structure: "S2".into(),
                diameter: Some(0.45),
                start_invert: Some(101.0),
                end_invert: Some(99.5),
            }],
        }
    }

    #[test]
    fn network_round_trips_structures_and_pipes() {
        let xml = format!("<Root>{}</Root>", pipe_networks_xml(&[sample()]));
        let root = crate::xml_tree::parse_xml_tree("Test", &xml).unwrap();
        let parsed = parse_pipe_networks(root.child("PipeNetworks").unwrap()).unwrap();
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].structures.len(), 2);
        assert_eq!(parsed[0].pipes.len(), 1);
        assert_eq!(parsed[0].pipes[0].start_structure, "S1");
        assert_eq!(parsed[0].pipes[0].end_structure, "S2");
        assert!((parsed[0].pipes[0].diameter.unwrap() - 0.45).abs() < 1e-3);
        assert!((parsed[0].pipes[0].start_invert.unwrap() - 101.0).abs() < 1e-3);
    }

    #[test]
    fn pipe_referencing_unknown_structure_is_an_error() {
        let xml = r#"<Root><PipeNetworks><PipeNetwork name="n">
            <Structs><Struct id="S1" type="Manhole"><Center>0 0 0</Center></Struct></Structs>
            <Pipes><Pipe id="p" refStart="S1" refEnd="S9"><Start>0 0 0</Start><End>1 1 0</End></Pipe></Pipes>
        </PipeNetwork></PipeNetworks></Root>"#;
        let root = crate::xml_tree::parse_xml_tree("Test", xml).unwrap();
        let err = parse_pipe_networks(root.child("PipeNetworks").unwrap()).unwrap_err();
        assert!(matches!(err, InteropError::UnknownReference { .. }));
    }
}
