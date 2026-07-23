//! AASHTO design-vehicle geometry shared by the turning-radius templates
//! (item 18, [`crate::turning_template`]) and the vehicle swept-path
//! simulation (item 19, [`crate::swept_path`]).
//!
//! A vehicle is modeled as a **chain of rigid links**: a lead/steering
//! point (the point a driver aims along the desired path — typically the
//! center of the front axle) connected through zero or more articulation
//! points (kingpins/fifth wheels) down to the final unit's trailing axle.
//! A single-unit vehicle (passenger car, SU-30 single-unit truck) is a
//! one-link chain (front axle → rear axle); a tractor-semitrailer
//! (WB-40/WB-50) is a two-link chain (front axle → kingpin, kingpin →
//! trailer axle). Each link behaves independently as a standard
//! bicycle-model rigid wheelbase, which is exactly how real combination
//! vehicles are modeled for off-tracking analysis (each unit's trailing
//! axle is dragged by the unit ahead of it).
//!
//! **Simplifying assumption / data caveat**: the dimensions below are
//! representative values consistent with AASHTO *A Policy on Geometric
//! Design of Highways and Streets* ("Green Book") Exhibits 2-1/2-2 (Design
//! Vehicle Dimensions) and 2-3 (Minimum Turning Radii), rounded for
//! template use. AASHTO's own published figures have shifted slightly
//! between editions (e.g. 2004 vs. 2011 vs. 2018) and by state DOT
//! supplement; a jurisdiction with an adopted design-vehicle table should
//! substitute its own [`DesignVehicle::custom`] values before using this
//! for final design (not just planning-level screening). The minimum
//! turning radii (24 ft / 42 ft / 40 ft / 45 ft) are the widely reproduced,
//! stable "round number" AASHTO figures and are the most reliable part of
//! this table.

use crate::error::{TransportationError, TransportationResult};

/// A design vehicle's rigid-link chain and body envelope, in feet.
#[derive(Debug, Clone, PartialEq)]
pub struct DesignVehicle {
    pub name: &'static str,
    /// Rigid-link lengths from the lead/steering point to the final unit's
    /// trailing axle, feet. `link_lengths.len() >= 1`.
    pub link_lengths: Vec<f64>,
    /// Distance the body extends forward of the lead point (e.g. front
    /// bumper ahead of the front axle), feet.
    pub front_overhang: f64,
    /// Distance the body extends behind the final trailing axle (e.g. rear
    /// bumper behind the trailer axle), feet.
    pub rear_overhang: f64,
    /// Overall body width, feet.
    pub width: f64,
    /// AASHTO Green Book published minimum design (centerline) turning
    /// radius, feet — the tightest path radius the vehicle can steer
    /// through at a crawl speed.
    pub min_turning_radius: f64,
}

impl DesignVehicle {
    /// AASHTO "P" passenger car.
    pub fn passenger_car() -> Self {
        DesignVehicle {
            name: "P (Passenger Car)",
            link_lengths: vec![11.0],
            front_overhang: 3.0,
            rear_overhang: 5.0,
            width: 7.0,
            min_turning_radius: 24.0,
        }
    }

    /// AASHTO "SU-30" single-unit truck.
    pub fn su30() -> Self {
        DesignVehicle {
            name: "SU-30 (Single-Unit Truck)",
            link_lengths: vec![20.0],
            front_overhang: 4.0,
            rear_overhang: 6.0,
            width: 8.5,
            min_turning_radius: 42.0,
        }
    }

    /// AASHTO "WB-40" intermediate semitrailer (tractor-trailer combination).
    pub fn wb40() -> Self {
        DesignVehicle {
            name: "WB-40 (Intermediate Semitrailer)",
            link_lengths: vec![13.0, 27.5],
            front_overhang: 4.0,
            rear_overhang: 2.0,
            width: 8.5,
            min_turning_radius: 40.0,
        }
    }

    /// AASHTO "WB-50" large semitrailer (tractor-trailer combination).
    pub fn wb50() -> Self {
        DesignVehicle {
            name: "WB-50 (Large Semitrailer)",
            link_lengths: vec![20.0, 40.0],
            front_overhang: 3.0,
            rear_overhang: 2.0,
            width: 8.5,
            min_turning_radius: 45.0,
        }
    }

    /// A jurisdiction- or project-specific design vehicle with caller-
    /// supplied dimensions (e.g. a fire apparatus or transit bus not in the
    /// standard AASHTO set).
    pub fn custom(
        name: &'static str,
        link_lengths: Vec<f64>,
        front_overhang: f64,
        rear_overhang: f64,
        width: f64,
        min_turning_radius: f64,
    ) -> Self {
        DesignVehicle {
            name,
            link_lengths,
            front_overhang,
            rear_overhang,
            width,
            min_turning_radius,
        }
    }

