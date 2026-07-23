//! AASHTO stopping-sight-distance (SSD) computation and compliance checks —
//! both **horizontal** (the clear offset a sight obstruction on the inside
//! of a curve must respect) and **vertical** (crest/sag curve sight
//! distance, built on `thoth_civil::profile`'s resolved vertical curves).
//!
//! Source: AASHTO, *A Policy on Geometric Design of Highways and Streets*
//! ("Green Book"), 7th Ed., Chapter 3 — "Elements of Design", §3.2
//! (Stopping Sight Distance) and §3.3 (Stopping Sight Distance on
//! Horizontal/Vertical Curves).

use thoth_civil::alignment::AlignmentCurve;
use thoth_civil::profile::ResolvedVerticalCurve;

use crate::error::{TransportationError, TransportationResult};
use crate::vertical_curve_design::{crest_curve_min_length, sag_curve_min_length};

/// Driver perception-reaction time used in the AASHTO SSD formula, seconds.
/// AASHTO Green Book 7th Ed. §3.2.1 — a single value used for all design
/// speeds since the 2001 edition.
pub const PERCEPTION_REACTION_TIME_S: f64 = 2.5;

/// Driver deceleration rate used in the AASHTO SSD braking-distance term,
/// ft/s². AASHTO Green Book 7th Ed. §3.2.2 — "a deceleration rate of 11.2
/// ft/s² ... is used to determine stopping sight distance", representing a
/// comfortable braking maneuver for most drivers and pavement/tire
/// conditions.
pub const DECELERATION_RATE_FT_S2: f64 = 11.2;

/// Gravitational acceleration, ft/s² — used to convert the AASHTO
/// deceleration rate into the dimensionless friction-equivalent term of the
/// SSD braking-distance formula.
const GRAVITY_FT_S2: f64 = 32.2;

/// Lower bound of the AASHTO SSD design-speed table (Green Book Table 3-1),
/// mph.
pub const MIN_DESIGN_SPEED_MPH: f64 = 15.0;
/// Upper bound of the AASHTO SSD design-speed table (Green Book Table 3-1),
/// mph.
pub const MAX_DESIGN_SPEED_MPH: f64 = 80.0;

fn validate_design_speed(speed: f64) -> TransportationResult<()> {
    if !(MIN_DESIGN_SPEED_MPH..=MAX_DESIGN_SPEED_MPH).contains(&speed) {
        return Err(TransportationError::DesignSpeedOutOfRange {
            speed,
            min: MIN_DESIGN_SPEED_MPH,
            max: MAX_DESIGN_SPEED_MPH,
        });
    }
    Ok(())
}

/// AASHTO stopping sight distance, feet, for a design speed (mph) on a
/// grade (decimal fraction, **signed positive for an upgrade** in the
/// direction of travel, negative for a downgrade; `0.0` for level).
///
/// `SSD = 1.47·V·t + V² / [30·(a/32.2 ± G)]` — AASHTO Green Book 7th Ed.
/// Equation 3-2, with `t` = [`PERCEPTION_REACTION_TIME_S`] and `a` =
/// [`DECELERATION_RATE_FT_S2`]. Matches the published Table 3-1 SSD values
/// (e.g. 570 ft at 60 mph, level) to within rounding.
///
/// # Errors
/// - [`TransportationError::DesignSpeedOutOfRange`] if `design_speed_mph` is
///   outside `[15, 80]` mph, the range AASHTO tabulates this formula for.
/// - [`TransportationError::NonPositiveValue`] if the combination of grade
///   and deceleration rate would yield a non-positive effective braking
///   friction (a downgrade steep enough that the vehicle cannot stop under
///   the assumed comfortable deceleration — the formula is not valid there).
pub fn stopping_sight_distance(design_speed_mph: f64, grade: f64) -> TransportationResult<f64> {
    validate_design_speed(design_speed_mph)?;
    let effective_friction = DECELERATION_RATE_FT_S2 / GRAVITY_FT_S2 + grade;
    if effective_friction <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "effective braking friction (a/32.2 + grade)",
            value: effective_friction,
        });
    }
    let reaction_distance = 1.47 * design_speed_mph * PERCEPTION_REACTION_TIME_S;
    let braking_distance = design_speed_mph.powi(2) / (30.0 * effective_friction);
    Ok(reaction_distance + braking_distance)
}

