//! Runoff-reduction crediting for green infrastructure: a composable
//! "credit" that reduces effective impervious area (and thus effective
//! curve number) feeding into the Rational Method ([`crate::rational`]) or
//! TR-55 curve-number runoff ([`crate::curve_number`]).
//!
//! Source: the general "effective impervious area reduction" crediting
//! method several state runoff-reduction frameworks use to quantify a green
//! infrastructure practice's benefit (e.g. Virginia's Runoff Reduction
//! Method, as implemented in the VRRM spreadsheet) — treating a portion of
//! a drainage area's impervious cover as hydrologically "disconnected"
//! (behaving like pervious land) because a BMP intercepts and infiltrates
//! its runoff before it reaches the conveyance system, then re-computing
//! the composite curve number/runoff coefficient with that reduced
//! effective impervious area.
//!
//! # Assumptions and valid range
//! - This module models credit as **area reclassification** (impervious →
//!   pervious for the credited area), not as a direct percentage
//!   reduction applied to a final CN or peak flow — recomputing the
//!   composite CN/`C` from adjusted areas keeps the credit physically
//!   interpretable (it corresponds to "this many square feet no longer
//!   drain as impervious cover") rather than an opaque multiplier.
//! - A single credited area cannot exceed the impervious area it draws
//!   from; requesting more than 100% of an area's impervious cover to be
//!   credited is rejected rather than silently clamped.

use crate::error::{HydroResult, HydrologyError};

/// A runoff-reduction credit: `disconnected_impervious_area_sqft` of a
/// drainage area's impervious cover is treated as pervious (using
/// `pervious_cn`/`pervious_c` instead of the impervious value) because a
/// green infrastructure practice intercepts its runoff.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RunoffReductionCredit {
    pub disconnected_impervious_area_sqft: f64,
}

/// Apply a [`RunoffReductionCredit`] to a two-part (impervious/pervious)
/// drainage area and recompute the area-weighted composite curve number.
///
/// `impervious_area_sqft` and `pervious_area_sqft` describe the
/// pre-credit area breakdown; `impervious_cn`/`pervious_cn` are their
/// respective curve numbers (see [`crate::curve_number`] for standard TR-55
/// lookups). Returns the post-credit composite CN, as if
/// `credit.disconnected_impervious_area_sqft` of the impervious area were
/// reclassified to `pervious_cn`.
///
/// # Errors
/// - [`HydrologyError::NonPositiveArea`] if `impervious_area_sqft < 0`,
///   `pervious_area_sqft < 0`, or their sum is not positive.
/// - [`HydrologyError::CurveNumberOutOfRange`] if either CN is outside
///   `[30, 100]`.
/// - [`HydrologyError::ShapeMismatch`] if
///   `credit.disconnected_impervious_area_sqft` exceeds
///   `impervious_area_sqft` (a credit cannot disconnect more area than
///   exists).
///
/// # Example
/// A 1-acre (43,560 ft²) lot, 60% impervious (CN 98) / 40% pervious open
/// space (CN 61), with 5,000 ft² of impervious area disconnected via a
/// bioretention cell:
/// ```
/// use thoth_hydrology::credit::{apply_credit_to_composite_cn, RunoffReductionCredit};
///
/// let impervious = 43_560.0 * 0.6;
/// let pervious = 43_560.0 * 0.4;
/// let credit = RunoffReductionCredit {
///     disconnected_impervious_area_sqft: 5_000.0,
/// };
/// let cn_before =
///     apply_credit_to_composite_cn(impervious, 98.0, pervious, 61.0, RunoffReductionCredit {
///         disconnected_impervious_area_sqft: 0.0,
///     })
///     .unwrap();
/// let cn_after = apply_credit_to_composite_cn(impervious, 98.0, pervious, 61.0, credit).unwrap();
/// assert!(cn_after < cn_before);
/// ```
pub fn apply_credit_to_composite_cn(
    impervious_area_sqft: f64,
    impervious_cn: f64,
    pervious_area_sqft: f64,
    pervious_cn: f64,
    credit: RunoffReductionCredit,
) -> HydroResult<f64> {
    if impervious_area_sqft < 0.0 {
        return Err(HydrologyError::NonPositiveArea {
            area: impervious_area_sqft,
        });
    }
    if pervious_area_sqft < 0.0 {
        return Err(HydrologyError::NonPositiveArea {
            area: pervious_area_sqft,
        });
    }
    let total = impervious_area_sqft + pervious_area_sqft;
    if total <= 0.0 {
        return Err(HydrologyError::NonPositiveArea { area: total });
    }
    if !(30.0..=100.0).contains(&impervious_cn) {
        return Err(HydrologyError::CurveNumberOutOfRange { cn: impervious_cn });
    }
    if !(30.0..=100.0).contains(&pervious_cn) {
        return Err(HydrologyError::CurveNumberOutOfRange { cn: pervious_cn });
    }
    if credit.disconnected_impervious_area_sqft > impervious_area_sqft {
        return Err(HydrologyError::ShapeMismatch {
            reason: format!(
                "credit disconnects {} sq ft but only {} sq ft of impervious area exists",
                credit.disconnected_impervious_area_sqft, impervious_area_sqft
            ),
        });
    }
    if credit.disconnected_impervious_area_sqft < 0.0 {
        return Err(HydrologyError::NonPositiveArea {
            area: credit.disconnected_impervious_area_sqft,
        });
    }

    let remaining_impervious = impervious_area_sqft - credit.disconnected_impervious_area_sqft;
    let effective_pervious = pervious_area_sqft + credit.disconnected_impervious_area_sqft;
    let weighted = remaining_impervious * impervious_cn + effective_pervious * pervious_cn;
    Ok(weighted / total)
}