    /// Total wheelbase: the sum of every link length, i.e. the distance
    /// from the lead point to the final trailing axle measured along the
    /// vehicle's rigid-link chain (not a straight-line distance once the
    /// vehicle is turning).
    pub fn total_wheelbase(&self) -> f64 {
        self.link_lengths.iter().sum()
    }
}

/// Steady-state ("constant-radius turn") path radius of each hinge point in
/// a vehicle's rigid-link chain, given the lead point's path radius.
///
/// For a vehicle driven at a constant steering angle long enough to reach
/// equilibrium, each successive hinge point traces a smaller concentric
/// circle: `R_i = sqrt(R_{i-1}² − L_i²)`, the standard closed-form
/// off-tracking relationship (e.g. AASHTO Green Book Exhibit 2-3's turning-
/// template geometry, and the steady-state case of the tractrix simulation
/// in [`crate::swept_path`]). Returns `[path_radius, R_1, R_2, ..., R_n]`
/// (length `link_lengths.len() + 1`).
///
/// # Errors
/// - [`TransportationError::NonPositiveValue`] if `path_radius <= 0` or any
///   link length is not strictly positive.
/// - [`TransportationError::CurveTighterThanVehicleMinimum`] if, at any
///   link, the running radius is not greater than that link's length —
///   the vehicle cannot physically complete the turn at this radius (the
///   rigid link would have to be longer than the chord it needs to span).
pub fn steady_state_offtracking_radii(
    link_lengths: &[f64],
    path_radius: f64,
) -> TransportationResult<Vec<f64>> {
    if path_radius <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "path_radius",
            value: path_radius,
        });
    }
    let mut radii = Vec::with_capacity(link_lengths.len() + 1);
    radii.push(path_radius);
    let mut r = path_radius;
    for &l in link_lengths {
        if l <= 0.0 {
            return Err(TransportationError::NonPositiveValue {
                field: "link length",
                value: l,
            });
        }
        if r <= l {
            return Err(TransportationError::CurveTighterThanVehicleMinimum {
                path_radius,
                vehicle_min_radius: l,
                vehicle: "design vehicle link".to_string(),
            });
        }
        r = (r * r - l * l).sqrt();
        radii.push(r);
    }
    Ok(radii)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn single_link_offtracking_matches_pythagorean_closed_form() {
        // R=50, L=20 -> R1 = sqrt(2500-400) = sqrt(2100).
        let radii = steady_state_offtracking_radii(&[20.0], 50.0).unwrap();
        assert_eq!(radii.len(), 2);
        assert_relative_eq!(radii[0], 50.0, epsilon = 1e-9);
        assert_relative_eq!(radii[1], 2100f64.sqrt(), epsilon = 1e-9);
    }

    #[test]
    fn two_link_chain_compounds_offtracking() {
        let radii = steady_state_offtracking_radii(&[13.0, 27.5], 100.0).unwrap();
        assert_eq!(radii.len(), 3);
        let r1 = (100f64 * 100.0 - 13.0 * 13.0).sqrt();
        let r2 = (r1 * r1 - 27.5 * 27.5).sqrt();
        assert_relative_eq!(radii[1], r1, epsilon = 1e-9);
        assert_relative_eq!(radii[2], r2, epsilon = 1e-9);
        // Off-tracking accumulates: each successive radius is smaller.
        assert!(radii[2] < radii[1]);
        assert!(radii[1] < radii[0]);
    }

    #[test]
    fn rejects_a_turn_tighter_than_the_link_can_span() {
        // Wheelbase longer than the path radius -> physically impossible.
        assert!(matches!(
            steady_state_offtracking_radii(&[60.0], 50.0),
            Err(TransportationError::CurveTighterThanVehicleMinimum { .. })
        ));
    }

    #[test]
    fn rejects_non_positive_path_radius() {
        assert!(matches!(
            steady_state_offtracking_radii(&[20.0], 0.0),
            Err(TransportationError::NonPositiveValue { .. })
        ));
    }

    #[test]
    fn standard_vehicles_have_at_least_one_link_and_positive_dimensions() {
        for v in [
            DesignVehicle::passenger_car(),
            DesignVehicle::su30(),
            DesignVehicle::wb40(),
            DesignVehicle::wb50(),
        ] {
            assert!(!v.link_lengths.is_empty());
            assert!(v.link_lengths.iter().all(|&l| l > 0.0));
            assert!(v.width > 0.0);
            assert!(v.min_turning_radius > 0.0);
            assert!(v.total_wheelbase() > 0.0);
        }
    }
}
