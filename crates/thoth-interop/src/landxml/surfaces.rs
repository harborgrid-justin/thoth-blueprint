//! LandXML `<Surfaces><Surface><Definition><Pnts>/<Faces>` — triangulated
//! irregular network (TIN) surfaces.
//!
//! Scope: supports exactly the `surfType="TIN"` definition form: a flat list
//! of `<P id="...">` points (northing, easting, elevation — see the parent
//! module doc) and a flat list of `<F>a b c</F>` triangle faces referencing
//! those point ids. Does **not** support `<Breaklines>`, `<Boundaries>`, grid
//! (`surfType="GRID"`) surfaces, or the source-data (`<SourceData>`)
//! provenance block. A [`TinSurface`] is this crate's own representation
//! (there is no TIN type upstream); [`elevation_grid_to_tin`] adapts
//! `thoth_civil::terrain::ElevationGrid` (a regular raster) into one for
//! export. The reverse (resampling an arbitrary imported TIN back into a
//! regular grid) needs interpolation this module doesn't attempt — round-trip
//! testing here covers `TinSurface -> LandXML -> TinSurface`, not a grid
//! round trip.

use std::collections::HashMap;

use thoth_civil::terrain::ElevationGrid;

use super::convert::{northing_easting_to_point, point_to_northing_easting};
use crate::error::{InteropError, InteropResult};
use crate::xml_tree::{escape_attr, XmlNode};

const FORMAT: &str = "LandXML/Surfaces";