/// Required clear offset (Horizontal Sight-Line Offset, "HSO"/middle
/// ordinate `M`) from the traveled-way centerline to a sight obstruction on
/// the inside of a horizontal curve of `radius` (ft), so that a driver has
/// at least `sight_distance` (ft) of unobstructed sight line. `curve_length`
/// is the curve's arc length (ft).
///
/// AASHTO Green Book 7th Ed. Equations 3-35/3-36 (stated here in radians,
/// which is algebraically identical to the Green Book's degree form using
/// the 28.65 = 90/π constant):
/// - If `sight_distance <= curve_length`:
///   `M = R·(1 − cos(S / (2R)))`.
/// - If `sight_distance > curve_length` (the sight line extends onto the
///   tangents on either side of the curve):
///   `M = R·(1 − cos(L / (2R))) + ((S − L) / 2)·sin(L / (2R))`.
///
/// # Errors
/// [`TransportationError::NonPositiveValue`] if `radius`, `sight_distance`,
/// or `curve_length` is not strictly positive.
pub fn horizontal_sight_line_offset(
    radius: f64,
    sight_distance: f64,
    curve_length: f64,
) -> TransportationResult<f64> {
    if radius <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "radius",
            value: radius,
        });
    }
    if sight_distance <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "sight_distance",
            value: sight_distance,
        });
    }
    if curve_length <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "curve_length",
            value: curve_length,
        });
    }

    if sight_distance <= curve_length {
        let half_angle = sight_distance / (2.0 * radius);
        Ok(radius * (1.0 - half_angle.cos()))
    } else {
        let half_angle_full = curve_length / (2.0 * radius);
        let base = radius * (1.0 - half_angle_full.cos());
        Ok(base + (sight_distance - curve_length) / 2.0 * half_angle_full.sin())
    }
}

/// Result of checking a horizontal curve's available sight clearance
/// against the AASHTO stopping sight distance required at its design speed.
#[derive(Debug, Clone, PartialEq)]
pub struct HorizontalSightDistanceCheck {
    pub pi_index: usize,
    pub station: f64,
    pub required_ssd: f64,
    pub required_offset: f64,
    /// The clear offset actually available at the site (caller-supplied —
    /// this crate has no obstruction/terrain model of its own).
    pub available_offset: f64,
    pub is_violation: bool,
    pub message: String,
}

/// Checks whether `available_offset` (the clear distance from the alignment
/// centerline to the nearest sight obstruction, e.g. a cut slope, wall, or
/// planting, in plan units matching the alignment) provides at least the
/// AASHTO stopping sight distance required at `design_speed_mph` on `grade`
/// through the given resolved horizontal `curve`.
///
/// Simplifying assumption: this measures clearance from the alignment
/// centerline, not the inside travel lane's own centerline — on a
/// multi-lane facility the inside lane's radius is slightly larger than the
/// alignment's, so this check is conservative (it demands slightly more
/// clearance than the AASHTO method strictly requires for that lane).
///
/// # Errors
/// Propagates [`stopping_sight_distance`] and [`horizontal_sight_line_offset`]
/// errors (out-of-range design speed, non-positive curve radius/length).
pub fn check_horizontal_sight_distance(
    curve: &AlignmentCurve,
    design_speed_mph: f64,
    grade: f64,
    available_offset: f64,
) -> TransportationResult<HorizontalSightDistanceCheck> {
    let ssd = stopping_sight_distance(design_speed_mph, grade)?;
    let required_offset = horizontal_sight_line_offset(curve.radius, ssd, curve.length)?;
    let is_violation = available_offset < required_offset;
    Ok(HorizontalSightDistanceCheck {
        pi_index: curve.pi_index,
        station: curve.pc_station,
        required_ssd: ssd,
        required_offset,
        available_offset,
        is_violation,
        message: if is_violation {
            format!(
                "Curve at station {:.2}: sight obstruction offset {:.2} ft is less than the {:.2} ft required for {:.0} mph SSD of {:.1} ft.",
                curve.pc_station, available_offset, required_offset, design_speed_mph, ssd
            )
        } else {
            format!(
                "Curve at station {:.2} provides adequate stopping sight distance ({:.1} ft required, {:.2} ft available).",
                curve.pc_station, ssd, available_offset
            )
        },
    })
}

