//! Minimum horizontal-curve-radius policy check (item 17): validates every
//! curve in a resolved `thoth_civil` alignment against the AASHTO
//! side-friction/superelevation minimum-radius formula for its design
//! speed, rather than a fixed lookup bucket.
//!
//! This deliberately duplicates the *purpose* of
//! `thoth_civil::alignment::validate_alignment_design_speed` but not its
//! *method*: that (frozen) check uses a coarse 6-bucket minimum-radius table
//! for a fixed `e_max = 6%`. This check instead computes the radius
//! physically required for the curve's specific `e_max` via
//! [`crate::design_speed_policy::minimum_radius`], citing the AASHTO Green
//! Book side-friction table directly — the "policy" layer the gap analysis
//! calls for.

use thoth_civil::alignment::{DesignSpeedZone, HorizontalAlignment, ResolvedAlignment};

use crate::design_speed_policy::minimum_radius;
use crate::error::TransportationResult;

/// Result of checking one horizontal curve's radius against the AASHTO
/// minimum-radius policy for its design speed and `e_max`.
#[derive(Debug, Clone, PartialEq)]
pub struct RadiusPolicyCheck {
    pub pi_index: usize,
    pub station: f64,
    pub design_speed_mph: f64,
    pub e_max: f64,
    pub actual_radius: f64,
    pub minimum_radius: f64,
    pub is_violation: bool,
    pub message: String,
}

/// The design speed in effect at `station`, honoring station-keyed
/// `design_speeds` zones (highest station `<= station` wins), falling back
/// to `default_speed`. Mirrors the zone-selection logic in
/// `thoth_civil::alignment::validate_alignment_design_speed`.
fn speed_at_station(zones: &[DesignSpeedZone], station: f64, default_speed: f64) -> f64 {
    zones
        .iter()
        .filter(|z| station >= z.station)
        .max_by(|a, b| a.station.partial_cmp(&b.station).unwrap())
        .map_or(default_speed, |z| z.speed)
}

/// Checks every curve of `resolved` against the AASHTO minimum-radius
/// policy, using `alignment`'s design speed (and any station-keyed design
/// speed zones) and a single policy `e_max` (decimal, e.g. `0.06`) applied
/// uniformly along the alignment.
///
/// # Errors
/// Propagates [`minimum_radius`]'s errors (a curve's effective design speed
/// falls outside the tabulated `[15, 80]` mph range, or `e_max <= 0`) for
/// the *first* curve that fails; callers wanting a best-effort report across
/// curves with heterogeneous speeds should call
/// [`crate::design_speed_policy::minimum_radius`] per curve directly.
pub fn check_minimum_curve_radius(
    alignment: &HorizontalAlignment,
    resolved: &ResolvedAlignment,
    e_max: f64,
) -> TransportationResult<Vec<RadiusPolicyCheck>> {
    let default_speed = alignment.design_speed.unwrap_or(35.0);
    resolved
        .curves
        .iter()
        .map(|curve| {
            let design_speed = speed_at_station(&alignment.design_speeds, curve.pc_station, default_speed);
            let min_r = minimum_radius(design_speed, e_max)?;
            let is_violation = curve.radius < min_r;
            Ok(RadiusPolicyCheck {
                pi_index: curve.pi_index,
                station: curve.pc_station,
                design_speed_mph: design_speed,
                e_max,
                actual_radius: curve.radius,
                minimum_radius: min_r,
                is_violation,
                message: if is_violation {
                    format!(
                        "Curve at station {:.2}: radius {:.1} ft is below the AASHTO minimum {:.1} ft for {:.0} mph at e_max={:.0}%.",
                        curve.pc_station, curve.radius, min_r, design_speed, e_max * 100.0
                    )
                } else {
                    format!(
                        "Curve at station {:.2} satisfies the AASHTO minimum-radius policy for {:.0} mph.",
                        curve.pc_station, design_speed
                    )
                },
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_civil::alignment::{resolve_alignment, AlignmentPi};
    use thoth_spatial::Point;

    fn alignment_with_curve(radius: f64, design_speed: f64) -> HorizontalAlignment {
        HorizontalAlignment {
            design_speed: Some(design_speed),
            ..HorizontalAlignment::new(
                "a1",
                "Test Rd",
                vec![
                    AlignmentPi::simple(Point::new(0.0, 0.0)),
                    AlignmentPi::curved(Point::new(500.0, 200.0), radius),
                    AlignmentPi::simple(Point::new(1000.0, 0.0)),
                ],
                0.0,
            )
        }
    }

    #[test]
    fn flags_a_curve_tighter_than_the_aashto_minimum() {
        let a = alignment_with_curve(200.0, 55.0); // R_min at 55mph, e=6% is ~1000+ ft
        let r = resolve_alignment(&a).unwrap();
        let checks = check_minimum_curve_radius(&a, &r, 0.06).unwrap();
        assert_eq!(checks.len(), 1);
        assert!(checks[0].is_violation);
    }

    #[test]
    fn accepts_a_generously_sized_curve() {
        let a = alignment_with_curve(5000.0, 30.0);
        let r = resolve_alignment(&a).unwrap();
        let checks = check_minimum_curve_radius(&a, &r, 0.06).unwrap();
        assert_eq!(checks.len(), 1);
        assert!(!checks[0].is_violation);
    }

    #[test]
    fn honors_station_keyed_design_speed_zones() {
        let mut a = alignment_with_curve(300.0, 55.0);
        // Drop the design speed to 25 mph before the curve's station.
        a.design_speeds.push(thoth_civil::alignment::DesignSpeedZone {
            station: 0.0,
            speed: 25.0,
        });
        let r = resolve_alignment(&a).unwrap();
        let checks = check_minimum_curve_radius(&a, &r, 0.06).unwrap();
        assert_eq!(checks[0].design_speed_mph, 25.0);
        assert!(!checks[0].is_violation);
    }
}
