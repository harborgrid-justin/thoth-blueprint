//! Paper/model unit conversions shared by the sheet-composition modules. Port
//! of `drawing/common/units.ts`.

use thoth_spatial::Unit;

use crate::drafting::scale_ratio;
use crate::error::DrawingError;
use crate::sheetsize::PaperUnit;

/// Metres per one paper unit, mirroring the TS `METERS_PER_PAPER_UNIT` table.
fn meters_per_paper_unit(unit: PaperUnit) -> f64 {
    match unit {
        PaperUnit::In => 0.0254,
        PaperUnit::Mm => 0.001,
    }
}

const IN_PER_MM: f64 = 1.0 / 25.4;

/// Paper units per one model unit for a named scale, given the model's length
/// unit and the sheet's paper unit. A drawing scale is a dimensionless
/// real-to-paper ratio (e.g. 1"=20' -> 240, 1:100 -> 100); this reconciles the
/// unit families through metres so the result is unambiguous.
///
/// Errors with [`DrawingError::InvalidScale`] if the resolved ratio is
/// non-finite or non-positive (a malformed/degenerate scale) rather than
/// silently returning `NaN`/`Infinity` for a caller to trip over downstream —
/// the TS original has no such guard.
pub fn paper_per_model(
    scale_id: &str,
    model_unit: Unit,
    paper_unit: PaperUnit,
) -> Result<f64, DrawingError> {
    let ratio = scale_ratio(scale_id);
    let result = model_unit.meters_per_unit() / (ratio * meters_per_paper_unit(paper_unit));
    validate_ratio(scale_id, result)
}

/// Reject a non-finite or non-positive paper-per-model ratio. Split out from
/// [`paper_per_model`] so the guard itself is directly testable — every
/// currently-registered scale/unit combination is sane, so this branch is
/// otherwise unreachable through the public API.
fn validate_ratio(scale_id: &str, result: f64) -> Result<f64, DrawingError> {
    if !result.is_finite() || result <= 0.0 {
        return Err(DrawingError::InvalidScale {
            scale_id: scale_id.to_string(),
            ratio: result,
        });
    }
    Ok(result)
}

/// Convert a paper measure to PDF points (1 in = 72 pt).
pub fn paper_to_points(value: f64, unit: PaperUnit) -> f64 {
    match unit {
        PaperUnit::In => value * 72.0,
        PaperUnit::Mm => value * IN_PER_MM * 72.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn paper_per_model_matches_hand_computed_ratio_for_eng_20_feet_inches() {
        // 1"=20' with feet model units, inch paper units:
        // meters_per_unit(feet)=0.3048, ratio=240, meters_per_in=0.0254
        // => 0.3048 / (240 * 0.0254) = 0.05
        let s = paper_per_model("eng-20", Unit::Feet, PaperUnit::In).unwrap();
        assert_relative_eq!(s, 0.3048 / (240.0 * 0.0254), epsilon = 1e-12);
    }

    #[test]
    fn paper_to_points_converts_inches_and_millimetres() {
        assert_relative_eq!(paper_to_points(1.0, PaperUnit::In), 72.0, epsilon = 1e-9);
        assert_relative_eq!(paper_to_points(25.4, PaperUnit::Mm), 72.0, epsilon = 1e-9);
    }

    #[test]
    fn paper_per_model_resolves_unknown_scale_ids_via_the_eng_20_fallback() {
        // Every registered scale/unit combination is sane, so unknown ids
        // fall back to a valid ratio rather than ever tripping the guard.
        let s = paper_per_model("does-not-exist", Unit::Meters, PaperUnit::In);
        assert!(s.is_ok());
    }

    #[test]
    fn validate_ratio_rejects_non_finite_and_non_positive_values() {
        assert!(matches!(
            validate_ratio("bad", f64::NAN),
            Err(DrawingError::InvalidScale { .. })
        ));
        assert!(matches!(
            validate_ratio("bad", f64::INFINITY),
            Err(DrawingError::InvalidScale { .. })
        ));
        assert_eq!(
            validate_ratio("bad", 0.0),
            Err(DrawingError::InvalidScale {
                scale_id: "bad".to_string(),
                ratio: 0.0
            })
        );
        assert_eq!(
            validate_ratio("bad", -1.0),
            Err(DrawingError::InvalidScale {
                scale_id: "bad".to_string(),
                ratio: -1.0
            })
        );
        assert!(validate_ratio("ok", 1.0).is_ok());
    }
}
