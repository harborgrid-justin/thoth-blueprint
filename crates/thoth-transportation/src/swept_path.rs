//! Vehicle swept-path analysis (item 19, AutoTURN-style): simulate a design
//! vehicle's tractrix-following path along a driver's steering path (the
//! centerline/curve a driver aims the front of the vehicle along),
//! producing the trailing-axle trajectories and an approximate swept
//! envelope polygon.
//!
//! ## Algorithm: discrete tractrix pursuit
//!
//! A vehicle is a chain of rigid links (see [`crate::design_vehicle`]). The
//! physical constraint at every hinge point is the classical tractrix/
//! "dragged point" constraint: a rigid link of fixed length `L` connects a
//! leading point to a trailing point, and the trailing point has no
//! sideways slip (a nonholonomic constraint — exactly a bicycle-model rear
//! wheel), so it always moves along the line from itself toward the
//! leading point.
//!
//! This is simulated by the standard discrete **pursuit method**: advance
//! the lead point one step along its prescribed path, then correct every
//! trailing hinge in the chain by pulling it, in order, toward its new
//! leading point until it is again exactly `L` away:
//!
//! ```text
//! hinge[k+1]_new = hinge[k]_new − L_k · normalize(hinge[k]_new − hinge[k+1]_old)
//! ```
//!
//! This is a first-order (Euler-style) integrator for the true tractrix
//! ODE — it exactly enforces the rigid-link length constraint at every
//! step, and its heading converges to the exact nonholonomic solution as
//! the step size (the spacing between consecutive `lead_path` points)
//! shrinks relative to the shortest link length. Per-step error is
//! `O(ds²/L)`; **for practical accuracy, sample `lead_path` so consecutive
//! points are no more than `L_min / 20` apart**, where `L_min` is the
//! shortest link length in the vehicle's chain. The unit tests below
//! validate this against the exact closed-form steady-state off-tracking
//! solution (see [`crate::design_vehicle::steady_state_offtracking_radii`])
//! for a constant-radius circular path, which is the standard published
//! reference case (AASHTO Green Book Exhibit 2-3 / FHWA and AutoTURN
//! turning-template geometry all use this same steady-state closed form as
//! ground truth).
//!
//! **Simplifying assumptions** (documented per the deliverable's honesty
//! requirement):
//! - The vehicle is assumed to start at rest, straight, aligned with the
//!   initial tangent of `lead_path` (hinges initialized directly behind the
//!   lead point along that tangent) — a real vehicle's actual starting
//!   articulation may differ.
//! - The swept envelope tracks only the front unit's front corners and the
//!   final unit's rear corners at one shared body width — it does not model
//!   per-unit width differences (e.g. a wider trailer than tractor) or
//!   intermediate units' corners, and assumes a single, consistent turn
//!   direction along the whole path (an S-curve reversal is not
//!   distinguished per-segment).

use thoth_spatial::{cross, distance, dot, normalize, scale, subtract, Point};

use crate::design_vehicle::DesignVehicle;
use crate::error::{TransportationError, TransportationResult};

/// Full swept-path simulation output.
#[derive(Debug, Clone, PartialEq)]
pub struct SweptPathResult {
    /// One trajectory per hinge point, in chain order (`[0]` is the lead
    /// point, matching `lead_path`; the last is the final unit's trailing
    /// axle).
    pub hinge_trajectories: Vec<Vec<Point>>,
    /// The outer (wide) side of the swept corridor, one point per
    /// simulation step.
    pub outer_boundary: Vec<Point>,
    /// The inner (cut-in) side of the swept corridor, one point per
    /// simulation step.
    pub inner_boundary: Vec<Point>,
    /// Closed polygon ring approximating the total swept envelope:
    /// `outer_boundary` followed by `inner_boundary` reversed (the closing
    /// edge back to the start is implied, matching `thoth_spatial::Polygon`
    /// convention).
    pub envelope: Vec<Point>,
}

/// Circumradius of the circular arc through three points, or `None` if they
/// are (near-)collinear (a straight segment — no local curvature
/// constraint to check).
fn local_turn_radius(p0: Point, p1: Point, p2: Point) -> Option<f64> {
    let a = distance(p1, p2);
    let b = distance(p0, p2);
    let c = distance(p0, p1);
    let area2 = cross(subtract(p1, p0), subtract(p2, p0)).abs(); // = 2 * triangle area
    if area2 < 1e-9 {
        return None;
    }
    Some((a * b * c) / (2.0 * area2))
}

