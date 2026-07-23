//! Superelevation design-speed policy compliance (item 16): extends
//! `thoth_civil::superelevation`'s runoff/runout *transition* computation
//! with a policy-compliance layer checking the applied superelevation rate
//! against the AASHTO Green Book e-max/side-friction relationship for the
//! curve's design speed and radius.
//!
//! `thoth_civil::superelevation::calculate_superelevation_runoff` answers
//! "where do the NC/LC/RC/FS transition stations fall, given an e_max the
//! designer already chose?" This module answers the question one layer up:
//! "was that choice of e_max — and the radius it's paired with — actually
//! compliant with AASHTO policy for this design speed?" It does not
//! recompute runoff/runout station math; it consumes
//! [`thoth_civil::superelevation::SuperelevationCurve`]'s already-resolved
//! `design_speed`/`e_max` alongside the paired
//! [`thoth_civil::alignment::AlignmentCurve`]'s `radius`.

use thoth_civil::alignment::AlignmentCurve;
use thoth_civil::superelevation::SuperelevationCurve;

use crate::design_speed_policy::{minimum_radius, required_superelevation};
use crate::error::{TransportationError, TransportationResult};

/// Result of checking one curve's applied superelevation against AASHTO
/// design-speed policy.
#[derive(Debug, Clone, PartialEq)]
pub struct SuperelevationPolicyCheck {
    pub station: f64,
    pub design_speed_mph: f64,
    pub radius: f64,
    /// The superelevation rate actually designed into the curve (the
    /// `SuperelevationCurve`'s `e_max`).
    pub applied_e: f64,
    /// The superelevation rate the AASHTO equilibrium relationship requires
    /// at this radius and design speed.
    pub required_e: f64,
    /// The jurisdiction's policy ceiling on superelevation (e.g. `0.06`,
    /// `0.08`, `0.12`).
    pub policy_e_max: f64,
    /// `applied_e` is less than `required_e`: the curve leans on more side
    /// friction than the AASHTO table allows at this speed — unsafe as
    /// designed.
    pub is_under_superelevated: bool,
    /// `required_e` exceeds `policy_e_max`: no superelevation choice within
    /// policy can make this radius compliant at this design speed — the
    /// radius itself must increase (equivalent to
    /// `radius < minimum_radius(design_speed, policy_e_max)`).
    pub is_radius_deficient: bool,
    /// `applied_e` itself exceeds `policy_e_max` (over-superelevated beyond
    /// what the jurisdiction allows, independent of what's "required").
    pub applied_exceeds_policy: bool,
    pub is_violation: bool,
    pub message: String,
}

