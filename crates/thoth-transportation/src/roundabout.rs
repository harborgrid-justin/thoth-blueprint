//! Roundabout geometry design (item 22): inscribed circle diameter (ICD)
//! sizing from approach count and design vehicle, plus a simplified
//! fastest-path speed check.
//!
//! Source: NCHRP Report 672, *Roundabouts: An Informational Guide* (2nd
//! Ed.), Exhibit 3-4 (typical ICD ranges by roundabout category/design
//! vehicle) and Chapter 6 (fastest-path speed estimation). **Simplifying
//! assumption, stated explicitly per the deliverable's honesty
//! requirement**: the fastest-path check here uses a *single* circular-arc
//! approximation of the circulating path (radius derived from ICD and
//! circulatory roadway width) rather than NCHRP 672's full three-arc
//! (entry → circulating → exit) fastest-path construction with
//! reverse-curve geometry and a speed-differential check between
//! consecutive arcs. It is a planning-level screening check, not a
//! substitute for the full NCHRP 672 fastest-path method in final design.

use crate::design_speed_policy::side_friction_factor;
use crate::design_vehicle::DesignVehicle;
use crate::error::{TransportationError, TransportationResult};

/// NCHRP 672 recommended range of inscribed circle diameters, feet, for a
/// mini-roundabout (single-unit design vehicles only, low speeds).
pub const MINI_ROUNDABOUT_ICD_RANGE: (f64, f64) = (45.0, 90.0);

/// Recommends an inscribed circle diameter (ICD) range in feet for a
/// roundabout serving `approach_count` legs and `design_vehicle`, per NCHRP
/// 672 Exhibit 3-4 planning-level guidance. Larger design vehicles
/// (WB-40/WB-50) and more approach legs both push the recommended ICD
/// range wider, since the circulating roadway must accommodate the
/// design vehicle's off-tracking around the central island.
///
/// # Errors
/// [`TransportationError::ApproachCountOutOfRange`] if `approach_count` is
/// outside `[3, 6]` (NCHRP 672's standard single-lane roundabout coverage;
/// two-leg "roundabouts" aren't roundabouts and more than 6 legs is outside
/// typical practice).
pub fn inscribed_circle_diameter_range(
    approach_count: u8,
    design_vehicle: &DesignVehicle,
) -> TransportationResult<(f64, f64)> {
    if !(3..=6).contains(&approach_count) {
        return Err(TransportationError::ApproachCountOutOfRange {
            count: approach_count,
            min: 3,
            max: 6,
        });
    }
    // Base range keyed to design vehicle (single-lane roundabout, NCHRP 672
    // Exhibit 3-4 orders of magnitude).
    let (mut lo, mut hi) = if design_vehicle.total_wheelbase() <= 25.0 {
        (90.0, 130.0) // P / SU-30 class
    } else if design_vehicle.link_lengths.len() <= 1 {
        (100.0, 150.0)
    } else if design_vehicle.total_wheelbase() <= 45.0 {
        (130.0, 180.0) // WB-40 class
    } else {
        (150.0, 230.0) // WB-50 class
    };
    // Extra approach legs need a larger circulatory roadway to keep
    // deflection consistent at every entry; widen the range ~10 ft/leg
    // beyond the standard 4-leg case.
    if approach_count > 4 {
        let extra = (approach_count - 4) as f64 * 10.0;
        lo += extra;
        hi += extra;
    }
    Ok((lo, hi))
}

/// Result of the simplified circulating fastest-path speed check.
#[derive(Debug, Clone, PartialEq)]
pub struct FastestPathCheck {
    pub circulating_radius: f64,
    pub estimated_speed_mph: f64,
    pub max_recommended_speed_mph: f64,
    pub is_violation: bool,
    pub message: String,
}

/// NCHRP 672's commonly cited upper bound on desirable single-lane
/// roundabout circulating (fastest-path) speed, mph — kept a design speed
/// this low is central to a roundabout's safety performance.
pub const MAX_RECOMMENDED_CIRCULATING_SPEED_MPH: f64 = 20.0;