/// One point of a [`TinSurface`], keyed by its LandXML point id (ids need not
/// be sequential integers; this module resolves faces by id, not position).
#[derive(Debug, Clone, PartialEq)]
pub struct TinPoint {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

/// A triangular face of a [`TinSurface`], referencing three [`TinPoint`] ids.
#[derive(Debug, Clone, PartialEq)]
pub struct TinFace {
    pub a: String,
    pub b: String,
    pub c: String,
}

/// A triangulated surface: a point cloud plus the triangle faces connecting
/// them (a TIN).
#[derive(Debug, Clone, PartialEq)]
pub struct TinSurface {
    pub name: String,
    pub points: Vec<TinPoint>,
    pub faces: Vec<TinFace>,
}

/// Triangulate a regular elevation grid into a [`TinSurface`] for LandXML
/// export: each rectangular cell becomes two triangles, split along a
/// consistent diagonal (bottom-left → top-right).
pub fn elevation_grid_to_tin(name: impl Into<String>, grid: &ElevationGrid) -> TinSurface {
    let cols = grid.cols();
    let rows = grid.rows();
    let origin = grid.origin();
    let cell = grid.cell_size();
    let heights = grid.heights();

    let idx = |c: usize, r: usize| -> String { format!("{}", r * cols + c + 1) };
    let mut points = Vec::with_capacity(cols * rows);
    for r in 0..rows {
        for c in 0..cols {
            points.push(TinPoint {
                id: idx(c, r),
                x: origin.x + c as f64 * cell,
                y: origin.y + r as f64 * cell,
                z: heights[r * cols + c],
            });
        }
    }

    let mut faces = Vec::with_capacity((cols - 1) * (rows - 1) * 2);
    for r in 0..rows - 1 {
        for c in 0..cols - 1 {
            let bl = idx(c, r);
            let br = idx(c + 1, r);
            let tl = idx(c, r + 1);
            let tr = idx(c + 1, r + 1);
            faces.push(TinFace {
                a: bl.clone(),
                b: br.clone(),
                c: tl.clone(),
            });
            faces.push(TinFace { a: br, b: tr, c: tl });
        }
    }

    TinSurface {
        name: name.into(),
        points,
        faces,
    }
}

/// Render the `<Surfaces>...</Surfaces>` fragment for the given surfaces.
pub fn surfaces_xml(surfaces: &[TinSurface]) -> String {
    let mut out = vec!["  <Surfaces>".to_string()];
    for s in surfaces {
        out.push(format!("    <Surface name=\"{}\">", escape_attr(&s.name)));
        out.push("      <Definition surfType=\"TIN\">".to_string());
        out.push("        <Pnts>".to_string());
        for p in &s.points {
            let (northing, easting) = point_to_northing_easting(thoth_spatial::Point::new(p.x, p.y));
            out.push(format!(
                "          <P id=\"{}\">{:.4} {:.4} {:.4}</P>",
                escape_attr(&p.id),
                northing,
                easting,
                p.z
            ));
        }
        out.push("        </Pnts>".to_string());
        out.push("        <Faces>".to_string());
        for f in &s.faces {
            out.push(format!(
                "          <F>{} {} {}</F>",
                escape_attr(&f.a),
                escape_attr(&f.b),
                escape_attr(&f.c)
            ));
        }
        out.push("        </Faces>".to_string());
        out.push("      </Definition>".to_string());
        out.push("    </Surface>".to_string());
    }
    out.push("  </Surfaces>".to_string());
    out.join("\n")
}

/// Parse a `<Surfaces>` element's `<Surface>` children.
///
/// # Errors
/// - [`InteropError::Unsupported`] for a non-`TIN` `surfType`.
/// - [`InteropError::Malformed`] for a `<P>`/`<F>` with the wrong value count
///   or non-numeric text.
/// - [`InteropError::UnknownReference`] if a `<F>` cites a point id absent
///   from `<Pnts>`.
pub fn parse_surfaces(surfaces_node: &XmlNode) -> InteropResult<Vec<TinSurface>> {
    let mut out = Vec::new();
    for surf in surfaces_node.children_named("Surface") {
        let name = surf.attr("name").unwrap_or("Surface").to_string();
        let Some(def) = surf.child("Definition") else {
            return Err(InteropError::MissingField {
                format: FORMAT,
                what: format!("Surface '{name}'/Definition"),
                offset: surf.offset,
            });
        };
        let surf_type = def.attr("surfType").unwrap_or("TIN");
        if surf_type != "TIN" {
            return Err(InteropError::Unsupported {
                format: FORMAT,
                reason: format!("surfType=\"{surf_type}\" (only TIN is supported)"),
            });
        }

        let mut points = Vec::new();
        let mut ids_seen: HashMap<&str, ()> = HashMap::new();
        if let Some(pnts) = def.child("Pnts") {
            for p in pnts.children_named("P") {
                let id = p.attr("id").ok_or_else(|| InteropError::MissingField {
                    format: FORMAT,
                    what: "P/@id".to_string(),
                    offset: p.offset,
                })?;
                let values: Vec<f64> = p
                    .text_trim()
                    .split_whitespace()
                    .map(str::parse::<f64>)
                    .collect::<Result<_, _>>()
                    .map_err(|e| InteropError::Malformed {
                        format: FORMAT,
                        offset: p.offset,
                        reason: format!("point '{id}' has non-numeric text: {e}"),
                    })?;
                if values.len() != 3 {
                    return Err(InteropError::Malformed {
                        format: FORMAT,
                        offset: p.offset,
                        reason: format!("point '{id}' must have 3 values (N E Z), got {}", values.len()),
                    });
                }
                let plan = northing_easting_to_point(values[0], values[1]);
                ids_seen.insert(id, ());
                points.push(TinPoint {
                    id: id.to_string(),
                    x: plan.x,
                    y: plan.y,
                    z: values[2],
                });
            }
        }

        let mut faces = Vec::new();
        if let Some(fcs) = def.child("Faces") {
            for f in fcs.children_named("F") {
                let ids: Vec<&str> = f.text_trim().split_whitespace().collect();
                if ids.len() != 3 {
                    return Err(InteropError::Malformed {
                        format: FORMAT,
                        offset: f.offset,
                        reason: format!("face must reference exactly 3 points, got {}", ids.len()),
                    });
                }
                for id in &ids {
                    if !ids_seen.contains_key(id) {
                        return Err(InteropError::UnknownReference {
                            format: FORMAT,
                            what: "surface point",
                            id: id.to_string(),
                        });
                    }
                }
                faces.push(TinFace {
                    a: ids[0].to_string(),
                    b: ids[1].to_string(),
                    c: ids[2].to_string(),
                });
            }
        }

        out.push(TinSurface { name, points, faces });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::xml_tree::parse_xml_tree;

    fn sample() -> TinSurface {
        TinSurface {
            name: "Existing Ground".to_string(),
            points: vec![
                TinPoint { id: "A".into(), x: 0.0, y: 0.0, z: 100.0 },
                TinPoint { id: "B".into(), x: 20.0, y: 0.0, z: 102.5 },
                TinPoint { id: "C".into(), x: 10.0, y: 20.0, z: 101.25 },
            ],
            faces: vec![TinFace { a: "A".into(), b: "B".into(), c: "C".into() }],
        }
    }

    #[test]
    fn tin_surface_round_trips_points_and_faces() {
        let xml = format!("<Root>{}</Root>", surfaces_xml(&[sample()]));
        let root = parse_xml_tree("Test", &xml).unwrap();
        let parsed = parse_surfaces(root.child("Surfaces").unwrap()).unwrap();
        assert_eq!(parsed.len(), 1);
        let s = &parsed[0];
        assert_eq!(s.name, "Existing Ground");
        assert_eq!(s.points.len(), 3);
        assert_eq!(s.faces.len(), 1);
        for (orig, got) in sample().points.iter().zip(&s.points) {
            assert!((orig.x - got.x).abs() < 1e-3);
            assert!((orig.y - got.y).abs() < 1e-3);
            assert!((orig.z - got.z).abs() < 1e-3);
        }
    }

    #[test]
    fn face_referencing_unknown_point_is_an_error() {
        let xml = r#"<Root><Surfaces><Surface name="s"><Definition surfType="TIN">
            <Pnts><P id="1">0 0 0</P></Pnts>
            <Faces><F>1 2 3</F></Faces>
        </Definition></Surface></Surfaces></Root>"#;
        let root = parse_xml_tree("Test", xml).unwrap();
        let err = parse_surfaces(root.child("Surfaces").unwrap()).unwrap_err();
        assert!(matches!(err, InteropError::UnknownReference { .. }));
    }

    #[test]
    fn grid_surf_type_is_unsupported() {
        let xml = r#"<Root><Surfaces><Surface name="s"><Definition surfType="GRID">
        </Definition></Surface></Surfaces></Root>"#;
        let root = parse_xml_tree("Test", xml).unwrap();
        let err = parse_surfaces(root.child("Surfaces").unwrap()).unwrap_err();
        assert!(matches!(err, InteropError::Unsupported { .. }));
    }

    #[test]
    fn elevation_grid_triangulates_into_two_triangles_per_cell() {
        let grid = ElevationGrid::new(
            thoth_spatial::Point::new(0.0, 0.0),
            10.0,
            2,
            2,
            vec![0.0, 1.0, 2.0, 3.0],
        )
        .unwrap();
        let tin = elevation_grid_to_tin("EG", &grid);
        assert_eq!(tin.points.len(), 4);
        assert_eq!(tin.faces.len(), 2);
    }
}