/// Simulates `vehicle`'s swept path following `lead_path` (the driver's
/// steering path — the trajectory of the vehicle's lead/front-axle
/// reference point, e.g. sampled from a `thoth_civil` alignment centerline
/// or curve via `centerline_points`/`offset_alignment_path`).
///
/// # Errors
/// - [`TransportationError::DegeneratePath`] if fewer than 2 distinct
///   points remain in `lead_path` after removing consecutive duplicates.
/// - [`TransportationError::CurveTighterThanVehicleMinimum`] if any
///   3-point local radius along `lead_path` is tighter than
///   `vehicle.min_turning_radius` — no steering angle lets this vehicle
///   physically follow that path.
pub fn simulate_swept_path(
    vehicle: &DesignVehicle,
    lead_path: &[Point],
) -> TransportationResult<SweptPathResult> {
    let mut path: Vec<Point> = Vec::with_capacity(lead_path.len());
    for &p in lead_path {
        if path.last().is_none_or(|&last| distance(last, p) > 1e-9) {
            path.push(p);
        }
    }
    if path.len() < 2 {
        return Err(TransportationError::DegeneratePath { count: path.len() });
    }

    for w in path.windows(3) {
        if let Some(r) = local_turn_radius(w[0], w[1], w[2]) {
            if r < vehicle.min_turning_radius {
                return Err(TransportationError::CurveTighterThanVehicleMinimum {
                    path_radius: r,
                    vehicle_min_radius: vehicle.min_turning_radius,
                    vehicle: vehicle.name.to_string(),
                });
            }
        }
    }

    let links = &vehicle.link_lengths;
    let n_hinges = links.len() + 1;

    // Initialize hinges at rest, straight, behind the lead point.
    let initial_dir = normalize(subtract(path[1], path[0]));
    let mut hinges: Vec<Point> = Vec::with_capacity(n_hinges);
    hinges.push(path[0]);
    let mut cursor = path[0];
    for &l in links {
        cursor = subtract(cursor, scale(initial_dir, l));
        hinges.push(cursor);
    }

    let mut trajectories: Vec<Vec<Point>> = hinges.iter().map(|&p| vec![p]).collect();

    for &lead in &path[1..] {
        hinges[0] = lead;
        trajectories[0].push(lead);
        let mut front = lead;
        for (k, &l) in links.iter().enumerate() {
            let old = hinges[k + 1];
            let d = subtract(front, old);
            let dist = (d.x * d.x + d.y * d.y).sqrt();
            let new_pos = if dist < 1e-12 {
                old
            } else {
                subtract(front, scale(normalize(d), l))
            };
            hinges[k + 1] = new_pos;
            trajectories[k + 1].push(new_pos);
            front = new_pos;
        }
    }

    // Direction of travel of the lead unit at every step.
    let mut front_dirs: Vec<Point> = Vec::with_capacity(path.len());
    front_dirs.push(initial_dir);
    for i in 1..path.len() {
        front_dirs.push(normalize(subtract(path[i], path[i - 1])));
    }

    // Net signed turning angle over the whole path decides which side is
    // "outer" for the entire maneuver (see module docs: single-direction
    // simplifying assumption).
    let mut cumulative_turn = 0.0;
    for w in front_dirs.windows(2) {
        cumulative_turn += cross(w[0], w[1]).atan2(dot(w[0], w[1]));
    }
    let turning_left = cumulative_turn > 0.0;

    let last_two = (n_hinges - 2, n_hinges - 1);
    let half_width = vehicle.width / 2.0;

    let mut outer_boundary = Vec::with_capacity(path.len());
    let mut inner_boundary = Vec::with_capacity(path.len());

    for i in 0..path.len() {
        let front_center = front_position(path[i], front_dirs[i], vehicle.front_overhang);
        let front_left_normal = Point::new(-front_dirs[i].y, front_dirs[i].x);

        let hinge_a = trajectories[last_two.0][i];
        let hinge_b = trajectories[last_two.1][i];
        let rear_dir = {
            let d = subtract(hinge_a, hinge_b);
            let len = (d.x * d.x + d.y * d.y).sqrt();
            if len < 1e-12 {
                front_dirs[i]
            } else {
                normalize(d)
            }
        };
        let rear_center = Point::new(
            hinge_b.x - rear_dir.x * vehicle.rear_overhang,
            hinge_b.y - rear_dir.y * vehicle.rear_overhang,
        );
        let rear_left_normal = Point::new(-rear_dir.y, rear_dir.x);

        let front_left = offset(front_center, front_left_normal, half_width);
        let front_right = offset(front_center, front_left_normal, -half_width);
        let rear_left = offset(rear_center, rear_left_normal, half_width);
        let rear_right = offset(rear_center, rear_left_normal, -half_width);

        if turning_left {
            outer_boundary.push(front_right);
            inner_boundary.push(rear_left);
        } else {
            outer_boundary.push(front_left);
            inner_boundary.push(rear_right);
        }
    }

    let mut envelope = outer_boundary.clone();
    envelope.extend(inner_boundary.iter().rev());

    Ok(SweptPathResult {
        hinge_trajectories: trajectories,
        outer_boundary,
        inner_boundary,
        envelope,
    })
}