/// Result of checking a vertical (crest or sag) curve's length against the
/// AASHTO minimum needed to provide stopping sight distance at its design
/// speed.
#[derive(Debug, Clone, PartialEq)]
pub struct VerticalSightDistanceCheck {
    pub station: f64,
    pub is_crest: bool,
    pub required_ssd: f64,
    pub required_length: f64,
    pub actual_length: f64,
    pub k_value: f64,
    pub required_k: f64,
    pub is_violation: bool,
    pub message: String,
}

/// Checks a resolved vertical curve (from `thoth_civil::profile`) against
/// the AASHTO minimum crest/sag curve length for stopping sight distance at
/// `design_speed_mph`, using the algebraic grade difference already carried
/// by `curve` (`grade_in`/`grade_out`).
///
/// Required stopping sight distance is computed on a **level** grade (`0.0`)
/// per standard AASHTO practice for vertical-curve design tables — the
/// curve's own grades are what the curve-length formula accounts for; SSD
/// itself is not additionally grade-adjusted here (Green Book Ch. 3).
///
/// # Errors
/// Propagates [`crest_curve_min_length`]/[`sag_curve_min_length`] errors
/// (out-of-range design speed, non-positive/zero grade break).
pub fn check_vertical_sight_distance(
    curve: &ResolvedVerticalCurve,
    design_speed_mph: f64,
) -> TransportationResult<VerticalSightDistanceCheck> {
    let ssd = stopping_sight_distance(design_speed_mph, 0.0)?;
    let is_crest = curve.grade_in > curve.grade_out;
    let grade_break_pct = (curve.grade_out - curve.grade_in).abs() * 100.0;

    let (required_length, required_k) = if is_crest {
        crest_curve_min_length(design_speed_mph, grade_break_pct)?
    } else {
        sag_curve_min_length(design_speed_mph, grade_break_pct)?
    };

    let is_violation = curve.curve_length < required_length - 1e-6;
    Ok(VerticalSightDistanceCheck {
        station: curve.pvi_station,
        is_crest,
        required_ssd: ssd,
        required_length,
        actual_length: curve.curve_length,
        k_value: curve.k_value,
        required_k,
        is_violation,
        message: if is_violation {
            format!(
                "{} curve at station {:.2}: length {:.1} ft (K={:.1}) is below the {:.1} ft (K={:.1}) required for {:.0} mph SSD.",
                if is_crest { "Crest" } else { "Sag" },
                curve.pvi_station,
                curve.curve_length,
                curve.k_value,
                required_length,
                required_k,
                design_speed_mph
            )
        } else {
            format!(
                "{} curve at station {:.2} meets AASHTO stopping-sight-distance requirements.",
                if is_crest { "Crest" } else { "Sag" },
                curve.pvi_station
            )
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn ssd_matches_published_aashto_table_value_at_60mph_level() {
        // AASHTO Green Book Table 3-1: 60 mph, level grade -> 570 ft (rounded
        // for design use). Our exact-formula value is a few feet under that
        // due to the table's upward rounding; verify it lands close.
        let ssd = stopping_sight_distance(60.0, 0.0).unwrap();
        assert_relative_eq!(ssd, 566.0, epsilon = 5.0);
    }

    #[test]
    fn ssd_matches_published_aashto_table_value_at_30mph_level() {
        // AASHTO Table 3-1: 30 mph, level -> 200 ft (published/rounded).
        let ssd = stopping_sight_distance(30.0, 0.0).unwrap();
        assert_relative_eq!(ssd, 200.0, epsilon = 5.0);
    }

    #[test]
    fn ssd_increases_on_downgrade_and_decreases_on_upgrade() {
        let level = stopping_sight_distance(50.0, 0.0).unwrap();
        let down = stopping_sight_distance(50.0, -0.05).unwrap();
        let up = stopping_sight_distance(50.0, 0.05).unwrap();
        assert!(down > level);
        assert!(up < level);
    }

    #[test]
    fn ssd_rejects_out_of_range_speed() {
        assert!(matches!(
            stopping_sight_distance(5.0, 0.0),
            Err(TransportationError::DesignSpeedOutOfRange { .. })
        ));
        assert!(matches!(
            stopping_sight_distance(100.0, 0.0),
            Err(TransportationError::DesignSpeedOutOfRange { .. })
        ));
    }

    #[test]
    fn ssd_rejects_a_downgrade_so_steep_braking_is_undefined() {
        // a/32.2 ~= 0.348; a grade steeper (more negative) than that makes
        // the effective friction non-positive.
        assert!(matches!(
            stopping_sight_distance(50.0, -0.5),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }

    #[test]
    fn horizontal_offset_is_zero_when_sight_distance_is_zero_length_limit() {
        // As S -> 0, M -> 0 (no offset needed for no required sight distance).
        let m = horizontal_sight_line_offset(500.0, 0.01, 1000.0).unwrap();
        assert!(m > 0.0 && m < 0.01);
    }

    #[test]
    fn horizontal_offset_matches_hand_calculation_for_s_less_than_l() {
        // R = 1000 ft, S = 500 ft, L = 2000 ft (S <= L branch).
        // M = 1000*(1 - cos(500/2000)) = 1000*(1-cos(0.25 rad))
        let m = horizontal_sight_line_offset(1000.0, 500.0, 2000.0).unwrap();
        let expected = 1000.0 * (1.0 - (0.25_f64).cos());
        assert_relative_eq!(m, expected, epsilon = 1e-9);
    }

    #[test]
    fn horizontal_offset_uses_the_s_greater_than_l_branch() {
        // R = 500 ft, S = 600 ft, L = 400 ft (S > L).
        let radius = 500.0;
        let l = 400.0;
        let s = 600.0;
        let m = horizontal_sight_line_offset(radius, s, l).unwrap();
        let half_full = l / (2.0 * radius);
        let expected = radius * (1.0 - half_full.cos()) + (s - l) / 2.0 * half_full.sin();
        assert_relative_eq!(m, expected, epsilon = 1e-9);
        // And it must be less than the (incorrect) S<=L formula's value:
        // misapplying that formula assumes the entire sight distance curves
        // through the obstruction, whereas here part of it runs along the
        // straight tangents (which need no curvature-driven offset at all),
        // so the true required offset is smaller.
        let wrong_branch = radius * (1.0 - (s / (2.0 * radius)).cos());
        assert!(m < wrong_branch);
    }

    #[test]
    fn horizontal_offset_rejects_non_positive_inputs() {
        assert!(matches!(
            horizontal_sight_line_offset(0.0, 100.0, 100.0),
            Err(TransportationError::NonPositiveValue {
                field: "radius",
                ..
            })
        ));
        assert!(matches!(
            horizontal_sight_line_offset(100.0, -1.0, 100.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }

    #[test]
    fn check_horizontal_sight_distance_flags_insufficient_clearance() {
        let curve = AlignmentCurve {
            pi_index: 1,
            pi: thoth_spatial::Point::ZERO,
            pc: thoth_spatial::Point::ZERO,
            pt: thoth_spatial::Point::ZERO,
            center: thoth_spatial::Point::ZERO,
            radius: 500.0,
            delta: 1.0,
            delta_deg: 57.3,
            tangent: 100.0,
            length: 500.0,
            external: 10.0,
            middle_ordinate: 5.0,
            chord: 490.0,
            degree_of_curve: 11.46,
            direction: thoth_civil::alignment::CurveDirection::Right,
            pc_station: 1000.0,
            pi_station: 1100.0,
            pt_station: 1500.0,
            chord_bearing: 0.0,
            sweep: 1.0,
            start_angle: 0.0,
            spiral_in: None,
            spiral_out: None,
        };
        let ok = check_horizontal_sight_distance(&curve, 50.0, 0.0, 50.0).unwrap();
        assert!(!ok.is_violation);
        let violation = check_horizontal_sight_distance(&curve, 50.0, 0.0, 1.0).unwrap();
        assert!(violation.is_violation);
    }
}
