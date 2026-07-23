//! Roadway assemblies: left/right chains of subassemblies (lane, curb,
//! sidewalk, median, …) resolved into 2D cross-section offset points from the
//! centerline pivot.
//!
//! Port of `packages/domain/src/civil/assembly.ts` +
//! `packages/domain/src/civil/types/assembly.ts`. Default subassembly
//! dimensions mirror `federalReference.json`'s `standards.roads`
//! (`normalCrown`, `defaultLaneWidthFt`) — see `crates/thoth-civil/GAPS.md`;
//! this crate does not depend on the parts-catalog registry the TS source
//! also consults for overrides, so [`get_default_subassemblies`] only ever
//! returns the federal-data fallback values.

/// A named numeric parameter on a subassembly (e.g. `Width`, `Slope`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SubassemblyParam {
    pub name: &'static str,
    pub value: f64,
}

/// The kind of roadway cross-section component a subassembly models.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SubassemblyType {
    Lane,
    CurbAndGutter,
    Sidewalk,
    Daylight,
    Median,
    ConditionalCutOrFill,
    RetainingWall,
    DaylightBench,
    LinkWidthAndSlope,
    LinkSlopeToSurface,
    SubassemblyTransition,
}

/// Which side of the centerline a subassembly applies to.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Left,
    Right,
}

/// One component of an assembly's left or right chain.
#[derive(Debug, Clone, PartialEq)]
pub struct Subassembly {
    pub id: String,
    pub name: String,
    pub side: Side,
    pub subassembly_type: SubassemblyType,
    pub parameters: Vec<SubassemblyParam>,
}

impl Subassembly {
    fn get(&self, name: &str, default: f64) -> f64 {
        self.parameters.iter().find(|p| p.name == name).map_or(default, |p| p.value)
    }
}

/// A full roadway typical section: left and right subassembly chains from a
/// shared centerline.
#[derive(Debug, Clone, PartialEq)]
pub struct Assembly {
    pub id: String,
    pub name: String,
    pub left_subassemblies: Vec<Subassembly>,
    pub right_subassemblies: Vec<Subassembly>,
}

/// A resolved 2D cross-section coordinate point, tagged with the feature
/// code a plan sheet would label it with (e.g. `EdgeOfPavement_left`).
#[derive(Debug, Clone, PartialEq)]
pub struct AssemblyPoint {
    pub code: String,
    pub x: f64,
    pub y: f64,
}

/// Resolves 2D cross-section coordinate offsets from the baseline pivot for
/// a given [`Assembly`]. `left_superelevation_slope`/
/// `right_superelevation_slope` default to the federal normal crown (`-0.02`)
/// when the caller has no superelevation curve to consult.
pub fn resolve_assembly_offset(assembly: &Assembly, left_superelevation_slope: f64, right_superelevation_slope: f64) -> Vec<AssemblyPoint> {
    let mut points = vec![AssemblyPoint { code: "Centerline".to_string(), x: 0.0, y: 0.0 }];

    resolve_side(assembly.left_subassemblies.as_slice(), -1.0, left_superelevation_slope, &mut points);
    resolve_side(assembly.right_subassemblies.as_slice(), 1.0, right_superelevation_slope, &mut points);

    points
}

/// Federal default normal crown, mirroring `federalReference.json`'s
/// `standards.roads.normalCrown`.
pub const DEFAULT_NORMAL_CROWN: f64 = -0.02;
/// Federal default lane width (ft), mirroring `standards.roads.defaultLaneWidthFt`.
pub const DEFAULT_LANE_WIDTH_FT: f64 = 12.0;

