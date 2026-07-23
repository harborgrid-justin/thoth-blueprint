//! Shared AASHTO Green Book side-friction-factor table and the
//! superelevation/minimum-radius physics it drives — the common core behind
//! both the minimum-horizontal-curve-radius check
//! ([`crate::horizontal_curve_policy`], item 17) and the superelevation
//! design-speed policy-compliance check
//! ([`crate::superelevation_policy`], item 16).
//!
//! Source table: AASHTO, *A Policy on Geometric Design of Highways and
//! Streets*, side-friction-factor-vs-design-speed values for `e_max = 6%`,
//! as widely reproduced in state DOT design manuals and transportation
//! engineering texts (e.g. Roess, Prassas & McShane, *Traffic Engineering*,
//! 4th Ed., Table 3.4). **Simplifying assumption**: AASHTO republishes
//! slightly different side-friction tables edition to edition and per
//! `e_max` policy; this crate uses one commonly cited `e_max = 6%` table and
//! linearly interpolates within it. A jurisdiction using a different
//! `e_max` (4%, 8%, 10%, 12%) or a newer/older Green Book edition's exact
//! friction factors should verify against its own adopted design manual
//! before using this as anything beyond a planning-level check.

use crate::error::{TransportationError, TransportationResult};

/// AASHTO Green Book side-friction factor `f_max` for `e_max = 6%`, at 5 mph
/// design-speed increments from 15 to 80 mph. Index `i` corresponds to
/// `15 + 5*i` mph.
const SIDE_FRICTION_TABLE_SPEEDS: [f64; 14] = [
    15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0, 60.0, 65.0, 70.0, 75.0, 80.0,
];
const SIDE_FRICTION_TABLE_F: [f64; 14] = [
    0.32, 0.27, 0.23, 0.20, 0.18, 0.16, 0.15, 0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.08,
];

/// Lower bound of the tabulated design-speed range, mph.
pub const MIN_DESIGN_SPEED_MPH: f64 = 15.0;
/// Upper bound of the tabulated design-speed range, mph.
pub const MAX_DESIGN_SPEED_MPH: f64 = 80.0;

/// AASHTO Green Book side-friction factor `f_max` at `design_speed_mph`,
/// linearly interpolated between the tabulated 5-mph increments.
///
/// # Errors
/// [`TransportationError::DesignSpeedOutOfRange`] if `design_speed_mph`
/// falls outside `[15, 80]` mph.
pub fn side_friction_factor(design_speed_mph: f64) -> TransportationResult<f64> {
    if !(MIN_DESIGN_SPEED_MPH..=MAX_DESIGN_SPEED_MPH).contains(&design_speed_mph) {
        return Err(TransportationError::DesignSpeedOutOfRange {
            speed: design_speed_mph,
            min: MIN_DESIGN_SPEED_MPH,
            max: MAX_DESIGN_SPEED_MPH,
        });
    }
    let speeds = &SIDE_FRICTION_TABLE_SPEEDS;
    let fs = &SIDE_FRICTION_TABLE_F;
    // Binary search for the bracketing pair; the table is small and sorted.
    if design_speed_mph <= speeds[0] {
        return Ok(fs[0]);
    }
    let n = speeds.len();
    if design_speed_mph >= speeds[n - 1] {
        return Ok(fs[n - 1]);
    }
    for i in 0..n - 1 {
        if design_speed_mph >= speeds[i] && design_speed_mph <= speeds[i + 1] {
            let t = (design_speed_mph - speeds[i]) / (speeds[i + 1] - speeds[i]);
            return Ok(fs[i] + t * (fs[i + 1] - fs[i]));
        }
    }
    unreachable!("design_speed_mph was range-checked above");
}

