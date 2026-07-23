//! Assembly/subassembly summary formatting for the assembly-builder panel.
//! Direct port of
//! `packages/domain/src/survey/helpers/assemblyBuilderHelpers.ts`.
//!
//! Unlocked this pass by adding `thoth-civil` as a dependency (see
//! `../../GAPS.md` #3 and `../../STATUS.md`).

use thoth_civil::assembly::{Assembly, Side, Subassembly};

/// One-line human summary of a subassembly: `"{name} ({side}) - {n} params"`,
/// e.g. `"Left Lane (left) - 2 params"`. `side` is rendered lowercase,
/// matching the TS original's `"left" | "right"` string literal type.
pub fn format_subassembly_summary(sub: &Subassembly) -> String {
    let side = match sub.side {
        Side::Left => "left",
        Side::Right => "right",
    };
    format!("{} ({side}) - {} params", sub.name, sub.parameters.len())
}

/// Total left/right/combined assembly widths, in plan units.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AssemblyWidths {
    pub left_width: f64,
    pub right_width: f64,
    pub total_width: f64,
}

/// Sums each side's `"Width"` parameters. A subassembly with no `"Width"`
/// parameter, or a non-finite one, contributes `0` (mirrors the TS
/// `isNaN(val) ? 0 : val` guard, applied here to a value that in Rust is
/// already a typed `f64` rather than `Number(widthParam.value)`).
pub fn total_assembly_width(assembly: &Assembly) -> AssemblyWidths {
    fn side_width(subs: &[Subassembly]) -> f64 {
        subs.iter()
            .map(|s| {
                s.parameters
                    .iter()
                    .find(|p| p.name == "Width")
                    .map(|p| p.value)
                    .filter(|v| !v.is_nan())
                    .unwrap_or(0.0)
            })
            .sum()
    }

    let left_width = side_width(&assembly.left_subassemblies);
    let right_width = side_width(&assembly.right_subassemblies);
    AssemblyWidths {
        left_width,
        right_width,
        total_width: left_width + right_width,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use thoth_civil::assembly::{SubassemblyParam, SubassemblyType};

    fn lane(id: &str, side: Side, width: f64) -> Subassembly {
        Subassembly {
            id: id.to_string(),
            name: format!("{:?} Lane", side),
            side,
            subassembly_type: SubassemblyType::Lane,
            parameters: vec![SubassemblyParam {
                name: "Width",
                value: width,
            }],
        }
    }

    #[test]
    fn summarizes_a_subassembly_with_lowercase_side_and_param_count() {
        let sub = lane("l1", Side::Left, 12.0);
        assert_eq!(
            format_subassembly_summary(&sub),
            "Left Lane (left) - 1 params"
        );
    }

    #[test]
    fn summarizes_a_subassembly_with_no_parameters() {
        let sub = Subassembly {
            id: "d1".into(),
            name: "Daylight".into(),
            side: Side::Right,
            subassembly_type: SubassemblyType::Daylight,
            parameters: vec![],
        };
        assert_eq!(
            format_subassembly_summary(&sub),
            "Daylight (right) - 0 params"
        );
    }

    #[test]
    fn sums_left_right_and_total_widths() {
        let assembly = Assembly {
            id: "as-1".into(),
            name: "A".into(),
            left_subassemblies: vec![lane("l1", Side::Left, 12.0), lane("l2", Side::Left, 5.0)],
            right_subassemblies: vec![lane("r1", Side::Right, 12.0)],
        };
        let widths = total_assembly_width(&assembly);
        assert_relative_eq!(widths.left_width, 17.0, epsilon = 1e-9);
        assert_relative_eq!(widths.right_width, 12.0, epsilon = 1e-9);
        assert_relative_eq!(widths.total_width, 29.0, epsilon = 1e-9);
    }

    #[test]
    fn subassemblies_without_a_width_parameter_contribute_zero() {
        let assembly = Assembly {
            id: "as-2".into(),
            name: "B".into(),
            left_subassemblies: vec![Subassembly {
                id: "cg1".into(),
                name: "Curb".into(),
                side: Side::Left,
                subassembly_type: SubassemblyType::CurbAndGutter,
                parameters: vec![SubassemblyParam {
                    name: "CurbWidth",
                    value: 1.5,
                }],
            }],
            right_subassemblies: vec![],
        };
        let widths = total_assembly_width(&assembly);
        assert_relative_eq!(widths.left_width, 0.0, epsilon = 1e-9);
        assert_relative_eq!(widths.total_width, 0.0, epsilon = 1e-9);
    }

    #[test]
    fn a_nan_width_parameter_contributes_zero() {
        let assembly = Assembly {
            id: "as-3".into(),
            name: "C".into(),
            left_subassemblies: vec![Subassembly {
                id: "l1".into(),
                name: "Odd Lane".into(),
                side: Side::Left,
                subassembly_type: SubassemblyType::Lane,
                parameters: vec![SubassemblyParam {
                    name: "Width",
                    value: f64::NAN,
                }],
            }],
            right_subassemblies: vec![],
        };
        assert_relative_eq!(
            total_assembly_width(&assembly).left_width,
            0.0,
            epsilon = 1e-9
        );
    }
}