/// Checks `super_curve`'s applied superelevation for the paired horizontal
/// `curve` against AASHTO design-speed policy, capped at `policy_e_max`
/// (the jurisdiction's maximum allowable superelevation rate, e.g. `0.06`
/// for `e_max = 6%`).
///
/// # Errors
/// - [`TransportationError::DesignSpeedOutOfRange`] if `super_curve.design_speed`
///   falls outside the tabulated `[15, 80]` mph range.
/// - [`TransportationError::NonPositiveValue`] if `curve.radius <= 0` or
///   `policy_e_max <= 0`.
pub fn check_superelevation_policy(
    curve: &AlignmentCurve,
    super_curve: &SuperelevationCurve,
    policy_e_max: f64,
) -> TransportationResult<SuperelevationPolicyCheck> {
    if policy_e_max <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "policy_e_max",
            value: policy_e_max,
        });
    }
    let design_speed = super_curve.design_speed;
    let required_e = required_superelevation(design_speed, curve.radius)?;
    let min_r_at_policy = minimum_radius(design_speed, policy_e_max)?;

    let is_under_superelevated = super_curve.e_max < required_e - 1e-9;
    let is_radius_deficient = curve.radius < min_r_at_policy - 1e-6;
    let applied_exceeds_policy = super_curve.e_max > policy_e_max + 1e-9;
    let is_violation = is_under_superelevated || is_radius_deficient || applied_exceeds_policy;

    let message = if is_radius_deficient {
        format!(
            "Curve at station {:.2}: radius {:.1} ft cannot be made AASHTO-compliant at {:.0} mph within policy e_max={:.0}% (needs >= {:.1} ft).",
            curve.pc_station, curve.radius, design_speed, policy_e_max * 100.0, min_r_at_policy
        )
    } else if is_under_superelevated {
        format!(
            "Curve at station {:.2}: applied superelevation {:.3} is below the {:.3} required at {:.0} mph for radius {:.1} ft.",
            curve.pc_station, super_curve.e_max, required_e, design_speed, curve.radius
        )
    } else if applied_exceeds_policy {
        format!(
            "Curve at station {:.2}: applied superelevation {:.3} exceeds the policy maximum {:.3}.",
            curve.pc_station, super_curve.e_max, policy_e_max
        )
    } else {
        format!(
            "Curve at station {:.2} satisfies AASHTO superelevation policy for {:.0} mph.",
            curve.pc_station, design_speed
        )
    };

    Ok(SuperelevationPolicyCheck {
        station: curve.pc_station,
        design_speed_mph: design_speed,
        radius: curve.radius,
        applied_e: super_curve.e_max,
        required_e,
        policy_e_max,
        is_under_superelevated,
        is_radius_deficient,
        applied_exceeds_policy,
        is_violation,
        message,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_spatial::Point;

    fn curve(radius: f64) -> AlignmentCurve {
        AlignmentCurve {
            pi_index: 1,
            pi: Point::ZERO,
            pc: Point::ZERO,
            pt: Point::ZERO,
            center: Point::ZERO,
            radius,
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
        }
    }

    fn super_curve(design_speed: f64, e_max: f64) -> SuperelevationCurve {
        SuperelevationCurve {
            alignment_id: "a1".into(),
            design_speed,
            e_max,
            normal_crown: -0.02,
            transition_stations: vec![],
        }
    }

    #[test]
    fn passes_a_properly_superelevated_curve() {
        // R_min(50mph, 6%) ~= 833 ft; a 1000 ft radius with e=6% applied is
        // both radius-adequate and not under-superelevated.
        let c = curve(1000.0);
        let sc = super_curve(50.0, 0.06);
        let check = check_superelevation_policy(&c, &sc, 0.06).unwrap();
        assert!(!check.is_violation);
    }

    #[test]
    fn flags_under_superelevated_curve() {
        // A tight curve (500 ft at 50 mph) needs more superelevation than
        // a designer who only applied e=0.02 provided.
        let c = curve(500.0);
        let sc = super_curve(50.0, 0.02);
        let check = check_superelevation_policy(&c, &sc, 0.08).unwrap();
        assert!(check.is_under_superelevated);
        assert!(check.is_violation);
    }

    #[test]
    fn flags_radius_deficient_beyond_policy_e_max() {
        // A very tight curve (200 ft at 55 mph) can't be fixed by
        // superelevation alone within a 6% policy cap.
        let c = curve(200.0);
        let sc = super_curve(55.0, 0.06);
        let check = check_superelevation_policy(&c, &sc, 0.06).unwrap();
        assert!(check.is_radius_deficient);
        assert!(check.is_violation);
    }

    #[test]
    fn flags_applied_superelevation_exceeding_policy_cap() {
        let c = curve(2000.0);
        let sc = super_curve(40.0, 0.10);
        let check = check_superelevation_policy(&c, &sc, 0.06).unwrap();
        assert!(check.applied_exceeds_policy);
        assert!(check.is_violation);
    }

    #[test]
    fn rejects_non_positive_policy_e_max() {
        let c = curve(1000.0);
        let sc = super_curve(50.0, 0.06);
        assert!(matches!(
            check_superelevation_policy(&c, &sc, 0.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }
}