/// AASHTO minimum horizontal-curve radius (feet), from the standard
/// side-friction/superelevation curve equation:
/// `R_min = V² / (15·(e_max + f_max))` (AASHTO Green Book Equation 3-8; the
/// `15` combines the `mph`→`ft/s` unit conversion with the `2g` term of the
/// underlying physics `R = V²/(g·(e+f))`).
///
/// # Errors
/// - [`TransportationError::DesignSpeedOutOfRange`] — see
///   [`side_friction_factor`].
/// - [`TransportationError::NonPositiveValue`] if `e_max <= 0`.
pub fn minimum_radius(design_speed_mph: f64, e_max: f64) -> TransportationResult<f64> {
    if e_max <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "e_max",
            value: e_max,
        });
    }
    let f_max = side_friction_factor(design_speed_mph)?;
    Ok(design_speed_mph.powi(2) / (15.0 * (e_max + f_max)))
}

/// The superelevation rate a curve of `radius` (feet) needs at
/// `design_speed_mph` to keep the vehicle in equilibrium at the design
/// speed, from the same relationship solved for `e`:
/// `e_required = V² / (15·R) − f_max`.
///
/// May be negative (meaning friction alone, or even an adverse crown, is
/// enough) or may exceed a policy's `e_max` (meaning this radius cannot be
/// made compliant by superelevation alone at this design speed — see
/// [`crate::superelevation_policy`]).
///
/// # Errors
/// - [`TransportationError::DesignSpeedOutOfRange`] — see
///   [`side_friction_factor`].
/// - [`TransportationError::NonPositiveValue`] if `radius <= 0`.
pub fn required_superelevation(design_speed_mph: f64, radius: f64) -> TransportationResult<f64> {
    if radius <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "radius",
            value: radius,
        });
    }
    let f_max = side_friction_factor(design_speed_mph)?;
    Ok(design_speed_mph.powi(2) / (15.0 * radius) - f_max)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn side_friction_matches_table_at_exact_increments() {
        assert_relative_eq!(side_friction_factor(30.0).unwrap(), 0.20, epsilon = 1e-9);
        assert_relative_eq!(side_friction_factor(60.0).unwrap(), 0.12, epsilon = 1e-9);
    }

    #[test]
    fn side_friction_interpolates_between_increments() {
        let f = side_friction_factor(32.5).unwrap();
        assert_relative_eq!(f, (0.20 + 0.18) / 2.0, epsilon = 1e-9);
    }

    #[test]
    fn side_friction_decreases_with_speed() {
        let mut last = f64::INFINITY;
        for v in [15.0, 25.0, 35.0, 45.0, 55.0, 65.0, 75.0] {
            let f = side_friction_factor(v).unwrap();
            assert!(f < last);
            last = f;
        }
    }

    #[test]
    fn side_friction_rejects_out_of_range_speed() {
        assert!(matches!(
            side_friction_factor(10.0),
            Err(TransportationError::DesignSpeedOutOfRange { .. })
        ));
        assert!(matches!(
            side_friction_factor(90.0),
            Err(TransportationError::DesignSpeedOutOfRange { .. })
        ));
    }

    #[test]
    fn minimum_radius_matches_hand_calc_at_50mph() {
        // f_max(50) = 0.14, e_max = 0.06 -> R = 2500 / (15*0.20) = 833.3 ft.
        let r = minimum_radius(50.0, 0.06).unwrap();
        assert_relative_eq!(r, 2500.0 / (15.0 * 0.20), epsilon = 1e-6);
    }

    #[test]
    fn required_superelevation_is_the_inverse_of_minimum_radius() {
        let design_speed = 45.0;
        let e_max = 0.06;
        let r_min = minimum_radius(design_speed, e_max).unwrap();
        // At exactly the minimum radius, the required superelevation should
        // equal e_max (that's the defining relationship).
        let e_req = required_superelevation(design_speed, r_min).unwrap();
        assert_relative_eq!(e_req, e_max, epsilon = 1e-9);
    }

    #[test]
    fn required_superelevation_drops_as_radius_grows() {
        let e_1000 = required_superelevation(50.0, 1000.0).unwrap();
        let e_2000 = required_superelevation(50.0, 2000.0).unwrap();
        assert!(e_2000 < e_1000);
    }

    #[test]
    fn minimum_radius_rejects_non_positive_e_max() {
        assert!(matches!(
            minimum_radius(50.0, 0.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }
}