fn front_position(lead: Point, dir: Point, overhang: f64) -> Point {
    Point::new(lead.x + dir.x * overhang, lead.y + dir.y * overhang)
}

fn offset(p: Point, normal: Point, amount: f64) -> Point {
    Point::new(p.x + normal.x * amount, p.y + normal.y * amount)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use std::f64::consts::PI;

    /// Densely sampled circular arc, used as the lead path for steady-state
    /// off-tracking convergence tests.
    fn circular_arc(center: Point, radius: f64, sweep_rad: f64, samples: u32) -> Vec<Point> {
        (0..=samples)
            .map(|i| {
                let angle = sweep_rad * (i as f64) / (samples as f64);
                Point::new(center.x + radius * angle.cos(), center.y + radius * angle.sin())
            })
            .collect()
    }

    #[test]
    fn single_unit_vehicle_converges_to_the_closed_form_steady_state_offtracking() {
        // SU-30-like single-link vehicle, wheelbase 20 ft, on a constant
        // R=60 ft path swept through 270 degrees (long enough to reach
        // steady state well before the end).
        let vehicle = DesignVehicle::su30();
        let center = Point::new(0.0, 0.0);
        let radius = 60.0;
        let sweep = 1.5 * PI;
        let path = circular_arc(center, radius, sweep, 3000);

        let result = simulate_swept_path(&vehicle, &path).unwrap();
        let trailing = *result.hinge_trajectories.last().unwrap().last().unwrap();
        let trailing_radius = distance(center, trailing);

        let expected = (radius * radius - 20.0 * 20.0).sqrt(); // = sqrt(3200) ~= 56.5685
        assert_relative_eq!(trailing_radius, expected, epsilon = 0.05);
    }

    #[test]
    fn two_link_articulated_vehicle_converges_to_the_chained_closed_form() {
        // WB-40-like two-link vehicle: tractor 13 ft, trailer 27.5 ft.
        let vehicle = DesignVehicle::wb40();
        let center = Point::new(50.0, -20.0);
        let radius = 120.0;
        let sweep = 1.5 * PI;
        let path = circular_arc(center, radius, sweep, 4000);

        let result = simulate_swept_path(&vehicle, &path).unwrap();
        let trailing = *result.hinge_trajectories.last().unwrap().last().unwrap();
        let trailing_radius = distance(center, trailing);

        let r1 = (radius * radius - 13.0 * 13.0).sqrt();
        let expected = (r1 * r1 - 27.5 * 27.5).sqrt();
        assert_relative_eq!(trailing_radius, expected, epsilon = 0.1);
    }

    #[test]
    fn finer_step_size_converges_more_tightly_than_coarse_step_size() {
        let vehicle = DesignVehicle::su30();
        let center = Point::new(0.0, 0.0);
        let radius: f64 = 60.0;
        let sweep = 1.5 * PI;
        let expected = (radius * radius - 20.0 * 20.0).sqrt();

        let coarse = circular_arc(center, radius, sweep, 40);
        let fine = circular_arc(center, radius, sweep, 3000);

        let coarse_err = {
            let r = simulate_swept_path(&vehicle, &coarse).unwrap();
            let t = *r.hinge_trajectories.last().unwrap().last().unwrap();
            (distance(center, t) - expected).abs()
        };
        let fine_err = {
            let r = simulate_swept_path(&vehicle, &fine).unwrap();
            let t = *r.hinge_trajectories.last().unwrap().last().unwrap();
            (distance(center, t) - expected).abs()
        };
        assert!(fine_err < coarse_err);
    }

    #[test]
    fn rejects_a_lead_path_tighter_than_the_vehicles_minimum_turning_radius() {
        let vehicle = DesignVehicle::wb50(); // min_turning_radius = 45 ft
        let path = circular_arc(Point::new(0.0, 0.0), 20.0, PI, 50); // R=20 ft, far too tight
        assert!(matches!(
            simulate_swept_path(&vehicle, &path),
            Err(TransportationError::CurveTighterThanVehicleMinimum { .. })
        ));
    }

    #[test]
    fn rejects_a_degenerate_path() {
        let vehicle = DesignVehicle::passenger_car();
        let path = vec![Point::new(1.0, 1.0)];
        assert!(matches!(
            simulate_swept_path(&vehicle, &path),
            Err(TransportationError::DegeneratePath { count: 1 })
        ));
    }

    #[test]
    fn envelope_forms_a_closed_ring_with_outer_and_inner_points() {
        let vehicle = DesignVehicle::passenger_car();
        let path = circular_arc(Point::new(0.0, 0.0), 80.0, PI, 200);
        let result = simulate_swept_path(&vehicle, &path).unwrap();
        assert_eq!(result.envelope.len(), result.outer_boundary.len() + result.inner_boundary.len());
        assert!(thoth_spatial::is_valid_polygon(&result.envelope));
    }
}