fn resolve_side(subassemblies: &[Subassembly], side_sign: f64, slope: f64, points: &mut Vec<AssemblyPoint>) {
    let mut current_x = 0.0;
    let mut current_y = 0.0;

    for sub in subassemblies {
        let side_label = if sub.side == Side::Left { "left" } else { "right" };
        match sub.subassembly_type {
            SubassemblyType::Lane => {
                let width = sub.get("Width", DEFAULT_LANE_WIDTH_FT);
                current_x += width * side_sign;
                current_y += width * slope;
                points.push(AssemblyPoint { code: format!("EdgeOfPavement_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::CurbAndGutter => {
                let width = sub.get("CurbWidth", 1.5);
                let height = sub.get("CurbHeight", 0.5);
                points.push(AssemblyPoint { code: format!("CurbGutter_{side_label}"), x: current_x, y: current_y });
                current_x += width * side_sign;
                current_y += height;
                points.push(AssemblyPoint { code: format!("CurbTop_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::Sidewalk => {
                let width = sub.get("SidewalkWidth", 5.0);
                let slope_val = sub.get("SidewalkSlope", 0.01);
                current_x += width * side_sign;
                current_y += width * slope_val;
                points.push(AssemblyPoint { code: format!("SidewalkOuter_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::Median => {
                let width = sub.get("Width", 10.0);
                let depth = sub.get("DepressionDepth", 0.5);
                points.push(AssemblyPoint { code: format!("MedianEdge_{side_label}"), x: current_x, y: current_y });
                current_x += (width / 2.0) * side_sign;
                current_y -= depth;
                points.push(AssemblyPoint { code: format!("MedianCenter_{side_label}"), x: current_x, y: current_y });
                current_x += (width / 2.0) * side_sign;
                current_y += depth;
                points.push(AssemblyPoint { code: format!("MedianOuter_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::RetainingWall => {
                let height = sub.get("WallHeight", 6.0);
                let thickness = sub.get("WallThickness", 1.0);
                points.push(AssemblyPoint { code: format!("RetainingWallBase_{side_label}"), x: current_x, y: current_y });
                current_y += height;
                points.push(AssemblyPoint { code: format!("RetainingWallTop_{side_label}"), x: current_x, y: current_y });
                current_x += thickness * side_sign;
                points.push(AssemblyPoint { code: format!("RetainingWallBack_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::DaylightBench => {
                let bench_width = sub.get("BenchWidth", 4.0);
                let bench_height = sub.get("BenchHeight", 10.0);
                let slope = sub.get("Slope", 2.0);
                current_x += (bench_height * slope) * side_sign;
                current_y -= bench_height;
                points.push(AssemblyPoint { code: format!("BenchStep_{side_label}"), x: current_x, y: current_y });
                current_x += bench_width * side_sign;
                points.push(AssemblyPoint { code: format!("BenchFlat_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::LinkWidthAndSlope => {
                let width = sub.get("Width", 8.0);
                let link_slope = sub.get("Slope", -0.04);
                current_x += width * side_sign;
                current_y += width * link_slope;
                points.push(AssemblyPoint { code: format!("LinkWidthSlope_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::ConditionalCutOrFill => {
                let mode = if sub.get("IsCut", 1.0) == 1.0 { "Cut" } else { "Fill" };
                points.push(AssemblyPoint { code: format!("Conditional_{mode}_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::Daylight => {
                let fill_slope = sub.get("FillSlope", 3.0);
                let assumed_depth = 10.0;
                current_x += (assumed_depth * fill_slope) * side_sign;
                current_y -= assumed_depth;
                points.push(AssemblyPoint { code: format!("DaylightTarget_{side_label}"), x: current_x, y: current_y });
            }
            SubassemblyType::LinkSlopeToSurface | SubassemblyType::SubassemblyTransition => {
                // Not modeled by the TS `resolveAssemblyOffset` either — these
                // variants exist in the type union but have no case in the
                // upstream `if/else if` chain, so they emit no point here.
            }
        }
    }
}

/// Mirrors subassemblies from one side to the opposite side while flipping
/// side parameters.
pub fn mirror_subassemblies(subassemblies: &[Subassembly], target_side: Side) -> Vec<Subassembly> {
    subassemblies
        .iter()
        .map(|sub| Subassembly {
            id: format!("{}-mirrored", sub.id.replacen(if sub.side == Side::Left { "left" } else { "right" }, if target_side == Side::Left { "left" } else { "right" }, 1)),
            name: sub.name.replacen(if sub.side == Side::Left { "Left" } else { "Right" }, if target_side == Side::Left { "Left" } else { "Right" }, 1),
            side: target_side,
            subassembly_type: sub.subassembly_type,
            parameters: sub.parameters.clone(),
        })
        .collect()
}

/// Exports an [`Assembly`] configuration to an Assembly Set XML string.
pub fn export_assembly_set_to_xml(assembly: &Assembly) -> String {
    fn format_subs(subs: &[Subassembly]) -> String {
        subs.iter()
            .map(|s| {
                let side = if s.side == Side::Left { "left" } else { "right" };
                let params = s.parameters.iter().map(|p| format!("          <Param name=\"{}\" value=\"{}\"/>", p.name, p.value)).collect::<Vec<_>>().join("\n");
                format!("        <Subassembly id=\"{}\" name=\"{}\" side=\"{}\" type=\"{:?}\">\n{}\n        </Subassembly>", s.id, s.name, side, s.subassembly_type, params)
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    format!(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<AssemblySet name=\"{}\">\n  <Assembly id=\"{}\">\n    <LeftSubassemblies>\n{}\n    </LeftSubassemblies>\n    <RightSubassemblies>\n{}\n    </RightSubassemblies>\n  </Assembly>\n</AssemblySet>",
        assembly.name,
        assembly.id,
        format_subs(&assembly.left_subassemblies),
        format_subs(&assembly.right_subassemblies)
    )
}

/// Returns default subassembly templates (lane, curb, sidewalk, daylight) for
/// one side, using the federal-data fallback values (see the module
/// doc-comment on why the parts-catalog overrides aren't consulted here).
pub fn get_default_subassemblies(side: Side) -> Vec<Subassembly> {
    let label = if side == Side::Left { "left" } else { "right" };
    let cap = if side == Side::Left { "Left" } else { "Right" };
    vec![
        Subassembly {
            id: format!("{label}-lane-1"),
            name: format!("{cap} Lane"),
            side,
            subassembly_type: SubassemblyType::Lane,
            parameters: vec![SubassemblyParam { name: "Width", value: 12.0 }, SubassemblyParam { name: "Slope", value: -0.02 }],
        },
        Subassembly {
            id: format!("{label}-curb-1"),
            name: format!("{cap} Curb"),
            side,
            subassembly_type: SubassemblyType::CurbAndGutter,
            parameters: vec![SubassemblyParam { name: "CurbWidth", value: 1.5 }, SubassemblyParam { name: "CurbHeight", value: 0.5 }],
        },
        Subassembly {
            id: format!("{label}-sidewalk-1"),
            name: format!("{cap} Sidewalk"),
            side,
            subassembly_type: SubassemblyType::Sidewalk,
            parameters: vec![SubassemblyParam { name: "SidewalkWidth", value: 5.0 }, SubassemblyParam { name: "SidewalkSlope", value: 0.015 }],
        },
        Subassembly {
            id: format!("{label}-daylight-1"),
            name: format!("{cap} Daylight"),
            side,
            subassembly_type: SubassemblyType::Daylight,
            parameters: vec![SubassemblyParam { name: "CutSlope", value: 2.0 }, SubassemblyParam { name: "FillSlope", value: 3.0 }],
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lane(id: &str, side: Side, width: f64) -> Subassembly {
        Subassembly { id: id.to_string(), name: format!("{:?} Lane", side), side, subassembly_type: SubassemblyType::Lane, parameters: vec![SubassemblyParam { name: "Width", value: width }] }
    }

    #[test]
    fn resolves_coordinate_offsets_along_assembly_components() {
        let assembly = Assembly { id: "as-1".into(), name: "Assembly A".into(), left_subassemblies: vec![lane("l1", Side::Left, 12.0)], right_subassemblies: vec![lane("r1", Side::Right, 12.0)] };
        let points = resolve_assembly_offset(&assembly, -0.02, -0.02);
        assert_eq!(points.len(), 3);
        assert_eq!(points.iter().find(|p| p.code == "EdgeOfPavement_left").unwrap().x, -12.0);
        assert_eq!(points.iter().find(|p| p.code == "EdgeOfPavement_right").unwrap().x, 12.0);
    }

    #[test]
    fn mirror_subassemblies_flips_side_and_relabels() {
        let subs = vec![lane("left-lane-1", Side::Left, 12.0)];
        let mirrored = mirror_subassemblies(&subs, Side::Right);
        assert_eq!(mirrored[0].side, Side::Right);
        assert_eq!(mirrored[0].id, "right-lane-1-mirrored");
    }

    #[test]
    fn get_default_subassemblies_returns_four_components() {
        let left = get_default_subassemblies(Side::Left);
        assert_eq!(left.len(), 4);
        assert_eq!(left[0].subassembly_type, SubassemblyType::Lane);
    }

    #[test]
    fn export_assembly_set_to_xml_contains_subassembly_ids() {
        let assembly = Assembly { id: "as-1".into(), name: "A".into(), left_subassemblies: vec![lane("l1", Side::Left, 12.0)], right_subassemblies: vec![] };
        let xml = export_assembly_set_to_xml(&assembly);
        assert!(xml.contains("id=\"l1\""));
        assert!(xml.contains("AssemblySet name=\"A\""));
    }
}
