//! Minimal COLLADA (.dae) writer and 3D mesh generator. Emits a valid COLLADA
//! 1.4.1 document from a set of triangle meshes so a plan can be exported as
//! a 3D model. Pure string & geometry generation.
//!
//! Port of `packages/domain/src/drawing/collada.ts` and its test suite
//! `drawing/tests/collada.test.ts` (ported 1:1 below).
//!
//! ## Scope note
//!
//! [`meshFormatFromName`]/[`meshes_from_name`], [`prism`], and [`write_collada`]
//! are fully ported (pure geometry/string generation, no external types).
//! `siteToMeshes` from the TS source — which walks a `Site`'s terrain and
//! building elements via `thoth-civil`'s `buildTerrainModel`/`elevationAt` and
//! `thoth-planning`'s `Site` — is **not-yet-ported**: it needs types owned by
//! crates this one does not depend on. See `STATUS.md`. When it is ported,
//! reproduce the TS `VERTICAL_EXAGGERATION = 1.6` constant (a vertical
//! scale-up applied to terrain/building heights so relief reads clearly in a
//! 3D export) exactly.

use thoth_spatial::Point;

use crate::common::format::{safe_id, xml_escape};

/// A triangle mesh: flat XYZ positions and triangle index triples.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SimpleMesh {
    pub name: String,
    /// Flat `[x,y,z, x,y,z, ...]` vertex positions.
    pub positions: Vec<f64>,
    /// Flat triangle indices into `positions`/3.
    pub indices: Vec<u32>,
    /// Diffuse color as `[r,g,b]` in 0-1.
    pub color: [f64; 3],
}

/// A 3D mesh export/import file format this module can round-trip.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MeshFormat {
    Obj,
    Dae,
    Fbx,
    Stl,
    Gltf,
}

/// Infer a mesh format from a filename's extension (case-insensitive).
/// `.glb` is treated as `Gltf`, matching the TS `case "gltf": case "glb":`.
pub fn mesh_format_from_name(name: &str) -> Option<MeshFormat> {
    let ext = name.rsplit('.').next()?.to_lowercase();
    match ext.as_str() {
        "obj" => Some(MeshFormat::Obj),
        "dae" => Some(MeshFormat::Dae),
        "fbx" => Some(MeshFormat::Fbx),
        "stl" => Some(MeshFormat::Stl),
        "gltf" | "glb" => Some(MeshFormat::Gltf),
        _ => None,
    }
}

/// A closed extruded prism from a boundary between two heights (y-up).
///
/// `boundary` must have at least 3 vertices for the fan-triangulated top/
/// bottom caps to be meaningful; degenerate (fewer than 3) input simply
/// produces a mesh with no cap triangles (matching the TS `for` loops, which
/// silently iterate zero times), not a panic.
pub fn prism(name: &str, boundary: &[Point], bottom: f64, top: f64, color: [f64; 3]) -> SimpleMesh {
    let n = boundary.len();
    let mut positions = Vec::with_capacity(n * 6);
    let mut indices = Vec::new();

    // Bottom ring (0..n-1), top ring (n..2n-1).
    for p in boundary {
        positions.extend_from_slice(&[p.x, bottom, p.y]);
    }
    for p in boundary {
        positions.extend_from_slice(&[p.x, top, p.y]);
    }

    // Side walls.
    for i in 0..n {
        let j = (i + 1) % n;
        indices.extend_from_slice(&[
            i as u32,
            j as u32,
            (n + i) as u32,
            j as u32,
            (n + j) as u32,
            (n + i) as u32,
        ]);
    }
    // Top cap (fan triangulation — fine for convex-ish footprints).
    for i in 1..n.saturating_sub(1) {
        indices.extend_from_slice(&[n as u32, (n + i) as u32, (n + i + 1) as u32]);
    }
    // Bottom cap (reverse winding).
    for i in 1..n.saturating_sub(1) {
        indices.extend_from_slice(&[0, (i + 1) as u32, i as u32]);
    }

    SimpleMesh {
        name: name.to_string(),
        positions,
        indices,
        color,
    }
}

