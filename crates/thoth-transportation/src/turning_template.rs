//! Intersection turning-radius templates (item 18): static AASHTO design-
//! vehicle turning geometry — the minimum turning radius, steady-state
//! off-tracking, and required pavement width for a given curb-return
//! radius — plus the outer/inner arc geometry a plan sheet would show.
//!
//! **Not** a full swept-path simulation: this is the closed-form,
//! steady-state ("has been turning long enough to reach equilibrium")
//! geometry AutoTURN/Civil3D call a "turning template" — two concentric
//! arcs. A vehicle actually entering and exiting the turn (transient
//! off-tracking as it steers in and out) is [`crate::swept_path`] (item 19).

use thoth_spatial::Point;

use crate::design_vehicle::{steady_state_offtracking_radii, DesignVehicle};
use crate::error::{TransportationError, TransportationResult};

/// Steady-state turning-radius template data for a design vehicle
/// negotiating a constant-radius turn.
#[derive(Debug, Clone, PartialEq)]
pub struct TurningTemplate {
    pub vehicle_name: String,
    /// The path radius of the vehicle's lead (steering) point, feet — this
    /// is the radius a designer selects (e.g. via a curb-return radius).
    pub path_radius: f64,
    /// Steady-state radius of every hinge point in the chain, in order from
    /// the lead point to the final trailing axle.
    pub link_radii: Vec<f64>,
    /// `path_radius − link_radii.last()`: the total steady-state
    /// off-tracking, feet.
    pub offtracking: f64,
    /// A simplified minimum swept-path corridor width for this radius:
    /// off-tracking plus the vehicle's body width (front overhang swings
    /// slightly outside the lead-point radius and the body has width on
    /// both the outer and inner sides; this sums those as one conservative
    /// figure rather than resolving the exact outer/inner envelope — see
    /// [`generate_turning_template_geometry`] for that).
    pub required_pavement_width: f64,
}

/// Computes the steady-state turning template for `vehicle` on a curve of
/// `path_radius` (feet, measured at the vehicle's lead/steering point).
///
/// # Errors
/// - [`TransportationError::CurveTighterThanVehicleMinimum`] if
///   `path_radius` is less than `vehicle.min_turning_radius` (the AASHTO
///   published minimum for this vehicle), or if any link in the chain
///   cannot physically span the resulting radius (see
///   [`steady_state_offtracking_radii`]).
pub fn compute_turning_template(
    vehicle: &DesignVehicle,
    path_radius: f64,
) -> TransportationResult<TurningTemplate> {
    if path_radius < vehicle.min_turning_radius {
        return Err(TransportationError::CurveTighterThanVehicleMinimum {
            path_radius,
            vehicle_min_radius: vehicle.min_turning_radius,
            vehicle: vehicle.name.to_string(),
        });
    }
    let link_radii = steady_state_offtracking_radii(&vehicle.link_lengths, path_radius)?;
    let trailing_radius = *link_radii.last().expect("at least the lead radius is always present");
    let offtracking = path_radius - trailing_radius;
    Ok(TurningTemplate {
        vehicle_name: vehicle.name.to_string(),
        path_radius,
        link_radii,
        offtracking,
        required_pavement_width: offtracking + vehicle.width,
    })
}

/// The outer (front-outside) and inner (trailing-unit-inside) arc
/// boundaries of a vehicle's steady-state turning template, as sampled
/// polylines centered at `center` and swept from `start_angle_rad` through
/// `sweep_rad` (signed; matches `thoth_civil::alignment::AlignmentCurve`'s
/// `start_angle`/`sweep` convention so callers can build one directly from
/// a resolved alignment curve).
#[derive(Debug, Clone, PartialEq)]
pub struct TurningTemplateGeometry {
    /// Path of the front-outside corner (lead-point radius plus half the
    /// vehicle width, swinging wide on the outside of the turn).
    pub outer_arc: Vec<Point>,
    /// Path of the trailing-unit inside corner (trailing radius minus half
    /// the vehicle width — the point that cuts in tightest on the inside).
    pub inner_arc: Vec<Point>,
}

