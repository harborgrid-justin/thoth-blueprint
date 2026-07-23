//! AASHTO crest/sag parabolic vertical-curve **minimum-length design**:
//! given a design speed and an algebraic grade break, compute the minimum
//! K-value and curve length that provide stopping sight distance.
//!
//! This is the "design" counterpart to
//! [`crate::sight_distance::check_vertical_sight_distance`], which
//! evaluates an *existing* curve. Both build on the same first-principles
//! AASHTO Green Book 7th Ed. §3.4 sight-distance/curve-length relationships
//! (rather than a rounded K-value lookup table), so a caller gets the exact
//! minimum length for its actual grade break, not a table's nearest
//! 5-mph-bucket approximation.

use crate::error::{TransportationError, TransportationResult};
use crate::sight_distance::stopping_sight_distance;

/// Driver eye height assumed for the stopping-sight-distance criterion,
/// feet. AASHTO Green Book 7th Ed. §3.4.1 (unchanged since the 2001
/// edition).
pub const EYE_HEIGHT_FT: f64 = 3.5;
/// Object height assumed for the stopping-sight-distance criterion, feet.
/// AASHTO Green Book 7th Ed. §3.4.1.
pub const OBJECT_HEIGHT_FT: f64 = 2.0;
/// Headlight height assumed for the sag-curve night-driving (headlight
/// sight-distance) criterion, feet. AASHTO Green Book 7th Ed. §3.4.4.
pub const HEADLIGHT_HEIGHT_FT: f64 = 2.0;
/// Upward divergence angle of the headlight beam from the vehicle's
/// longitudinal axis, degrees. AASHTO Green Book 7th Ed. §3.4.4.
pub const HEADLIGHT_DIVERGENCE_DEG: f64 = 1.0;

/// Crest-curve constant `100·(√(2·h1) + √(2·h2))²` derived from
/// [`EYE_HEIGHT_FT`]/[`OBJECT_HEIGHT_FT`] (AASHTO's widely quoted "2158"
/// figure — computed here from first principles rather than hardcoded so it
/// stays consistent with the named eye/object heights above).
fn crest_constant() -> f64 {
    100.0 * ((2.0 * EYE_HEIGHT_FT).sqrt() + (2.0 * OBJECT_HEIGHT_FT).sqrt()).powi(2)
}

/// Sag-curve headlight-sight-distance denominator constant `200·h1`
/// (AASHTO's widely quoted "400" term, `= 200 * 2.0 ft`).
fn sag_constant_a() -> f64 {
    200.0 * HEADLIGHT_HEIGHT_FT
}

/// Sag-curve headlight-sight-distance denominator slope constant
/// `200·tan(β)` (AASHTO's widely quoted "3.5" coefficient of S).
fn sag_constant_b() -> f64 {
    200.0 * HEADLIGHT_DIVERGENCE_DEG.to_radians().tan()
}

/// Minimum crest vertical-curve length (feet) and its K-value (`L / A`) that
/// provide stopping sight distance for `design_speed_mph` across an
/// algebraic grade break of `grade_break_pct` **percent** (e.g. `6.0` for a
/// −2% to +4% break).
///
/// AASHTO Green Book 7th Ed. Equations 3-43/3-44 (crest curve, SSD
/// criterion), using the exact stopping sight distance from
/// [`stopping_sight_distance`] (level grade) rather than a rounded table
/// entry:
/// - If `S <= L`: `L = A·S² / 2158` (using [`crest_constant`] in place of
///   the rounded 2158).
/// - If `S > L`: `L = 2S − 2158/A`.
///
/// # Errors
/// - [`TransportationError::DesignSpeedOutOfRange`] — see
///   [`stopping_sight_distance`].
/// - [`TransportationError::NonPositiveValue`] if `grade_break_pct <= 0`
///   (there is no crest to design a curve for).
pub fn crest_curve_min_length(
    design_speed_mph: f64,
    grade_break_pct: f64,
) -> TransportationResult<(f64, f64)> {
    if grade_break_pct <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "grade_break_pct",
            value: grade_break_pct,
        });
    }
    let s = stopping_sight_distance(design_speed_mph, 0.0)?;
    let k_const = crest_constant();

    // Try the S <= L branch first; it's self-consistent only if the
    // resulting L is actually >= S.
    let l_if_short = grade_break_pct * s * s / k_const;
    let length = if l_if_short >= s {
        l_if_short
    } else {
        2.0 * s - k_const / grade_break_pct
    };
    let length = length.max(0.0);
    let k_value = length / grade_break_pct;
    Ok((length, k_value))
}