fn fmt(v: f64) -> String {
    if v.is_finite() {
        ((v * 10000.0).round() / 10000.0).to_string()
    } else {
        "0".to_string()
    }
}

/// Serialize meshes to a COLLADA 1.4.1 document string.
pub fn write_collada(meshes: &[SimpleMesh], author: Option<&str>) -> String {
    let author = author.unwrap_or("Thoth Blueprint");
    let now = "1970-01-01T00:00:00Z";
    let mut materials = String::new();
    let mut effects = String::new();
    let mut geometries = String::new();
    let mut nodes = String::new();

    for (i, mesh) in meshes.iter().enumerate() {
        let id = safe_id(&mesh.name, i);
        let id_esc = xml_escape(&id);
        let [r, g, b] = mesh.color;

        effects.push_str(&format!(
            "<effect id=\"{id_esc}-effect\"><profile_COMMON><technique sid=\"common\"><lambert>\
            <diffuse><color>{r} {g} {b} 1</color></diffuse>\
            </lambert></technique></profile_COMMON></effect>"
        ));
        materials.push_str(&format!(
            "<material id=\"{id_esc}-material\" name=\"{}\">\
            <instance_effect url=\"#{id_esc}-effect\"/></material>",
            xml_escape(&mesh.name)
        ));

        let vcount = mesh.positions.len() / 3;
        let tri_count = mesh.indices.len() / 3;
        let positions_str = mesh
            .positions
            .iter()
            .map(|v| fmt(*v))
            .collect::<Vec<_>>()
            .join(" ");
        let indices_str = mesh
            .indices
            .iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(" ");
        geometries.push_str(&format!(
            "<geometry id=\"{id_esc}-geom\" name=\"{}\"><mesh>\
            <source id=\"{id_esc}-pos\"><float_array id=\"{id_esc}-pos-array\" count=\"{}\">{positions_str}</float_array>\
            <technique_common><accessor source=\"#{id_esc}-pos-array\" count=\"{vcount}\" stride=\"3\">\
            <param name=\"X\" type=\"float\"/><param name=\"Y\" type=\"float\"/><param name=\"Z\" type=\"float\"/>\
            </accessor></technique_common></source>\
            <vertices id=\"{id_esc}-vtx\"><input semantic=\"POSITION\" source=\"#{id_esc}-pos\"/></vertices>\
            <triangles material=\"{id_esc}-material\" count=\"{tri_count}\">\
            <input semantic=\"VERTEX\" source=\"#{id_esc}-vtx\" offset=\"0\"/>\
            <p>{indices_str}</p></triangles>\
            </mesh></geometry>",
            xml_escape(&mesh.name),
            mesh.positions.len(),
        ));

        nodes.push_str(&format!(
            "<node id=\"{id_esc}-node\" name=\"{}\"><instance_geometry url=\"#{id_esc}-geom\">\
            <bind_material><technique_common>\
            <instance_material symbol=\"{id_esc}-material\" target=\"#{id_esc}-material\"/>\
            </technique_common></bind_material></instance_geometry></node>",
            xml_escape(&mesh.name)
        ));
    }

    format!(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\
        <COLLADA xmlns=\"http://www.collada.org/2005/11/COLLADASchema\" version=\"1.4.1\">\
        <asset><contributor><authoring_tool>{}</authoring_tool></contributor>\
        <created>{now}</created><modified>{now}</modified>\
        <unit name=\"meter\" meter=\"1\"/><up_axis>Y_UP</up_axis></asset>\
        <library_effects>{effects}</library_effects>\
        <library_materials>{materials}</library_materials>\
        <library_geometries>{geometries}</library_geometries>\
        <library_visual_scenes><visual_scene id=\"scene\" name=\"scene\">{nodes}</visual_scene></library_visual_scenes>\
        <scene><instance_visual_scene url=\"#scene\"/></scene>\
        </COLLADA>",
        xml_escape(author)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tri() -> SimpleMesh {
        SimpleMesh {
            name: "Test Mesh".to_string(),
            positions: vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
            indices: vec![0, 1, 2],
            color: [0.5, 0.25, 0.1],
        }
    }

    // --- ported 1:1 from drawing/tests/collada.test.ts --------------------

    #[test]
    fn emits_a_valid_collada_document_with_geometry() {
        let dae = write_collada(&[tri()], None);
        assert!(dae.contains("<?xml version=\"1.0\""));
        assert!(dae.contains("<COLLADA"));
        assert!(dae.contains("version=\"1.4.1\""));
        assert!(dae.contains("<library_geometries>"));
        assert!(dae.contains("<float_array"));
        assert!(dae.contains("0 1 2")); // the triangle indices
    }

    #[test]
    fn includes_one_geometry_and_material_per_mesh() {
        let mut second = tri();
        second.name = "Second".to_string();
        let dae = write_collada(&[tri(), second], None);
        assert_eq!(dae.matches("<geometry ").count(), 2);
        assert_eq!(dae.matches("<material ").count(), 2);
    }

    #[test]
    fn escapes_names_safely() {
        let mut bad = tri();
        bad.name = "Bad <name> & stuff".to_string();
        let dae = write_collada(&[bad], None);
        assert!(!dae.contains("<name>"));
    }

    // --- additional coverage -------------------------------------------------

    #[test]
    fn mesh_format_from_name_recognizes_every_supported_extension() {
        assert_eq!(mesh_format_from_name("model.obj"), Some(MeshFormat::Obj));
        assert_eq!(mesh_format_from_name("model.DAE"), Some(MeshFormat::Dae));
        assert_eq!(mesh_format_from_name("model.fbx"), Some(MeshFormat::Fbx));
        assert_eq!(mesh_format_from_name("model.stl"), Some(MeshFormat::Stl));
        assert_eq!(mesh_format_from_name("model.gltf"), Some(MeshFormat::Gltf));
        assert_eq!(mesh_format_from_name("model.glb"), Some(MeshFormat::Gltf));
        assert_eq!(mesh_format_from_name("model.txt"), None);
        assert_eq!(mesh_format_from_name("noextension"), None);
    }

    #[test]
    fn prism_builds_side_walls_and_caps_for_a_square_footprint() {
        let boundary = vec![
            Point::new(0.0, 0.0),
            Point::new(1.0, 0.0),
            Point::new(1.0, 1.0),
            Point::new(0.0, 1.0),
        ];
        let mesh = prism("Box", &boundary, 0.0, 3.0, [1.0, 1.0, 1.0]);
        // 4 bottom + 4 top vertices, 3 floats each.
        assert_eq!(mesh.positions.len(), 8 * 3);
        // 4 side walls * 2 triangles + 2 top-cap + 2 bottom-cap triangles = 12 triangles.
        assert_eq!(mesh.indices.len(), 12 * 3);
    }

    #[test]
    fn prism_of_degenerate_boundary_produces_no_cap_triangles_without_panicking() {
        let boundary = vec![Point::new(0.0, 0.0), Point::new(1.0, 0.0)];
        let mesh = prism("Line", &boundary, 0.0, 1.0, [0.0, 0.0, 0.0]);
        // 2 side walls (6 indices each direction is n=2, so 2*6=12) + no caps (n-1=1, loop 1..1 empty).
        assert_eq!(mesh.indices.len(), 2 * 6);
    }

    #[test]
    fn fmt_rounds_to_four_decimal_places_and_guards_non_finite() {
        assert_eq!(fmt(1.0 / 3.0), "0.3333");
        assert_eq!(fmt(f64::NAN), "0");
        assert_eq!(fmt(f64::INFINITY), "0");
    }
}