/// Generates the sampled outer/inner arc geometry for `vehicle` turning
/// through a curve centered at `center`, from `start_angle_rad` through a
/// signed `sweep_rad`, at lead-point `path_radius`, in `samples` segments.
///
/// # Errors
/// Propagates [`compute_turning_template`]'s errors, plus
/// [`TransportationError::NonPositiveValue`] if `samples == 0` or the
/// resulting inner radius would be non-positive (the vehicle is wider than
/// twice its own trailing off-tracking radius at this turn — an
/// unrealistic combination this template cannot represent).
pub fn generate_turning_template_geometry(
    vehicle: &DesignVehicle,
    center: Point,
    start_angle_rad: f64,
    sweep_rad: f64,
    path_radius: f64,
    samples: u32,
) -> TransportationResult<TurningTemplateGeometry> {
    let template = compute_turning_template(vehicle, path_radius)?;
    if samples == 0 {
        return Err(TransportationError::NonPositiveValue {
            field: "samples",
            value: 0.0,
        });
    }
    let trailing_radius = *template
        .link_radii
        .last()
        .expect("at least the lead radius is always present");
    let outer_radius = path_radius + vehicle.width / 2.0;
    let inner_radius = trailing_radius - vehicle.width / 2.0;
    if inner_radius <= 0.0 {
        return Err(TransportationError::NonPositiveValue {
            field: "inner_radius (trailing radius minus half vehicle width)",
            value: inner_radius,
        });
    }

    let sample_arc = |radius: f64| -> Vec<Point> {
        (0..=samples)
            .map(|i| {
                let angle = start_angle_rad + sweep_rad * (i as f64) / (samples as f64);
                Point::new(center.x + radius * angle.cos(), center.y + radius * angle.sin())
            })
            .collect()
    };

    Ok(TurningTemplateGeometry {
        outer_arc: sample_arc(outer_radius),
        inner_arc: sample_arc(inner_radius),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use std::f64::consts::FRAC_PI_2;

    #[test]
    fn su30_template_matches_offtracking_closed_form() {
        let v = DesignVehicle::su30();
        let t = compute_turning_template(&v, 60.0).unwrap();
        let expected_trailing = (60f64 * 60.0 - 20.0 * 20.0).sqrt();
        assert_relative_eq!(*t.link_radii.last().unwrap(), expected_trailing, epsilon = 1e-9);
        assert_relative_eq!(t.offtracking, 60.0 - expected_trailing, epsilon = 1e-9);
    }

    #[test]
    fn wb50_template_reports_larger_offtracking_than_su30_at_same_radius() {
        let su30 = compute_turning_template(&DesignVehicle::su30(), 100.0).unwrap();
        let wb50 = compute_turning_template(&DesignVehicle::wb50(), 100.0).unwrap();
        assert!(wb50.offtracking > su30.offtracking);
    }

    #[test]
    fn rejects_path_radius_tighter_than_the_vehicles_minimum() {
        let v = DesignVehicle::wb50();
        let result = compute_turning_template(&v, 30.0);
        assert!(matches!(
            result,
            Err(TransportationError::CurveTighterThanVehicleMinimum { .. })
        ));
    }

    #[test]
    fn geometry_arcs_are_concentric_and_start_end_at_the_swept_angles() {
        let v = DesignVehicle::su30();
        let center = Point::new(100.0, 200.0);
        let geometry =
            generate_turning_template_geometry(&v, center, 0.0, FRAC_PI_2, 60.0, 8).unwrap();
        assert_eq!(geometry.outer_arc.len(), 9);
        assert_eq!(geometry.inner_arc.len(), 9);
        // Every outer-arc point is equidistant from center.
        let r0 = thoth_spatial::distance(center, geometry.outer_arc[0]);
        for p in &geometry.outer_arc {
            assert_relative_eq!(thoth_spatial::distance(center, *p), r0, epsilon = 1e-6);
        }
        // Inner radius must be strictly less than outer radius.
        let inner_r = thoth_spatial::distance(center, geometry.inner_arc[0]);
        assert!(inner_r < r0);
    }
}