/// Minimum sag vertical-curve length (feet) and its K-value (`L / A`) that
/// provide headlight sight distance for `design_speed_mph` across an
/// algebraic grade break of `grade_break_pct` **percent**.
///
/// AASHTO Green Book 7th Ed. Equations 3-50/3-51 (sag curve, headlight
/// sight-distance criterion, the governing sag-curve criterion for typical
/// rural/undivided cross-sections):
/// - If `S <= L`: `L = A·S² / (200·(h1 + S·tan β)) = A·S² / (400 + 3.5·S)`
///   (using [`sag_constant_a`]/[`sag_constant_b`] in place of the rounded
///   400/3.5 coefficients).
/// - If `S > L`: `L = 2S − (400 + 3.5·S)/A`, i.e.
///   `S = (A·L + (400+3.5·S))/(2A)` solved for the S > L regime — here
///   solved directly for `L` given `S` and `A` (the inverse of the S<=L
///   case's positive quadratic root check).
///
/// # Errors
/// Same as [`crest_curve_min_length`].
pub fn sag_curve_min_length(
    design_speed_mph: f64,
    grade_break_pct: f64,
) -> TransportationResult<(f64, f64)> {
    if grade_break_pct <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "grade_break_pct",
            value: grade_break_pct,
        });
    }
    let s = stopping_sight_distance(design_speed_mph, 0.0)?;
    let a0 = sag_constant_a();
    let a1 = sag_constant_b();

    let l_if_short = grade_break_pct * s * s / (a0 + a1 * s);
    let length = if l_if_short >= s {
        l_if_short
    } else {
        2.0 * s - (a0 + a1 * s) / grade_break_pct
    };
    let length = length.max(0.0);
    let k_value = length / grade_break_pct;
    Ok((length, k_value))
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn crest_min_length_matches_published_aashto_k_value_at_50mph() {
        // AASHTO Green Book Table 3-34 (Design Controls for Crest Vertical
        // Curves, SSD basis): 50 mph -> K = 84 (rounded design value).
        let (_, k) = crest_curve_min_length(50.0, 1.0).unwrap();
        assert_relative_eq!(k, 84.0, epsilon = 8.0);
    }

    #[test]
    fn crest_min_length_scales_linearly_with_grade_break_in_short_regime() {
        let (l3, _) = crest_curve_min_length(40.0, 3.0).unwrap();
        let (l6, _) = crest_curve_min_length(40.0, 6.0).unwrap();
        // In the S <= L regime, L is proportional to A.
        assert_relative_eq!(l6 / l3, 2.0, epsilon = 1e-6);
    }

    #[test]
    fn crest_min_length_switches_branch_for_small_grade_break() {
        // A tiny grade break makes the S<=L formula predict L < S, so the
        // S>L branch must take over, giving L close to (but below) 2S.
        let s = stopping_sight_distance(60.0, 0.0).unwrap();
        let (l, _) = crest_curve_min_length(60.0, 0.05).unwrap();
        assert!(l < 2.0 * s);
        assert!(l > 0.0);
    }

    #[test]
    fn crest_min_length_rejects_zero_grade_break() {
        assert!(matches!(
            crest_curve_min_length(50.0, 0.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }

    #[test]
    fn sag_min_length_matches_published_aashto_k_value_at_50mph() {
        // AASHTO Green Book Table 3-36 (Design Controls for Sag Vertical
        // Curves, headlight-sight-distance basis): 50 mph -> K = 96.
        let (_, k) = sag_curve_min_length(50.0, 1.0).unwrap();
        assert_relative_eq!(k, 96.0, epsilon = 8.0);
    }

    #[test]
    fn sag_min_length_is_positive_and_finite_across_speed_range() {
        for v in [15.0, 25.0, 35.0, 45.0, 55.0, 65.0, 75.0] {
            let (l, k) = sag_curve_min_length(v, 4.0).unwrap();
            assert!(l > 0.0 && l.is_finite());
            assert!(k > 0.0 && k.is_finite());
        }
    }

    #[test]
    fn crest_and_sag_lengths_increase_monotonically_with_design_speed() {
        let mut last_crest = 0.0;
        let mut last_sag = 0.0;
        for v in [20.0, 30.0, 40.0, 50.0, 60.0, 70.0] {
            let (crest, _) = crest_curve_min_length(v, 4.0).unwrap();
            let (sag, _) = sag_curve_min_length(v, 4.0).unwrap();
            assert!(crest > last_crest);
            assert!(sag > last_sag);
            last_crest = crest;
            last_sag = sag;
        }
    }
}