/// Estimates the fastest-path circulating speed for a roundabout of
/// `inscribed_circle_diameter` (ft) with a circulatory roadway
/// `circulating_width` (ft) at superelevation `e` (decimal, typically `0.0`
/// to `0.02` — roundabouts are normally built with little to no
/// superelevation, or slightly negative/adverse crown for drainage), and
/// flags it against [`MAX_RECOMMENDED_CIRCULATING_SPEED_MPH`].
///
/// The circulating-path radius is approximated as the radius of a vehicle
/// path midway across the circulatory roadway:
/// `R = ICD/2 − circulating_width/2`. Speed is solved from the standard
/// side-friction/superelevation equilibrium relationship
/// `V = sqrt(15·R·(e + f(V)))` by fixed-point iteration on
/// [`side_friction_factor`] (monotonically decreasing in `V`, so the
/// iteration is a contraction and converges quickly).
///
/// # Errors
/// - [`TransportationError::NonPositiveValue`] if `inscribed_circle_diameter`
///   or `circulating_width` is not positive, or if `circulating_width` is at
///   least as wide as the inscribed circle (a non-physical roundabout).
/// - [`TransportationError::ConvergenceFailure`] if the fixed-point
///   iteration does not settle within its iteration budget (would indicate
///   a pathological input combination).
pub fn fastest_path_speed_check(
    inscribed_circle_diameter: f64,
    circulating_width: f64,
    e: f64,
) -> TransportationResult<FastestPathCheck> {
    if inscribed_circle_diameter <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "inscribed_circle_diameter",
            value: inscribed_circle_diameter,
        });
    }
    if circulating_width <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "circulating_width",
            value: circulating_width,
        });
    }
    let radius = inscribed_circle_diameter / 2.0 - circulating_width / 2.0;
    if radius <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "circulating_width (exceeds the inscribed circle radius)",
            value: circulating_width,
        });
    }

    // Fixed-point iterate V_{n+1} = sqrt(15*R*(e + f(V_n))), clamping the
    // speed into the tabulated [15, 80] mph domain of `side_friction_factor`
    // at each step (physically, a very small R will drive V below 15 mph —
    // clamp and take f(15) as the conservative bound rather than erroring,
    // since a slow, tight roundabout circulating path is a legitimate case
    // this check must still be able to evaluate).
    let mut v = 15.0_f64;
    const MAX_ITERATIONS: u32 = 50;
    let mut converged = false;
    for _ in 0..MAX_ITERATIONS {
        let clamped_v = v.clamp(15.0, 80.0);
        let f = side_friction_factor(clamped_v)?;
        let next_v = (15.0 * radius * (e + f)).max(0.0).sqrt();
        if (next_v - v).abs() < 1e-6 {
            v = next_v;
            converged = true;
            break;
        }
        v = next_v;
    }
    if !converged {
        return Err(TransportationError::ConvergenceFailure {
            solver: "roundabout fastest-path fixed-point speed iteration",
            iterations: MAX_ITERATIONS,
        });
    }

    let is_violation = v > MAX_RECOMMENDED_CIRCULATING_SPEED_MPH;
    Ok(FastestPathCheck {
        circulating_radius: radius,
        estimated_speed_mph: v,
        max_recommended_speed_mph: MAX_RECOMMENDED_CIRCULATING_SPEED_MPH,
        is_violation,
        message: if is_violation {
            format!(
                "Estimated fastest-path circulating speed {:.1} mph (R={:.1} ft) exceeds the recommended {:.0} mph single-lane roundabout limit.",
                v, radius, MAX_RECOMMENDED_CIRCULATING_SPEED_MPH
            )
        } else {
            format!(
                "Estimated fastest-path circulating speed {:.1} mph is within the recommended limit.",
                v
            )
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn icd_range_widens_for_larger_design_vehicles() {
        let su30 = inscribed_circle_diameter_range(4, &DesignVehicle::su30()).unwrap();
        let wb50 = inscribed_circle_diameter_range(4, &DesignVehicle::wb50()).unwrap();
        assert!(wb50.0 > su30.0);
        assert!(wb50.1 > su30.1);
    }

    #[test]
    fn icd_range_widens_with_more_approach_legs() {
        let four = inscribed_circle_diameter_range(4, &DesignVehicle::su30()).unwrap();
        let six = inscribed_circle_diameter_range(6, &DesignVehicle::su30()).unwrap();
        assert!(six.0 > four.0);
    }

    #[test]
    fn rejects_out_of_range_approach_count() {
        assert!(matches!(
            inscribed_circle_diameter_range(2, &DesignVehicle::su30()),
            Err(TransportationError::ApproachCountOutOfRange { .. })
        ));
        assert!(matches!(
            inscribed_circle_diameter_range(8, &DesignVehicle::su30()),
            Err(TransportationError::ApproachCountOutOfRange { .. })
        ));
    }

    #[test]
    fn a_small_single_lane_roundabout_passes_the_fastest_path_check() {
        // ICD 110 ft, 16 ft circulatory roadway -> R = 55-8=47 ft.
        let check = fastest_path_speed_check(110.0, 16.0, 0.0).unwrap();
        assert!(!check.is_violation);
        assert!(check.estimated_speed_mph < MAX_RECOMMENDED_CIRCULATING_SPEED_MPH);
    }

    #[test]
    fn an_oversized_flat_roundabout_flags_excess_circulating_speed() {
        // A very large ICD makes for a nearly straight-through, high-speed
        // circulating path -- exactly the failure mode roundabout design
        // guides warn against.
        let check = fastest_path_speed_check(400.0, 20.0, 0.0).unwrap();
        assert!(check.is_violation);
    }

    #[test]
    fn rejects_circulating_width_exceeding_the_inscribed_circle() {
        assert!(matches!(
            fastest_path_speed_check(50.0, 60.0, 0.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }
}
