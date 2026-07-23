//! Road corridor extrusion for the plan canvas: builds a [`Corridor`] record
//! plus its resolved sections, feature-line polylines, and canvas elements
//! from an alignment/profile/assembly triple. Direct port of
//! `packages/domain/src/survey/helpers/corridorHelpers.ts`.
//!
//! Unlocked this pass by adding `thoth-civil` as a dependency (see
//! `../../GAPS.md` #3 and `../../STATUS.md`).

use thoth_civil::alignment::HorizontalAlignment;
use thoth_civil::assembly::Assembly;
use thoth_civil::corridor::{
    build_corridor_sections, extract_corridor_feature_lines, Corridor, CorridorFeatureLine,
    CorridorSection,
};
use thoth_civil::grading::Point3D;
use thoth_civil::profile::VerticalProfile;
use thoth_spatial::Point;

/// A narrow stand-in for the real canvas element the TS original constructs
/// (`{ id, kind: "corridor", layerId: "c-road", name, boundary, properties:
/// { code, points3D } }`). The full planning element hierarchy
/// (`spatial/types::Element`) belongs to `thoth-planning`, not a dependency
/// of this crate — see `../../GAPS.md` #3. Swap for the real element type
/// once cross-crate wiring lands; every field this port populates is named
/// identically to ease that swap.
#[derive(Debug, Clone, PartialEq)]
pub struct CorridorFeatureElement {
    pub id: String,
    pub kind: &'static str,
    pub layer_id: &'static str,
    pub name: String,
    /// 2D boundary vertices (the feature line flattened to plan view).
    pub boundary: Vec<Point>,
    pub code: String,
    /// The full 3D feature-line points, carried as a "property" the way the
    /// TS original stashes `points3D` under `properties`.
    pub points_3d: Vec<Point3D>,
}

/// The full result of extruding a corridor: the synthesized [`Corridor`]
/// record, its resolved 3D sections, the extracted feature-line polylines,
/// and the canvas elements built from each feature line.
///
/// No `PartialEq`: `Corridor` (`thoth-civil`) doesn't derive it.
#[derive(Debug, Clone)]
pub struct ExtrudedCorridor {
    pub corridor: Corridor,
    pub sections: Vec<CorridorSection>,
    pub feature_lines: Vec<CorridorFeatureLine>,
    pub new_elements: Vec<CorridorFeatureElement>,
}

/// Builds a corridor from `alignment`/`profile`/`assembly` at the given
/// station `frequency`, plus its downstream feature-line canvas elements.
/// Returns `None` if either `alignment` or `profile` is absent (mirrors the
/// TS `if (!alignment || !profile) return null;`).
///
/// The synthesized `Corridor` always gets a fixed id of `"cor-1"`, exactly
/// like the TS original (a real corridor-management flow would mint a real
/// id; this helper is a single-corridor scratch builder).
pub fn extrude_corridor(
    alignment: Option<&HorizontalAlignment>,
    profile: Option<&VerticalProfile>,
    assembly: &Assembly,
    frequency: f64,
) -> Option<ExtrudedCorridor> {
    let (alignment, profile) = (alignment?, profile?);

    let corridor = Corridor {
        id: "cor-1".to_string(),
        name: format!("Corridor - {}", alignment.name),
        alignment_id: alignment.id.clone(),
        profile_id: profile.id.clone(),
        assembly_id: assembly.id.clone(),
        frequency,
        regions: Vec::new(),
        overrides: Vec::new(),
    };

    let sections = build_corridor_sections(&corridor, alignment, profile, assembly, None, None);
    let feature_lines = extract_corridor_feature_lines(&sections);

    let new_elements = feature_lines
        .iter()
        .map(|fl| CorridorFeatureElement {
            id: format!("fl-{}", fl.code),
            kind: "corridor",
            layer_id: "c-road",
            name: format!("{} Feature Line", fl.code),
            boundary: fl.points.iter().map(|p| Point::new(p.x, p.y)).collect(),
            code: fl.code.clone(),
            points_3d: fl.points.clone(),
        })
        .collect();

    Some(ExtrudedCorridor {
        corridor,
        sections,
        feature_lines,
        new_elements,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_civil::alignment::AlignmentPi;
    use thoth_civil::assembly::{Side, Subassembly, SubassemblyParam, SubassemblyType};
    use thoth_civil::profile::VerticalPvi;

    fn align() -> HorizontalAlignment {
        HorizontalAlignment::new(
            "a1",
            "Road Corridor",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::simple(Point::new(500.0, 0.0)),
            ],
            0.0,
        )
    }

    fn profile() -> VerticalProfile {
        VerticalProfile {
            id: "p1".into(),
            name: "Profile".into(),
            alignment_id: "a1".into(),
            pvis: vec![
                VerticalPvi {
                    station: 0.0,
                    elevation: 100.0,
                    curve_length: None,
                },
                VerticalPvi {
                    station: 500.0,
                    elevation: 110.0,
                    curve_length: None,
                },
            ],
        }
    }

    fn assembly() -> Assembly {
        Assembly {
            id: "as-1".into(),
            name: "Assembly A".into(),
            left_subassemblies: vec![Subassembly {
                id: "l1".into(),
                name: "Left Lane".into(),
                side: Side::Left,
                subassembly_type: SubassemblyType::Lane,
                parameters: vec![SubassemblyParam {
                    name: "Width",
                    value: 10.0,
                }],
            }],
            right_subassemblies: vec![Subassembly {
                id: "r1".into(),
                name: "Right Lane".into(),
                side: Side::Right,
                subassembly_type: SubassemblyType::Lane,
                parameters: vec![SubassemblyParam {
                    name: "Width",
                    value: 10.0,
                }],
            }],
        }
    }

    #[test]
    fn extrudes_a_corridor_and_its_feature_line_elements() {
        let a = align();
        let p = profile();
        let asm = assembly();
        let extruded = extrude_corridor(Some(&a), Some(&p), &asm, 100.0).unwrap();

        assert_eq!(extruded.corridor.id, "cor-1");
        assert_eq!(extruded.corridor.name, "Corridor - Road Corridor");
        assert!(!extruded.sections.is_empty());
        assert!(!extruded.feature_lines.is_empty());

        let centerline = extruded
            .new_elements
            .iter()
            .find(|e| e.code == "Centerline")
            .expect("centerline feature line becomes a canvas element");
        assert_eq!(centerline.id, "fl-Centerline");
        assert_eq!(centerline.kind, "corridor");
        assert_eq!(centerline.layer_id, "c-road");
        assert_eq!(centerline.name, "Centerline Feature Line");
        assert_eq!(centerline.boundary.len(), centerline.points_3d.len());
    }

    #[test]
    fn returns_none_when_alignment_is_absent() {
        let p = profile();
        let asm = assembly();
        assert!(extrude_corridor(None, Some(&p), &asm, 100.0).is_none());
    }

    #[test]
    fn returns_none_when_profile_is_absent() {
        let a = align();
        let asm = assembly();
        assert!(extrude_corridor(Some(&a), None, &asm, 100.0).is_none());
    }
}