/// Apply a [`RunoffReductionCredit`] to a two-part (impervious/pervious)
/// drainage area and recompute the area-weighted composite Rational Method
/// runoff coefficient, analogous to
/// [`apply_credit_to_composite_cn`] but for `C` instead of `CN`.
///
/// # Errors
/// - [`HydrologyError::NonPositiveArea`] as in
///   [`apply_credit_to_composite_cn`].
/// - [`HydrologyError::RunoffCoefficientOutOfRange`] if either coefficient
///   is outside `[0, 1]`.
/// - [`HydrologyError::ShapeMismatch`] as in
///   [`apply_credit_to_composite_cn`].
pub fn apply_credit_to_composite_c(
    impervious_area_sqft: f64,
    impervious_c: f64,
    pervious_area_sqft: f64,
    pervious_c: f64,
    credit: RunoffReductionCredit,
) -> HydroResult<f64> {
    if impervious_area_sqft < 0.0 {
        return Err(HydrologyError::NonPositiveArea {
            area: impervious_area_sqft,
        });
    }
    if pervious_area_sqft < 0.0 {
        return Err(HydrologyError::NonPositiveArea {
            area: pervious_area_sqft,
        });
    }
    let total = impervious_area_sqft + pervious_area_sqft;
    if total <= 0.0 {
        return Err(HydrologyError::NonPositiveArea { area: total });
    }
    if !(0.0..=1.0).contains(&impervious_c) {
        return Err(HydrologyError::RunoffCoefficientOutOfRange { c: impervious_c });
    }
    if !(0.0..=1.0).contains(&pervious_c) {
        return Err(HydrologyError::RunoffCoefficientOutOfRange { c: pervious_c });
    }
    if credit.disconnected_impervious_area_sqft > impervious_area_sqft {
        return Err(HydrologyError::ShapeMismatch {
            reason: format!(
                "credit disconnects {} sq ft but only {} sq ft of impervious area exists",
                credit.disconnected_impervious_area_sqft, impervious_area_sqft
            ),
        });
    }
    if credit.disconnected_impervious_area_sqft < 0.0 {
        return Err(HydrologyError::NonPositiveArea {
            area: credit.disconnected_impervious_area_sqft,
        });
    }

    let remaining_impervious = impervious_area_sqft - credit.disconnected_impervious_area_sqft;
    let effective_pervious = pervious_area_sqft + credit.disconnected_impervious_area_sqft;
    let weighted = remaining_impervious * impervious_c + effective_pervious * pervious_c;
    Ok(weighted / total)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn credit_reduces_composite_cn() {
        let impervious = 43_560.0 * 0.6;
        let pervious = 43_560.0 * 0.4;
        let no_credit = RunoffReductionCredit {
            disconnected_impervious_area_sqft: 0.0,
        };
        let with_credit = RunoffReductionCredit {
            disconnected_impervious_area_sqft: 5_000.0,
        };
        let cn_before =
            apply_credit_to_composite_cn(impervious, 98.0, pervious, 61.0, no_credit).unwrap();
        let cn_after =
            apply_credit_to_composite_cn(impervious, 98.0, pervious, 61.0, with_credit).unwrap();
        assert!(cn_after < cn_before);

        // Sanity: matches direct area-weighted computation.
        let expected =
            ((impervious - 5_000.0) * 98.0 + (pervious + 5_000.0) * 61.0) / (impervious + pervious);
        assert_relative_eq!(cn_after, expected, epsilon = 1e-9);
    }

    #[test]
    fn zero_credit_matches_uncredited_composite() {
        let impervious = 1000.0;
        let pervious = 1000.0;
        let credit = RunoffReductionCredit {
            disconnected_impervious_area_sqft: 0.0,
        };
        let cn = apply_credit_to_composite_cn(impervious, 98.0, pervious, 61.0, credit).unwrap();
        assert_relative_eq!(cn, (98.0 + 61.0) / 2.0, epsilon = 1e-9);
    }

    #[test]
    fn full_disconnection_matches_all_pervious_cn() {
        let impervious = 1000.0;
        let pervious = 1000.0;
        let credit = RunoffReductionCredit {
            disconnected_impervious_area_sqft: 1000.0,
        };
        let cn = apply_credit_to_composite_cn(impervious, 98.0, pervious, 61.0, credit).unwrap();
        assert_relative_eq!(cn, 61.0, epsilon = 1e-9);
    }

    #[test]
    fn rejects_credit_exceeding_available_impervious_area() {
        let credit = RunoffReductionCredit {
            disconnected_impervious_area_sqft: 2000.0,
        };
        assert!(matches!(
            apply_credit_to_composite_cn(1000.0, 98.0, 1000.0, 61.0, credit),
            Err(HydrologyError::ShapeMismatch { .. })
        ));
    }

    #[test]
    fn rejects_negative_credit() {
        let credit = RunoffReductionCredit {
            disconnected_impervious_area_sqft: -1.0,
        };
        assert!(apply_credit_to_composite_cn(1000.0, 98.0, 1000.0, 61.0, credit).is_err());
    }

    #[test]
    fn c_variant_matches_cn_variant_shape() {
        let credit = RunoffReductionCredit {
            disconnected_impervious_area_sqft: 500.0,
        };
        let c = apply_credit_to_composite_c(1000.0, 0.9, 1000.0, 0.2, credit).unwrap();
        let expected = (500.0 * 0.9 + 1500.0 * 0.2) / 2000.0;
        assert_relative_eq!(c, expected, epsilon = 1e-9);
    }

    #[test]
    fn c_variant_rejects_out_of_range_coefficient() {
        let credit = RunoffReductionCredit {
            disconnected_impervious_area_sqft: 0.0,
        };
        assert!(apply_credit_to_composite_c(1000.0, 1.5, 1000.0, 0.2, credit).is_err());
    }
}
